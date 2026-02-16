import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import CsvImporter from "@/components/admin/CsvImporter";
import ProductGrid from "@/components/admin/ProductGrid";
import { LogOut } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

const PAGE_SIZE = 50;

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProducts = useCallback(async () => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    setTotalCount(count ?? 0);
    setProducts(data ?? []);
  }, [page]);

  useEffect(() => {
    if (session) fetchProducts();
  }, [session, fetchProducts]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <CsvImporter onImportComplete={fetchProducts} />
        <ProductGrid
          products={products}
          totalCount={totalCount}
          page={page}
          onPageChange={setPage}
          onRefresh={fetchProducts}
        />
      </main>
    </div>
  );
}
