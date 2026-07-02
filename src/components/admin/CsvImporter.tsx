import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

const COLUMN_MAP: Record<string, string> = {
  descrição: "name",
  descricao: "name",
  description: "name",
  name: "name",
  nome: "name",
  codigo: "codigo",
  código: "codigo",
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
  return COLUMN_MAP[key] ?? COLUMN_MAP[header.trim().toLowerCase()] ?? null;
}

function parsePrice(value: string): number | null {
  if (!value || !value.trim()) return null;
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
  updated: number;
  skipped: number;
  errors: number;
}

interface ParsedRow {
  codigo: string;
  name: string;
  unit: string;
  price: number | null;
  ean: string | null;
  category: string | null;
  stock: number | null;
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
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
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
    if (!mappedFields.includes("codigo")) {
      toast({ title: "Coluna obrigatória não encontrada", description: "O CSV precisa ter uma coluna 'Codigo'.", variant: "destructive" });
      setImporting(false);
      return;
    }

    const priceIndices: number[] = [];
    mapping.forEach((field, idx) => {
      if (field === "price") priceIndices.push(idx);
    });
    const firstPriceIdx = priceIndices[0];

    const seenCodigo = new Set<string>();
    const rows: ParsedRow[] = [];
    let skipped = 0;
    let skippedFardo = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i], delimiter);
      const raw: Record<string, unknown> = {};
      mapping.forEach((field, idx) => {
        if (!field || values[idx] === undefined) return;
        if (field === "price") {
          if (idx === firstPriceIdx) raw.price = parsePrice(values[idx]);
        } else if (field === "stock") {
          const trimmed = values[idx].trim();
          if (trimmed) {
            const n = parseInt(trimmed.replace(/[^\d-]/g, ""), 10);
            raw.stock = isNaN(n) ? null : n;
          }
        } else {
          raw[field] = values[idx].trim() || null;
        }
      });

      const codigo = String(raw.codigo ?? "").trim();
      const name = String(raw.name ?? "").trim();
      if (!codigo || !name) {
        skipped++;
        continue;
      }
      if (seenCodigo.has(codigo)) {
        skipped++;
        continue;
      }

      const nameStr = name.toUpperCase();
      const unitStr = String(raw.unit ?? "UN").toUpperCase();
      if (unitStr === "FARDO" || nameStr.includes("FARDO")) {
        skippedFardo++;
        continue;
      }

      seenCodigo.add(codigo);
      rows.push({
        codigo,
        name,
        unit: String(raw.unit ?? "UN").trim() || "UN",
        price: (raw.price as number | null | undefined) ?? null,
        ean: raw.ean ? String(raw.ean).trim() : null,
        category: raw.category ? String(raw.category).trim() : null,
        stock: (raw.stock as number | null | undefined) ?? null,
      });
    }

    if (skippedFardo > 0) {
      toast({ title: "Itens FARDO ignorados", description: `${skippedFardo} produto(s) do tipo FARDO foram ignorados na importação.` });
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    const codigos = rows.map((r) => r.codigo);
    const { data: existing } = await supabase
      .from("products")
      .select("id, codigo")
      .in("codigo", codigos);

    const codigoMap = new Map<string, string>();
    (existing ?? []).forEach((p) => {
      if (p.codigo) codigoMap.set(p.codigo, p.id);
    });

    const toInsert: ParsedRow[] = [];
    const toUpdate: { id: string; row: ParsedRow }[] = [];

    for (const row of rows) {
      const existingId = codigoMap.get(row.codigo);
      if (existingId) {
        toUpdate.push({ id: existingId, row });
      } else {
        toInsert.push(row);
      }
    }

    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize).map((r) => ({
        codigo: r.codigo,
        name: r.name,
        unit: r.unit,
        price: r.price,
        ean: r.ean,
        category: r.category,
        stock: r.stock,
        available: true,
      }));
      const { error } = await supabase.from("products").insert(batch);
      if (error) {
        console.error("Insert error:", error);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    for (const { id, row } of toUpdate) {
      const { error } = await supabase
        .from("products")
        .update({
          name: row.name,
          price: row.price,
          ean: row.ean,
          unit: row.unit,
        })
        .eq("id", id);
      if (error) {
        console.error("Update error:", error);
        errors++;
      } else {
        updated++;
      }
    }

    setResult({ total: rows.length, inserted, updated, skipped, errors });
    setImporting(false);
    if (inserted > 0 || updated > 0) {
      toast({
        title: "Importação concluída!",
        description: `${updated} atualizados, ${inserted} novos. Imagens e categorias preservadas.`,
      });
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
          Colunas: Codigo (obrigatório), Descrição, Grupo, Preço Final, EAN, UN, Qntd. Re-import atualiza nome, preço, EAN e unidade — preserva imagens, categoria e estoque. Itens FARDO são ignorados.
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
              {result.updated} atualizados, {result.inserted} novos (de {result.total} no CSV).
              {result.skipped > 0 && ` ${result.skipped} ignorados.`}
              {result.errors > 0 && ` ${result.errors} com erro.`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
