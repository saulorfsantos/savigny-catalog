#!/usr/bin/env node
/**
 * Classify products into categories by keyword rules (priority order).
 * Usage: node scripts/classify-categories.mjs
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const BATCH = 50;

// Priority order: first match wins
const CATEGORY_RULES = [
  {
    category: "EPI's",
    keywords: [
      "LUVA", "BOTA", "BOTINA", "MASCARA", "MÁSCARA", "OCULOS", "ÓCULOS",
      "PROTETOR", "CAPACETE", "ABAFADOR", "RESPIRADOR", "AVENTAL", "PROTECAO",
      "PROTEÇÃO", "LENTE", "TAMPA OUV", "CINTA PARAQUED",
    ],
  },
  {
    category: "Piscina",
    keywords: [
      "PISCINA", "ALGICIDA", "PASTILHA", "BARRILHA", "CLARIFICANTE", "SULFATO",
      "PH+", "PH -", "PH+", "BICARBONATO", "AZUL CLARO", "AZUL ESCURO",
      "HIDRO SOL", "POOL", "CLORO GRANULADO", "CLORO TABLETE",
    ],
  },
  {
    category: "Automotivo",
    keywords: [
      "AUTOMOTIVO", "AUTOMOTIV", "PNEU", "PARABRISA", "RADIADOR", "MOTOR ",
      "CARRO", "AUTO ", "LIMPA VIDRO", "SILICONE SPRAY", "CERA AUTOMOT",
      "ADITIVO RADIADOR", "LIMPA CONTATO",
    ],
  },
  {
    category: "Perfumaria",
    keywords: [
      "DEO-COLONIA", "DEO COLONIA", "DESODORANTE", "PERFUME", "COLONIA", "COLÔNIA",
      "BODY SPLASH", "HIDRATANTE", "SPLASH", "ESSENCIA", "ESSÊNCIA",
      "AROMATIZANTE PESSOAL",
    ],
  },
  {
    category: "Office",
    keywords: [
      "CANETA", "MARCADOR", "LAPIS", "LÁPIS", "CLIPS", "GRAMPO", "PASTA ",
      "BLOCO ", "PAPEL A4", "PAPEL SULFITE", "CADERNO", "COLA ", "TESOURA",
      "REGUA", "RÉGUA", "PILHA", "BATERIA", "CORRETIVO", "APONTADOR", "ENVELOPE",
      "PINCEL ATOMICO", "PINCEL ATÔMICO", "ETIQUETA", "PERFURADOR", "GRAMPEADOR",
      "CALCULADORA", "ESTILETE", "FITA ADESIVA", "FITA CREPE", "POST IT",
      "POST-IT", "PAPEL CONTACT", "PAPEL KRAFT", "PAPEL RECADO",
    ],
  },
  {
    category: "Manutenção",
    keywords: [
      "TINTA ", "PINCEL ", "ROLO ", "LAMPADA", "LÂMPADA", "PARAFUSO", "CABO ",
      "TOMADA", "DISJUNTOR", "ABRACADEIRA", "ABRAÇADEIRA", "LIXA", "BROCA",
      "CADEADO", "ARAME", "PREGO", "VEDA ", "MASSA CORRIDA", "SILICONE",
      "FIO ", "EXTENSAO", "EXTENSÃO", "INTERRUPTOR", "SOQUETE", "RELE",
      "FERRAMENTA", "CHAVE ", "ALICATE", "MARTELO", "SERROTE", "NIVEL",
      "NÍVEL", "TUBO ", "CONEXAO", "CONEXÃO", "REGISTRO", "VALVULA", "VÁLVULA",
    ],
  },
  {
    category: "Higiene Corporativa",
    keywords: [
      "DISPENSER", "PAPEL TOALHA", "TOALHA PAPEL", "BOBINA", "ALCOOL GEL",
      "ÁLCOOL GEL", "LIXEIRA", "REFIL", "SABONETE LIQUIDO", "SABONETE LÍQUIDO",
      "PAPEL HIGIENICO R", "PAPEL HIGIÊNICO R", "SABONETEIRA",
    ],
  },
  {
    category: "Higiene Pessoal",
    keywords: [
      "SABONETE", "PAPEL HIGIENICO", "PAPEL HIGIÊNICO", "SHAMPOO", "XAMPU",
      "CREME DENTAL", "ESCOVA DENTAL", "ABSORVENTE", "FRALDA", "ALGODAO",
      "ALGODÃO", "COTONETE", "LENCO", "LENÇO", "CONDICIONADOR", "ABS ",
      "CREME PARA MAOS", "CREME PARA MÃOS",
    ],
  },
  {
    category: "Food Service",
    keywords: [
      "MARMITEX", "MARMITA", "PRATO ", "GARFO", "COLHER", "FACA", "FACÃO",
      "GUARDANAPO", "BISCOITO", "CAFE ", "CAFÉ ", "ACUCAR", "AÇUCAR", "AÇÚCAR",
      "ADOCANTE", "ADOÇANTE", "AGUA ", "ÁGUA ", "SUCO", "BANDEJA", "POTE ",
      "FILME PVC", "PAPEL ALUMINIO", "PAPEL ALUMÍNIO", "ACHOCOLATADO",
      "LEITE ", "CREME DE LEITE", "MILHO", "ERVILHA", "MOLHO", "TEMPERO",
      "SAL ", "OLEO", "ÓLEO", "AZEITE", "VINAGRE", "FARINHA", "MACARRAO",
      "MACARRÃO", "ARROZ", "FEIJAO", "FEIJÃO",
    ],
  },
  {
    category: "Descartáveis",
    keywords: [
      "COPO ", "SACOLA", "SACO ", "CANUDO", "TAMPA ", "DESCARTAVEL", "DESCARTÁVEL",
      "EMBALAGEM", "PRATO DESC", "COPO DESC", "EMBALAGENS",
    ],
  },
  {
    category: "Limpeza",
    keywords: [
      "DESINFETANTE", "DETERGENTE", "SABAO", "SABÃO", "MULTIUSO", "MULTI USO",
      "AMACIANTE", "AGUA SANITARIA", "ÁGUA SANITÁRIA", "ALVEJANTE", "LIMPA ",
      "LUSTRA", "VASSOURA", "RODO", "MOP", "PANO ", "FIBRA", "ESPONJA", "BALDE",
      "AROMATIZANTE", "ODORIZADOR", "CERA ", "REMOVEDOR", "SAPONACEO", "SAPONÁCEO",
      "DISCO", "CLORO ", "DESENGORDURANTE", "LIMPEZA", "LIMPA ALUMINIO",
      "LIMPA VIDRO", "LIMPA PISO", "LIMPA TECIDO", "LIMPA FORNO", "INSETICIDA",
      "INSET ", "RATICIDA", "FORMICIDA", "CUPINICIDA", "FLORESTAL", "CIF ",
      "VEJA ", "YPE ", "ASSIM ", "ASSUGRIN", "PINHO", "SANOL", "QBOA",
      "PATO ", "HARPIC", "AJAX", "BOMBRIL", "SCOTCH BRITE", "SCOTCH-BRITE",
      "FLANELA", "RODO", "VASSOUR", "PA ", "RODO",
    ],
  },
  {
    category: "Utility",
    keywords: [
      "ORGANIZADOR", "CESTO", "CAIXA ORGANIZ", "GANCHO", "SUPORTE", "PRATELEIRA",
      "GAVETEIRO", "CARRINHO", "CARRINHO ", "ESCADA", "BANQUETA", "BANCADA",
    ],
  },
];

const FALLBACK = "Outros";

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function classify(name) {
  const normalized = normalize(name);
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (normalized.includes(normalize(kw))) {
        return rule.category;
      }
    }
  }
  return FALLBACK;
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

async function fetchAllProducts() {
  const all = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const batch = await supabaseFetch(
      `products?select=id,name,category&order=codigo.asc&limit=${pageSize}&offset=${offset}`,
    );
    if (!batch?.length) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function main() {
  const products = await fetchAllProducts();
  console.log(`Produtos encontrados: ${products.length}`);

  const distribution = {};
  const updates = products.map((p) => {
    const category = classify(p.name);
    distribution[category] = (distribution[category] || 0) + 1;
    return { id: p.id, category, prev: p.category };
  });

  console.log("\n--- Distribuição prevista ---");
  Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ id, category }) => {
        try {
          await supabaseFetch(`products?id=eq.${id}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ category }),
          });
          updated++;
        } catch (err) {
          errors++;
          console.error(`Erro ${id}:`, err.message);
        }
      }),
    );
    process.stdout.write(`\rAtualizados: ${updated}/${updates.length}`);
  }

  console.log(`\n\n--- Resultado ---`);
  console.log(`Atualizados: ${updated}`);
  console.log(`Erros: ${errors}`);
  console.log(`Outros: ${distribution[FALLBACK] || 0}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
