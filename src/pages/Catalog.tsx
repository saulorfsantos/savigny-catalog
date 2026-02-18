import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, Sparkles, Utensils, SprayCanIcon, Coffee, Briefcase, Heart, HardHat, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  image_url: string | null;
}

const PAGE_SIZE = 20;

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  office: Briefcase,
  "pro clean": SprayCanIcon,
  utility: Package,
  "coffee & break": Coffee,
  "coffee &amp; break": Coffee,
  "food service": Utensils,
  "tissue & care": Heart,
  "tissue &amp; care": Heart,
  epis: HardHat,
  alimentos: Utensils,
  limpeza: SprayCanIcon,
  higiene: Heart,
  escritorio: Briefcase,
  escritório: Briefcase,
  descartaveis: ShoppingBag,
  descartáveis: ShoppingBag,
};

function getIconForCategory(cat: string) {
  const key = cat.toLowerCase().trim();
  return CATEGORY_ICONS[key] || Sparkles;
}

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const fetchProducts = useCallback(async (offset: number, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, unit, image_url")
      .eq("available", true)
      .order("name")
      .range(offset, offset + PAGE_SIZE - 1);

    if (!error && data) {
      setProducts((prev) => (reset ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    fetchProducts(0, true);
  }, [fetchProducts]);

  // Sync category and search with URL
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setActiveCategory(cat);
    const s = searchParams.get("search");
    if (s) setSearch(s);
  }, [searchParams]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    if (cat === "all") {
      setSearchParams(search ? { search } : {});
    } else {
      setSearchParams(search ? { category: cat, search } : { category: cat });
    }
  };

  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category))].sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory !== "all") {
      result = result.filter(
        (p) => p.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(term));
    }
    return result;
  }, [products, activeCategory, search]);

  const handleLoadMore = () => fetchProducts(products.length);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-6">
          Catálogo de Produtos
        </h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <nav className="sticky top-24 space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                Categorias
              </h3>
              <button
                onClick={() => handleCategoryChange("all")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
              >
                <Package className="h-4 w-4 flex-shrink-0" />
                <span>Todos</span>
              </button>
              {categories.map((cat) => {
                const Icon = getIconForCategory(cat);
                const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left capitalize",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Mobile Category Pills */}
          <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => handleCategoryChange("all")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-foreground/70 hover:text-foreground"
                )}
              >
                <Package className="h-4 w-4" />
                Todos
              </button>
              {categories.map((cat) => {
                const Icon = getIconForCategory(cat);
                const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-foreground/70 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map((product) => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      detail={product.unit}
                      image={product.image_url}
                      category={product.category}
                    />
                  ))}
                </div>

                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">
                    Nenhum produto encontrado.
                  </p>
                )}

                {hasMore && activeCategory === "all" && !search.trim() && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="gap-2"
                    >
                      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                      Carregar mais produtos
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;
