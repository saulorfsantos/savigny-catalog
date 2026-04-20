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
  preço_final: "price",
  preco_final: "price",
  "preço final": "price",
  "preco final": "price",
  ean: "ean",
  "código de barras": "ean",
  "codigo de barras": "ean",
  un: "unit",
  unit: "unit",
  unidade: "unit",
  qntd: "stock",
  qtd: "stock",
  quantidade: "stock",
  estoque: "stock",
  stock: "stock",
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

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const counts = {
    ";": (headerLine.match(/;/g) || []).length,
    ",": (headerLine.match(/,/g) || []).length,
    "\t": (headerLine.match(/\t/g) || []).length,
  };
  // Prefer semicolon (PT-BR standard) when present
  if (counts[";"] >= counts[","] && counts[";"] > 0) return ";";
  if (counts["\t"] > counts[","]) return "\t";
  return ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
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

    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCsvLine(lines[0], delimiter);
    const mapping: (string | null)[] = headers.map(normalizeHeader);

    const mappedFields = mapping.filter(Boolean);
    if (!mappedFields.includes("name")) {
      toast({ title: "Coluna obrigatória não encontrada", description: "O CSV precisa ter uma coluna 'Descrição' ou 'Name'.", variant: "destructive" });
      setImporting(false);
      return;
    }

    const rows: Record<string, unknown>[] = [];
    let skippedFardo = 0;
    // Track which mapped fields the price column appears in — we only want the FIRST price column.
    let priceColumnUsed = false;
    const priceIndices: number[] = [];
    mapping.forEach((field, idx) => {
      if (field === "price") priceIndices.push(idx);
    });
    const firstPriceIdx = priceIndices[0];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i], delimiter);
      const row: Record<string, unknown> = {};
      mapping.forEach((field, idx) => {
        if (!field || values[idx] === undefined) return;
        if (field === "price") {
          // Only consume the first price column, ignore the others
          if (idx === firstPriceIdx) {
            row.price = parsePrice(values[idx]);
          }
        } else if (field === "stock") {
          const n = parseInt(values[idx].replace(/[^\d-]/g, ""), 10);
          row.stock = isNaN(n) ? 0 : n;
        } else {
          row[field] = values[idx].trim() || null;
        }
      });
      if (!row.name) continue;
      // Skip FARDO items entirely
      const nameStr = String(row.name).toUpperCase();
      const unitStr = String(row.unit ?? "").toUpperCase();
      if (unitStr === "FARDO" || nameStr.includes("FARDO")) {
        skippedFardo++;
        continue;
      }
      if (!row.category) row.category = "Outros";
      if (!row.unit) row.unit = "UN";
      if (row.stock === undefined) row.stock = 0;
      rows.push(row);
    }

    if (skippedFardo > 0) {
      toast({ title: "Itens FARDO ignorados", description: `${skippedFardo} produto(s) do tipo FARDO foram ignorados na importação.` });
    }

    // Strategy: SELECT existing products → UPDATE only price/stock (preserves image_url)
    // or INSERT new ones. NEVER touches image_url on existing rows.
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // 1. Fetch existing products to match by EAN or name+category
    const eans = rows.map((r) => r.ean).filter(Boolean) as string[];
    const names = rows.map((r) => r.name).filter(Boolean) as string[];

    const { data: existingByEan } = eans.length
      ? await supabase.from("products").select("id, ean, name, category").in("ean", eans)
      : { data: [] as any[] };
    const { data: existingByName } = names.length
      ? await supabase.from("products").select("id, ean, name, category").in("name", names)
      : { data: [] as any[] };

    const eanMap = new Map<string, string>();
    (existingByEan ?? []).forEach((p: any) => { if (p.ean) eanMap.set(p.ean, p.id); });
    const nameKey = (n: string, c: string) => `${n}||${c}`;
    const nameMap = new Map<string, string>();
    (existingByName ?? []).forEach((p: any) => { nameMap.set(nameKey(p.name, p.category), p.id); });

    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; price: unknown; stock: unknown }[] = [];

    for (const row of rows) {
      let existingId: string | undefined;
      if (row.ean && eanMap.has(row.ean as string)) {
        existingId = eanMap.get(row.ean as string);
      } else if (nameMap.has(nameKey(row.name as string, row.category as string))) {
        existingId = nameMap.get(nameKey(row.name as string, row.category as string));
      }
      if (existingId) {
        toUpdate.push({ id: existingId, price: row.price ?? null, stock: row.stock ?? 0 });
      } else {
        toInsert.push(row);
      }
    }

    // 2. Batch INSERT new products
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabase.from("products").insert(batch as any);
      if (error) {
        console.error("Insert error:", error);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    // 3. UPDATE existing products — only price + stock, preserving image_url & all other fields
    for (const u of toUpdate) {
      const { error } = await supabase
        .from("products")
        .update({ price: u.price as number | null, stock: u.stock as number })
        .eq("id", u.id);
      if (error) {
        console.error("Update error:", error);
        errors++;
      } else {
        updated++;
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
          Arraste seu arquivo .csv ou clique para selecionar. Colunas aceitas: Descrição, Grupo, Preço/Preço_Final, EAN, UN, Qntd. Itens "FARDO" são ignorados automaticamente.
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
