import { useState, useEffect, useMemo, useCallback } from "react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  image_url: string | null;
  price: number | null;
  stock: number | null;
}

const PAGE_SIZE = 20;

interface CatalogSectionProps {
  search?: string;
}

const CatalogSection = ({ search = "" }: CatalogSectionProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch products
  const fetchProducts = useCallback(async (offset: number, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from("products")
      .select("id, name, category, unit, image_url, price, stock")
      .eq("available", true)
      .order("name")
      .range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (!error && data) {
      setProducts((prev) => reset ? data : [...prev, data as unknown as Product].flat());
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    fetchProducts(0, true);
  }, [fetchProducts]);

  // Derive categories from fetched products
  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))].sort();
    return cats;
  }, [products]);

  // Client-side filter
  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory !== "all") {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(term));
    }
    return result;
  }, [products, activeCategory, search]);

  const handleLoadMore = () => {
    fetchProducts(products.length);
  };

  return (
    <section className="bg-background py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-8">
          Monte sua lista de suprimentos
        </h2>

        {/* Category pills */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-foreground/70 hover:text-foreground"
              )}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? "all" : cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-foreground/70 hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  detail={product.unit}
                  image={product.image_url}
                  category={product.category}
                  price={product.price}
                  stock={product.stock}
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                Nenhum produto encontrado.
              </p>
            )}

            {/* Load more */}
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
    </section>
  );
};

export default CatalogSection;
