#!/usr/bin/env node
/**
 * Import SIC7 catalog CSV into Supabase products table.
 * Usage: node scripts/import-catalogo.mjs [path/to/catalogo.csv]
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const BATCH = 100;

function parsePrice(value) {
  if (!value || !String(value).trim()) return null;
  const cleaned = String(value).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

function parseCsvLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(headerLine) {
  const counts = {
    ";": (headerLine.match(/;/g) || []).length,
    ",": (headerLine.match(/,/g) || []).length,
    "\t": (headerLine.match(/\t/g) || []).length,
  };
  if (counts[";"] >= counts[","] && counts[";"] > 0) return ";";
  if (counts["\t"] > counts[","]) return "\t";
  return ",";
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function normalizeRow(raw) {
  const name = (raw["Descrição"] ?? raw["Descricao"] ?? raw["description"] ?? "").trim();
  const codigo = (raw["Codigo"] ?? raw["codigo"] ?? raw["Código"] ?? "").trim();
  const unit = (raw["UN"] ?? raw["un"] ?? "UN").trim() || "UN";
  const priceRaw = raw["Preço Final"] ?? raw["Preco Final"] ?? raw["Preço"] ?? raw["Preco"] ?? "";
  const eanRaw = (raw["EAN"] ?? raw["ean"] ?? "").trim();
  const categoryRaw = (raw["Grupo"] ?? raw["grupo"] ?? raw["category"] ?? "").trim();
  const stockRaw = (raw["Qntd"] ?? raw["qntd"] ?? raw["stock"] ?? "").trim();

  return {
    codigo,
    name,
    unit,
    price: parsePrice(priceRaw),
    ean: eanRaw || null,
    category: categoryRaw || null,
    stock: stockRaw ? parseInt(stockRaw.replace(/[^\d-]/g, ""), 10) : null,
  };
}

function prepareRows(rawRows) {
  const seen = new Set();
  const prepared = [];
  let skippedEmptyDesc = 0;
  let skippedDupCodigo = 0;
  let skippedFardo = 0;
  let skippedNoCodigo = 0;

  for (const raw of rawRows) {
    const row = normalizeRow(raw);
    if (!row.codigo) {
      skippedNoCodigo++;
      continue;
    }
    if (!row.name) {
      skippedEmptyDesc++;
      continue;
    }
    if (seen.has(row.codigo)) {
      skippedDupCodigo++;
      continue;
    }
    const nameStr = row.name.toUpperCase();
    const unitStr = row.unit.toUpperCase();
    if (unitStr === "FARDO" || nameStr.includes("FARDO")) {
      skippedFardo++;
      continue;
    }
    seen.add(row.codigo);
    if (row.stock !== null && Number.isNaN(row.stock)) row.stock = null;
    prepared.push(row);
  }

  return { prepared, skippedEmptyDesc, skippedDupCodigo, skippedFardo, skippedNoCodigo };
}

async function supabaseFetch(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method || "GET"} ${path} → ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchExistingByCodigo(codigos) {
  const map = new Map();
  for (let i = 0; i < codigos.length; i += 200) {
    const chunk = codigos.slice(i, i + 200);
    const filter = chunk.map((c) => `"${c.replace(/"/g, "")}"`).join(",");
    const data = await supabaseFetch(
      `products?select=id,codigo&codigo=in.(${filter})`,
    );
    for (const p of data ?? []) map.set(p.codigo, p.id);
  }
  return map;
}

async function main() {
  const csvPath = resolve(process.argv[2] ?? "catalogo_savigny.csv");
  let text = readFileSync(csvPath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rawRows = parseCsv(text);
  const { prepared, skippedEmptyDesc, skippedDupCodigo, skippedFardo, skippedNoCodigo } =
    prepareRows(rawRows);

  console.log(`CSV: ${rawRows.length} linhas → ${prepared.length} prontas para importar`);
  console.log(`Ignorados: ${skippedEmptyDesc} sem descrição, ${skippedDupCodigo} codigo duplicado, ${skippedFardo} FARDO, ${skippedNoCodigo} sem codigo`);

  const existing = await fetchExistingByCodigo(prepared.map((r) => r.codigo));

  const toInsert = [];
  const toUpdate = [];

  for (const row of prepared) {
    const id = existing.get(row.codigo);
    if (id) {
      toUpdate.push({
        id,
        name: row.name,
        price: row.price,
        ean: row.ean,
        unit: row.unit,
      });
    } else {
      toInsert.push({
        codigo: row.codigo,
        name: row.name,
        price: row.price,
        ean: row.ean,
        unit: row.unit,
        category: row.category,
        stock: row.stock,
        available: true,
      });
    }
  }

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    try {
      await supabaseFetch("products", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(batch),
      });
      inserted += batch.length;
      process.stdout.write(`\rInseridos: ${inserted}/${toInsert.length}`);
    } catch (err) {
      console.error("\nInsert batch error:", err.message);
      errors += batch.length;
    }
  }
  if (toInsert.length) console.log("");

  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const batch = toUpdate.slice(i, i + BATCH);
    for (const row of batch) {
      try {
        await supabaseFetch(`products?id=eq.${row.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            name: row.name,
            price: row.price,
            ean: row.ean,
            unit: row.unit,
          }),
        });
        updated++;
      } catch (err) {
        console.error(`Update error codigo ${row.id}:`, err.message);
        errors++;
      }
    }
    process.stdout.write(`\rAtualizados: ${updated}/${toUpdate.length}`);
  }
  if (toUpdate.length) console.log("");

  const count = await supabaseFetch("products?select=id", {
    headers: { Prefer: "count=exact", Range: "0-0" },
  }).catch(() => null);

  // Get count via head request workaround
  const countRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/products?select=id`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  const contentRange = countRes.headers.get("content-range");
  const totalInDb = contentRange ? contentRange.split("/")[1] : "?";

  console.log("\n--- Resultado ---");
  console.log(`Inseridos: ${inserted}`);
  console.log(`Atualizados: ${updated}`);
  console.log(`Erros: ${errors}`);
  console.log(`Total no banco: ${totalInDb}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
