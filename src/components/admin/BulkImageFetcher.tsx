import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Images, Loader2 } from "lucide-react";

const DAILY_LIMIT = 500;

export default function BulkImageFetcher({ onComplete }: { onComplete: () => void }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, found: 0, failed: 0 });
  const { toast } = useToast();

  const run = async () => {
    setRunning(true);
    setProgress({ done: 0, total: 0, found: 0, failed: 0 });

    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, ean")
      .is("image_url", null)
      .limit(DAILY_LIMIT);

    if (error || !products) {
      toast({ title: "Erro ao buscar produtos", description: error?.message, variant: "destructive" });
      setRunning(false);
      return;
    }

    if (products.length === 0) {
      toast({ title: "Nada a fazer", description: "Todos os produtos já possuem imagem." });
      setRunning(false);
      return;
    }

    let found = 0;
    let failed = 0;
    setProgress({ done: 0, total: products.length, found: 0, failed: 0 });

    // Process sequentially with small concurrency to be gentle with API quotas
    const CONCURRENCY = 4;
    let index = 0;

    const worker = async () => {
      while (index < products.length) {
        const i = index++;
        const p = products[i];
        try {
          const { data, error } = await supabase.functions.invoke("search-image", {
            body: { query: p.name, ean: p.ean ?? undefined },
          });
          if (error || !data?.imageUrl) {
            failed++;
          } else {
            await supabase.from("products").update({ image_url: data.imageUrl }).eq("id", p.id);
            found++;
          }
        } catch {
          failed++;
        }
        setProgress({ done: i + 1, total: products.length, found, failed });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    setRunning(false);
    toast({
      title: "Busca concluída",
      description: `${found} imagens encontradas, ${failed} falharam de ${products.length} produtos.`,
    });
    onComplete();
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
          Busca automaticamente até {DAILY_LIMIT} imagens por execução para produtos sem foto, usando o Google via Serper.dev.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={run} disabled={running} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
          {running ? "Buscando..." : "Iniciar busca"}
        </Button>
        {progress.total > 0 && (
          <>
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              {progress.done} / {progress.total} processados · {progress.found} encontradas · {progress.failed} falharam
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
