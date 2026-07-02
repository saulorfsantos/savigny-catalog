-- ERP business key (SIC7 Codigo)
ALTER TABLE public.products ADD COLUMN codigo TEXT;

ALTER TABLE public.products ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN stock DROP DEFAULT;
ALTER TABLE public.products ALTER COLUMN stock SET DEFAULT NULL;

CREATE UNIQUE INDEX products_codigo_unique_idx ON public.products (codigo);

DROP INDEX IF EXISTS products_name_category_unique_idx;
