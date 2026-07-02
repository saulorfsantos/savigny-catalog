#!/usr/bin/env node
/**
 * Fetch product images via Serper and store in Supabase Storage.
 *
 * Usage:
 *   node scripts/fetch-product-images.mjs [--limit N] [--concurrency N]
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Edge function must have SERPER_API_KEY configured.
 */

const DEFAULT_CONCURRENCY = 4;

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let concurrency = DEFAULT_CONCURRENCY;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[++i], 10);
    if (args[i] === "--concurrency" && args[i + 1]) concurrency = parseInt(args[++i], 10);
  }
  return { limit, concurrency };
}

async function supabaseFetch(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

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

async function fetchProductsWithoutImage(limit) {
  const products = [];
  const pageSize = 1000;
  let offset = 0;

  while (products.length < limit) {
    const remaining = limit - products.length;
    const fetchSize = Math.min(pageSize, remaining);
    const batch = await supabaseFetch(
      `products?select=id,name,ean&image_url=is.null&order=codigo.asc&limit=${fetchSize}&offset=${offset}`,
    );
    if (!batch?.length) break;
    products.push(...batch);
    if (batch.length < fetchSize) break;
    offset += batch.length;
  }

  return products;
}

async function invokeSearchImage(product) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${url}/functions/v1/search-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: product.name,
      ean: product.ean ?? undefined,
      productId: product.id,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function updateProductImage(id, imageUrl) {
  await supabaseFetch(`products?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ image_url: imageUrl }),
  });
}

async function main() {
  const { limit, concurrency } = parseArgs();
  const products = await fetchProductsWithoutImage(limit);

  console.log(`Produtos sem imagem: ${products.length}`);
  if (products.length === 0) {
    console.log("Nada a fazer.");
    return;
  }

  let done = 0;
  let found = 0;
  let notFound = 0;
  let failed = 0;
  let index = 0;

  const worker = async () => {
    while (index < products.length) {
      const i = index++;
      const product = products[i];
      try {
        const data = await invokeSearchImage(product);
        if (data.imageUrl && data.stored) {
          await updateProductImage(product.id, data.imageUrl);
          found++;
        } else {
          notFound++;
        }
      } catch (err) {
        failed++;
        console.error(`\n[${product.id}] ${product.name.slice(0, 40)}: ${err.message}`);
      }
      done++;
      process.stdout.write(`\r${done}/${products.length} · ${found} ok · ${notFound} sem resultado · ${failed} erro`);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log("\n--- Resultado ---");
  console.log(`Processados: ${done}`);
  console.log(`Imagens salvas: ${found}`);
  console.log(`Sem resultado: ${notFound}`);
  console.log(`Erros: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
