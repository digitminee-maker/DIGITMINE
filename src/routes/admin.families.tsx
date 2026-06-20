import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { useFamilyCatalog } from "@/lib/family-catalog-data";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Search, Edit2, Trash2, Copy, Plus, Eye, EyeOff } from "lucide-react";
import { gradientFromName, letterFromName } from "@/lib/product-visual";

export const Route = createFileRoute("/admin/families")({
  component: FamiliesPage,
});

function FamiliesPage() {
  const { data: families = [], isLoading } = useFamilyCatalog();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [editingOffer, setEditingOffer] = useState<any>(null);

  const filteredFamilies = useMemo(() => {
    if (!searchQuery.trim()) return families;
    const needle = searchQuery.toLowerCase();
    return families.filter(f =>
      f.family.toLowerCase().includes(needle) ||
      f.products.some(p => p.name.toLowerCase().includes(needle))
    );
  }, [families, searchQuery]);

  const toggleFamily = (familyName: string) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(familyName)) next.delete(familyName);
      else next.add(familyName);
      return next;
    });
  };

  const handleDeleteOffer = async (offerId: string, offerName: string) => {
    if (!confirm(`حذف العرض "${offerName}"؟`)) return;
    try {
      const { error } = await supabase
        .from("product_offers")
        .delete()
        .eq("id", offerId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("تم حذف العرض");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleOfferVisibility = async (offerId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("product_offers")
        .update({ active: !currentActive })
        .eq("id", offerId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(currentActive ? "تم إخفاء العرض" : "تم إظهار العرض");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveOffer = async (offer: any) => {
    try {
      const { error } = await supabase
        .from("product_offers")
        .update({
          name: offer.name,
          duration: offer.duration,
          price_dzd: offer.price_dzd,
          price_usd: offer.price_usd,
          stock: offer.stock,
          supplier: offer.supplier,
          product_url: offer.product_url,
          delivery_method: offer.delivery_method,
          warranty: offer.warranty,
          account_type: offer.account_type,
          offer_type: offer.offer_type,
        })
        .eq("id", offer.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["catalog"] });
      setEditingOffer(null);
      toast.success("تم حفظ التعديلات");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AdminTopbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2">إدارة العائلات والعروض</h1>
          <p className="text-muted-foreground">عرض وتعديل جميع عائلات المنتجات والعروض المتاحة</p>
        </div>

        {/* Search bar */}
        <div className="mb-6 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث عن عائلة أو منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg focus:border-primary outline-none"
            />
          </div>
          <Link
            to="/admin/products/$id"
            params={{ id: "new" }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-mono-label flex items-center gap-2 hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            منتج جديد
          </Link>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-24 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground font-mono text-xs">جاري التحميل...</p>
          </div>
        )}

        {/* Families list */}
        {!isLoading && filteredFamilies.length > 0 && (
          <div className="space-y-4">
            {filteredFamilies.map((family) => {
              const isOpen = expandedFamilies.has(family.family);
              return (
                <div key={family.family} className="border border-border rounded-lg overflow-hidden">
                  {/* Family header */}
                  <button
                    onClick={() => toggleFamily(family.family)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-surface hover:bg-surface/80 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className="w-16 h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-border/30"
                        style={{ background: gradientFromName(family.family) }}
                      >
                        {family.image ? (
                          <img src={family.image} alt={family.family} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-display text-3xl text-foreground/60">
                            {letterFromName(family.family)}
                          </span>
                        )}
                      </div>
                      <div className="text-start min-w-0 flex-1">
                        <h3 className="font-display text-lg font-bold">{family.family}</h3>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-mono mt-1">
                          <span>{family.products.length} منتج</span>
                          <span>{family.products.reduce((s, p) => s + p.product_offers.length, 0)} عرض</span>
                          <span className="text-emerald-400">
                            {family.minPrice === family.maxPrice
                              ? `${family.minPrice?.toLocaleString()} DA`
                              : `${family.minPrice?.toLocaleString()} - ${family.maxPrice?.toLocaleString()} DA`}
                          </span>
                          <span>المخزون: {family.totalStock}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* Family content - Products and Offers */}
                  {isOpen && (
                    <div className="bg-background/40 p-6 space-y-6 border-t border-border">
                      {family.products.map((product) => (
                        <div key={product.id} className="border border-border/40 rounded-lg p-4 bg-surface/30">
                          {/* Product header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-display text-lg font-semibold text-foreground">
                                {product.name}
                              </h4>
                              {product.short_description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {product.short_description}
                                </p>
                              )}
                            </div>
                            <Link
                              to="/admin/products/$id"
                              params={{ id: product.id }}
                              className="ml-4 px-3 py-2 border border-primary/30 text-primary hover:bg-primary/10 rounded font-mono-label text-xs flex items-center gap-1 shrink-0"
                            >
                              <Edit2 className="w-3 h-3" />
                              تعديل
                            </Link>
                          </div>

                          {/* Offers table */}
                          <div className="space-y-2">
                            {product.product_offers.map((offer) => (
                              <div
                                key={offer.id}
                                className={`border border-border/30 rounded p-3 bg-background flex items-center justify-between gap-3 ${
                                  offer.active === false ? "opacity-50" : ""
                                }`}
                              >
                                {editingOffer?.id === offer.id ? (
                                  // Edit mode
                                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 items-center">
                                    <input
                                      type="text"
                                      placeholder="المدة"
                                      value={editingOffer.duration || ""}
                                      onChange={(e) =>
                                        setEditingOffer({ ...editingOffer, duration: e.target.value })
                                      }
                                      className="px-2 py-1 bg-surface border border-border rounded text-xs"
                                    />
                                    <input
                                      type="number"
                                      placeholder="السعر DA"
                                      value={editingOffer.price_dzd || ""}
                                      onChange={(e) =>
                                        setEditingOffer({ ...editingOffer, price_dzd: Number(e.target.value) })
                                      }
                                      className="px-2 py-1 bg-surface border border-border rounded text-xs"
                                    />
                                    <input
                                      type="number"
                                      placeholder="السعر USD"
                                      value={editingOffer.price_usd || ""}
                                      onChange={(e) =>
                                        setEditingOffer({ ...editingOffer, price_usd: Number(e.target.value) })
                                      }
                                      className="px-2 py-1 bg-surface border border-border rounded text-xs"
                                    />
                                    <input
                                      type="number"
                                      placeholder="المخزون"
                                      value={editingOffer.stock || ""}
                                      onChange={(e) =>
                                        setEditingOffer({ ...editingOffer, stock: Number(e.target.value) })
                                      }
                                      className="px-2 py-1 bg-surface border border-border rounded text-xs"
                                    />
                                    <input
                                      type="text"
                                      placeholder="المورد"
                                      value={editingOffer.supplier || ""}
                                      onChange={(e) =>
                                        setEditingOffer({ ...editingOffer, supplier: e.target.value })
                                      }
                                      className="px-2 py-1 bg-surface border border-border rounded text-xs"
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleSaveOffer(editingOffer)}
                                        className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:opacity-90"
                                      >
                                        حفظ
                                      </button>
                                      <button
                                        onClick={() => setEditingOffer(null)}
                                        className="px-2 py-1 border border-border rounded text-xs hover:bg-surface"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // View mode
                                  <>
                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
                                      <span className="text-muted-foreground">{offer.duration || "—"}</span>
                                      <span className="text-emerald-400 font-semibold">
                                        {offer.price_dzd?.toLocaleString()} DA
                                      </span>
                                      <span className="text-muted-foreground">${offer.price_usd}</span>
                                      <span className="text-muted-foreground">
                                        مخزون: {offer.stock}
                                      </span>
                                      <span className="text-muted-foreground text-[10px] truncate">
                                        {offer.supplier || "—"}
                                      </span>
                                      <span className="text-muted-foreground text-[10px]">
                                        {offer.account_type || "—"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        onClick={() => setEditingOffer(offer)}
                                        className="p-1 text-primary hover:bg-primary/10 rounded"
                                        title="تعديل"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleToggleOfferVisibility(offer.id, offer.active !== false)
                                        }
                                        className={`p-1 rounded ${
                                          offer.active === false
                                            ? "text-muted-foreground hover:bg-surface"
                                            : "text-primary hover:bg-primary/10"
                                        }`}
                                        title={offer.active === false ? "إظهار" : "إخفاء"}
                                      >
                                        {offer.active === false ? (
                                          <EyeOff className="w-4 h-4" />
                                        ) : (
                                          <Eye className="w-4 h-4" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteOffer(offer.id, `${product.name} - ${offer.duration}`)
                                        }
                                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                        title="حذف"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No results */}
        {!isLoading && filteredFamilies.length === 0 && (
          <div className="text-center py-12 border border-border/30 rounded-lg bg-surface/10">
            <p className="text-muted-foreground font-mono">لا توجد عائلات تطابق البحث</p>
          </div>
        )}
      </main>
    </div>
  );
}
