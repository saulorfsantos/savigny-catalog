import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, Sparkles, Utensils, SprayCanIcon, Coffee, Briefcase, Heart, HardHat, ShoppingBag, Wrench, Droplets, Car, FlaskConical, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  image_url: string | null;
  price: number | null;
  stock: number | null;
}

const PAGE_SIZE = 24;

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  office: Briefcase,
  limpeza: SprayCanIcon,
  utility: Wrench,
  "food service": Utensils,
  "descartáveis": ShoppingBag,
  "higiene pessoal": Heart,
  "higiene corporativa": FlaskConical,
  "epi's": HardHat,
  piscina: Droplets,
  perfumaria: Coffee,
  "manutenção": Wrench,
  automotivo: Car,
  outros: LayoutGrid,
};

function getIconForCategory(cat: string) {
  return CATEGORY_ICONS[cat.toLowerCase().trim()] || Sparkles;
}

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch distinct categories once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("category")
        .eq("available", true);
      if (data) {
        const cats = [...new Set(data.map((p) => p.category))].sort();
        setCategories(cats);
      }
    })();
  }, []);

  // Fetch products for current page with server-side filtering
  const fetchPage = useCallback(async (page: number, category: string, searchTerm: string) => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;

    // Build base query for count
    let countQuery = supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("available", true);

    // Build data query
    let dataQuery = supabase
      .from("products")
      .select("id, name, category, unit, image_url, price, stock")
      .eq("available", true)
      .order("name")
      .range(offset, offset + PAGE_SIZE - 1);

    // Apply category filter (case-insensitive via ilike)
    if (category !== "all") {
      countQuery = countQuery.ilike("category", category);
      dataQuery = dataQuery.ilike("category", category);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      countQuery = countQuery.ilike("name", `%${searchTerm.trim()}%`);
      dataQuery = dataQuery.ilike("name", `%${searchTerm.trim()}%`);
    }

    const [countRes, dataRes] = await Promise.all([countQuery, dataQuery]);

    setTotalCount(countRes.count ?? 0);
    setProducts(dataRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPage(currentPage, activeCategory, search);
  }, [currentPage, activeCategory, search, fetchPage]);

  // Sync URL params
  useEffect(() => {
    const cat = searchParams.get("category") || "all";
    const s = searchParams.get("search") || "";
    const p = parseInt(searchParams.get("page") || "1", 10);
    setActiveCategory(cat);
    setSearch(s);
    setCurrentPage(p);
  }, [searchParams]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const updateParams = (overrides: Record<string, string>) => {
    const params: Record<string, string> = {};
    const cat = overrides.category ?? activeCategory;
    const s = overrides.search ?? search;
    const p = overrides.page ?? "1";
    if (cat !== "all") params.category = cat;
    if (s) params.search = s;
    if (p !== "1") params.page = p;
    setSearchParams(params);
  };

  const handleCategoryChange = (cat: string) => updateParams({ category: cat, page: "1" });
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    updateParams({ page: String(page) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

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
                {/* Count feedback */}
                <p className="text-sm text-muted-foreground mb-4">
                  Exibindo {products.length} produtos de {totalCount} encontrados
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product) => (
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

                {products.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">
                    Nenhum produto encontrado.
                  </p>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={cn(currentPage <= 1 && "pointer-events-none opacity-50", "cursor-pointer")}
                          />
                        </PaginationItem>
                        {pageNumbers.map((p, i) =>
                          p === "ellipsis" ? (
                            <PaginationItem key={`e-${i}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={p}>
                              <PaginationLink
                                isActive={p === currentPage}
                                onClick={() => handlePageChange(p)}
                                className="cursor-pointer"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(currentPage + 1)}
                            className={cn(currentPage >= totalPages && "pointer-events-none opacity-50", "cursor-pointer")}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
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
