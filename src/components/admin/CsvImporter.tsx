import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

const COLUMN_MAP: Record<string, string> = {
  descrição: "name",
  descricao: "name",
  description: "name",
  name: "name",
  nome: "name",
  grupo: "category",
  category: "category",
  categoria: "category",
  preço: "price",
  preco: "price",
  price: "price",
  ean: "ean",
  "código de barras": "ean",
  "codigo de barras": "ean",
  un: "unit",
  unit: "unit",
  unidade: "unit",
};

function normalizeHeader(header: string): string | null {
  const key = header.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Also try the original lowered version (with accents)
  return COLUMN_MAP[key] ?? COLUMN_MAP[header.trim().toLowerCase()] ?? null;
}

function parsePrice(value: string): number | null {
  if (!value || !value.trim()) return null;
  // Remove currency symbols and spaces, treat comma as decimal separator
  const cleaned = value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === "," || char === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

interface ImportResult {
  total: number;
  inserted: number;
  errors: number;
}

export default function CsvImporter({ onImportComplete }: { onImportComplete: () => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const processFile = useCallback(async (file: File) => {
    setImporting(true);
    setResult(null);

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast({ title: "Arquivo vazio", description: "O CSV precisa ter pelo menos um cabeçalho e uma linha de dados.", variant: "destructive" });
      setImporting(false);
      return;
    }

    const headers = parseCsvLine(lines[0]);
    const mapping: (string | null)[] = headers.map(normalizeHeader);

    const mappedFields = mapping.filter(Boolean);
    if (!mappedFields.includes("name")) {
      toast({ title: "Coluna obrigatória não encontrada", description: "O CSV precisa ter uma coluna 'Descrição' ou 'Name'.", variant: "destructive" });
      setImporting(false);
      return;
    }

    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const row: Record<string, unknown> = {};
      mapping.forEach((field, idx) => {
        if (field && values[idx] !== undefined) {
          if (field === "price") {
            row[field] = parsePrice(values[idx]);
          } else {
            row[field] = values[idx].trim() || null;
          }
        }
      });
      if (row.name) {
        if (!row.category) row.category = "Geral";
        if (!row.unit) row.unit = "UN";
        rows.push(row);
      }
    }

    // Insert in batches of 100
    let inserted = 0;
    let errors = 0;
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from("products").insert(batch as any);
      if (error) {
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    setResult({ total: rows.length, inserted, errors });
    setImporting(false);
    if (inserted > 0) {
      toast({ title: "Importação concluída!", description: `${inserted} produtos importados com sucesso.` });
      onImportComplete();
    }
  }, [toast, onImportComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      processFile(file);
    } else {
      toast({ title: "Formato inválido", description: "Envie apenas arquivos .csv", variant: "destructive" });
    }
  }, [processFile, toast]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Importador de CSV
        </CardTitle>
        <CardDescription>
          Arraste seu arquivo .csv ou clique para selecionar. Colunas aceitas: Descrição, Grupo, Preço, EAN, UN.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onClick={() => document.getElementById("csv-input")?.click()}
        >
          <Upload className={`h-10 w-10 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-sm text-muted-foreground text-center">
            {importing ? "Importando..." : "Arraste o arquivo CSV aqui ou clique para selecionar"}
          </p>
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInput}
            disabled={importing}
          />
        </div>

        {result && (
          <div className={`mt-4 flex items-center gap-2 rounded-md p-3 text-sm ${
            result.errors > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          }`}>
            {result.errors > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>
              {result.inserted} de {result.total} produtos importados.
              {result.errors > 0 && ` ${result.errors} com erro.`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
