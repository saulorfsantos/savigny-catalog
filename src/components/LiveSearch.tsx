import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  name: string;
  category: string;
  unit: string;
  image_url: string | null;
  price: number | null;
}

interface LiveSearchProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-primary/20 text-foreground font-bold rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const LiveSearch = ({ className, inputClassName, placeholder = "O que sua empresa precisa hoje?" }: LiveSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { addItem } = useCart();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, name, category, unit, image_url, price")
      .eq("available", true)
      .ilike("name", `%${term}%`)
      .order("name")
      .limit(7);

    if (data) {
      setResults(data);
      setOpen(data.length > 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      setOpen(false);
      navigate(`/catalog?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleAdd = (item: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ id: item.id, name: item.name, detail: item.unit, image: item.image_url || "" });
    toast({ title: "✅ Item adicionado à cotação!", duration: 2000 });
  };

  const handleSelect = (item: SearchResult) => {
    setOpen(false);
    setQuery("");
    // Navigate to catalog filtered by this product name
    navigate(`/catalog?search=${encodeURIComponent(item.name)}`);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative w-full">
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn("w-full pr-12", inputClassName)}
        />
        <button
          type="button"
          onClick={() => {
            if (query.trim()) {
              setOpen(false);
              navigate(`/catalog?search=${encodeURIComponent(query.trim())}`);
            }
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left group"
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-md bg-muted/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground/50" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-tight line-clamp-1">
                  {highlightMatch(item.name, query)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.category && (
                    <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
                  )}
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className={cn(
                    "text-xs font-semibold",
                    item.price != null ? "text-primary" : "text-amber-700 dark:text-amber-400"
                  )}>
                    {item.price != null
                      ? `R$ ${item.price.toFixed(2).replace(".", ",")}`
                      : "Consulte"}
                  </span>
                </div>
              </div>

              {/* Add button */}
              <button
                onClick={(e) => handleAdd(item, e)}
                className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Adicionar ao orçamento"
              >
                <Plus className="h-4 w-4" />
              </button>
            </button>
          ))}

          {/* Footer */}
          <button
            onClick={() => {
              setOpen(false);
              navigate(`/catalog?search=${encodeURIComponent(query.trim())}`);
            }}
            className="w-full px-3 py-2.5 text-xs font-medium text-primary hover:bg-accent transition-colors border-t border-border text-center"
          >
            Ver todos os resultados para "{query}"
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveSearch;
