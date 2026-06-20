import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CatalogOffer, CatalogProduct, lowestDzd } from "./catalog-data";

export type ProductFamily = {
  family: string;
  products: CatalogProduct[];
  minPrice: number | null;
  maxPrice: number | null;
  totalStock: number;
  image: string | null;
};

function sortOffers(offers: CatalogOffer[] = []) {
  return [...offers].sort((a, b) => {
    const priceA = Number(a.price_dzd ?? Number.MAX_SAFE_INTEGER);
    const priceB = Number(b.price_dzd ?? Number.MAX_SAFE_INTEGER);
    return a.sort_order - b.sort_order || priceA - priceB;
  });
}

/**
 * Fetch all products grouped by family for the storefront
 */
export function useFamilyCatalog() {
  return useQuery({
    queryKey: ["catalog", "families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, short_description, description, main_image, featured, sales_count, rating, rating_count, created_at, category_id, family, tags, account_type, offer_type, categories(name), product_offers(id, name, original_title, duration, warranty, delivery_method, price_dzd, price_usd, supplier, product_url, account_type, offer_type, stock, sort_order, active)")
        .eq("visible", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Normalize products
      const normalizedProducts = (data ?? []).map((product: any) => {
        const account_type = product.account_type || (product.tags?.includes("Private") ? "Private" : product.tags?.includes("Shared") ? "Shared" : product.tags?.includes("Family") ? "Family" : null);
        const offer_type = product.offer_type || (product.tags?.includes("Premium") ? "Premium" : product.tags?.includes("Pro") ? "Pro" : product.tags?.includes("Plus") ? "Plus" : product.tags?.includes("Max") ? "Max" : product.tags?.includes("Basic") ? "Basic" : product.tags?.includes("Standard") ? "Standard" : product.tags?.includes("Free") ? "Free" : product.tags?.includes("Trial") ? "Trial" : product.tags?.includes("Lite") ? "Lite" : null);
        return {
          ...product,
          account_type,
          offer_type,
          product_offers: sortOffers((product.product_offers ?? []).filter((o: any) => o.active !== false)),
        } as CatalogProduct;
      });

      // Group by family
      const familyMap = new Map<string, CatalogProduct[]>();
      for (const product of normalizedProducts) {
        const familyName = product.family || "Other";
        if (!familyMap.has(familyName)) {
          familyMap.set(familyName, []);
        }
        familyMap.get(familyName)!.push(product);
      }

      // Convert to ProductFamily array with metadata
      const families: ProductFamily[] = Array.from(familyMap.entries()).map(([familyName, products]) => {
        const allOffers = products.flatMap(p => p.product_offers);
        const prices = allOffers
          .map(o => Number(o.price_dzd ?? 0))
          .filter(p => p > 0);
        const minPrice = prices.length ? Math.min(...prices) : null;
        const maxPrice = prices.length ? Math.max(...prices) : null;
        const totalStock = allOffers.reduce((sum, o) => sum + (o.stock ?? 0), 0);
        const image = products[0]?.main_image || null;

        return {
          family: familyName,
          products: products.sort((a, b) => (b.sales_count ?? 0) - (a.sales_count ?? 0)),
          minPrice,
          maxPrice,
          totalStock,
          image,
        };
      });

      return families.sort((a, b) => {
        // Sort by total stock and sales
        const aTotal = a.products.reduce((s, p) => s + (p.sales_count ?? 0), 0);
        const bTotal = b.products.reduce((s, p) => s + (p.sales_count ?? 0), 0);
        return bTotal - aTotal;
      });
    },
  });
}

/**
 * Fetch a single family with all its products and offers
 */
export function useFamily(familyName: string) {
  return useQuery({
    queryKey: ["catalog", "family", familyName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, short_description, description, main_image, featured, sales_count, rating, rating_count, created_at, category_id, family, tags, account_type, offer_type, categories(name), product_offers(id, name, original_title, duration, warranty, delivery_method, price_dzd, price_usd, supplier, product_url, account_type, offer_type, stock, sort_order, active)")
        .eq("family", familyName)
        .eq("visible", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizedProducts = (data ?? []).map((product: any) => {
        const account_type = product.account_type || (product.tags?.includes("Private") ? "Private" : product.tags?.includes("Shared") ? "Shared" : product.tags?.includes("Family") ? "Family" : null);
        const offer_type = product.offer_type || (product.tags?.includes("Premium") ? "Premium" : product.tags?.includes("Pro") ? "Pro" : product.tags?.includes("Plus") ? "Plus" : product.tags?.includes("Max") ? "Max" : product.tags?.includes("Basic") ? "Basic" : product.tags?.includes("Standard") ? "Standard" : product.tags?.includes("Free") ? "Free" : product.tags?.includes("Trial") ? "Trial" : product.tags?.includes("Lite") ? "Lite" : null);
        return {
          ...product,
          account_type,
          offer_type,
          product_offers: sortOffers((product.product_offers ?? []).filter((o: any) => o.active !== false)),
        } as CatalogProduct;
      });

      if (normalizedProducts.length === 0) return null;

      const allOffers = normalizedProducts.flatMap(p => p.product_offers);
      const prices = allOffers
        .map(o => Number(o.price_dzd ?? 0))
        .filter(p => p > 0);
      const minPrice = prices.length ? Math.min(...prices) : null;
      const maxPrice = prices.length ? Math.max(...prices) : null;
      const totalStock = allOffers.reduce((sum, o) => sum + (o.stock ?? 0), 0);

      return {
        family: familyName,
        products: normalizedProducts,
        minPrice,
        maxPrice,
        totalStock,
        image: normalizedProducts[0]?.main_image || null,
      } as ProductFamily;
    },
    enabled: !!familyName,
  });
}
