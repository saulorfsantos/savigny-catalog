-- Remove duplicatas por EAN mantendo o ctid mínimo
DELETE FROM public.products a
USING public.products b
WHERE a.ean IS NOT NULL
  AND a.ean = b.ean
  AND a.ctid > b.ctid;

-- Remove duplicatas por nome+categoria (sem EAN) mantendo o ctid mínimo
DELETE FROM public.products a
USING public.products b
WHERE a.ean IS NULL
  AND b.ean IS NULL
  AND a.name = b.name
  AND a.category = b.category
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS products_ean_unique_idx
  ON public.products (ean)
  WHERE ean IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_name_category_unique_idx
  ON public.products (name, category)
  WHERE ean IS NULL;