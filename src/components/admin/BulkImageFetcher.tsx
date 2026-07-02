import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Images, Loader2 } from "lucide-react";

const CONCURRENCY = 4;
const PAGE_SIZE = 500;

export default function BulkImageFetcher({ onComplete }: { onComplete: () => void }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, found: 0, failed: 0, notFound: 0 });
  const { toast } = useToast();

  const fetchAllWithoutImage = async () => {
    const all: { id: string; name: string; ean: string | null }[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, ean")
        .is("image_url", null)
        .order("codigo", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data?.length) break;
      all.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return all;
  };

  const run = async () => {
    setRunning(true);
    setProgress({ done: 0, total: 0, found: 0, failed: 0, notFound: 0 });

    try {
      const products = await fetchAllWithoutImage();

      if (products.length === 0) {
        toast({ title: "Nada a fazer", description: "Todos os produtos já possuem imagem." });
        setRunning(false);
        return;
      }

      let found = 0;
      let failed = 0;
      let notFound = 0;
      let index = 0;
      setProgress({ done: 0, total: products.length, found: 0, failed: 0, notFound: 0 });

      const worker = async () => {
        while (index < products.length) {
          const i = index++;
          const p = products[i];
          try {
            const { data, error } = await supabase.functions.invoke("search-image", {
              body: { query: p.name, ean: p.ean ?? undefined, productId: p.id },
            });
            if (error) {
              failed++;
            } else if (data?.imageUrl && data?.stored) {
              await supabase.from("products").update({ image_url: data.imageUrl }).eq("id", p.id);
              found++;
            } else {
              notFound++;
            }
          } catch {
            failed++;
          }
          setProgress({ done: i + 1, total: products.length, found, failed, notFound });
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      toast({
        title: "Busca concluída",
        description: `${found} imagens salvas, ${notFound} sem resultado, ${failed} falharam (de ${products.length}).`,
      });
      onComplete();
    } catch (err) {
      toast({
        title: "Erro ao buscar produtos",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Images className="h-5 w-5 text-primary" />
          Buscar Imagens em Lote
        </CardTitle>
        <CardDescription>
          Busca imagens via Serper.dev para todos os produtos sem foto e salva no Supabase Storage. Cada busca consome 1 crédito Serper.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={run} disabled={running} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
          {running ? "Buscando..." : "Iniciar busca em massa"}
        </Button>
        {progress.total > 0 && (
          <>
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              {progress.done} / {progress.total} processados · {progress.found} salvas · {progress.notFound} sem resultado · {progress.failed} falharam
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
