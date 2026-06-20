import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Package, Zap } from "lucide-react";
import { gradientFromName, letterFromName } from "@/lib/product-visual";
import type { ProductFamily } from "@/lib/family-catalog-data";

interface FamilyCardProps {
  family: ProductFamily;
  onSelect?: (productSlug: string) => void;
}

export function FamilyCard({ family, onSelect }: FamilyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const productCount = family.products.length;
  const offerCount = family.products.reduce((sum, p) => sum + p.product_offers.length, 0);
  const isLowStock = family.totalStock < 20 && family.totalStock > 0;
  const isOutOfStock = family.totalStock === 0;

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-surface/30 hover:border-primary/30 transition-all duration-300 glass">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-4 p-4 hover:bg-surface/50 transition-colors"
      >
        {/* Image */}
        <div
          className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-border/30 flex items-center justify-center"
          style={{ background: gradientFromName(family.family) }}
        >
          {family.image ? (
            <img
              src={family.image}
              alt={family.family}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display text-4xl text-foreground/60">
              {letterFromName(family.family)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-start min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-display text-lg font-bold text-foreground truncate">
              {family.family}
            </h3>
            {isLowStock && (
              <span className="flex items-center gap-1 bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded-full border border-red-500/30 shrink-0">
                <Zap className="w-3 h-3" />
                محدود
              </span>
            )}
            {isOutOfStock && (
              <span className="text-xs px-2 py-1 rounded-full border border-muted-foreground/30 text-muted-foreground bg-surface shrink-0">
                نفد
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {productCount} منتج
            </span>
            <span>{offerCount} عرض</span>
            <span className="text-emerald-400 font-semibold">
              {family.minPrice === family.maxPrice
                ? `${family.minPrice?.toLocaleString()} DA`
                : `${family.minPrice?.toLocaleString()} - ${family.maxPrice?.toLocaleString()} DA`}
            </span>
          </div>
        </div>

        {/* Expand icon */}
        <div className="shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/20 bg-background/40 p-4 space-y-3">
          {family.products.map((product) => (
            <Link
              key={product.id}
              to="/product/$slug"
              params={{ slug: product.slug }}
              onClick={() => onSelect?.(product.slug)}
              className="block p-3 rounded-lg border border-border/30 bg-surface/50 hover:border-primary/50 hover:bg-surface transition-all duration-300 group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {product.name}
                  </h4>
                  {product.short_description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {product.short_description}
                    </p>
                  )}
                </div>
                {product.rating_count && product.rating_count > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-semibold text-amber-400">
                      {Number(product.rating ?? 0).toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({product.rating_count})
                    </span>
                  </div>
                )}
              </div>

              {/* Offers preview */}
              <div className="flex flex-wrap gap-2">
                {product.product_offers.slice(0, 3).map((offer) => (
                  <div
                    key={offer.id}
                    className="text-xs px-2 py-1 rounded border border-border/40 bg-surface/60 text-muted-foreground"
                  >
                    <span className="font-mono">
                      {offer.duration || "—"}
                    </span>
                    {offer.price_dzd && (
                      <span className="text-emerald-400 font-semibold ml-2">
                        {offer.price_dzd.toLocaleString()} DA
                      </span>
                    )}
                  </div>
                ))}
                {product.product_offers.length > 3 && (
                  <div className="text-xs px-2 py-1 rounded border border-border/40 bg-surface/60 text-muted-foreground">
                    +{product.product_offers.length - 3} أكثر
                  </div>
                )}
              </div>

              {/* Stock indicator */}
              <div className="mt-2 text-xs text-muted-foreground">
                المخزون: {product.product_offers.reduce((s, o) => s + (o.stock ?? 0), 0)}
              </div>
            </Link>
          ))}

          {/* View all button */}
          <Link
            to="/shop"
            search={{ q: family.family }}
            className="block w-full py-2 text-center text-sm font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
          >
            عرض جميع العروض
          </Link>
        </div>
      )}
    </div>
  );
}
