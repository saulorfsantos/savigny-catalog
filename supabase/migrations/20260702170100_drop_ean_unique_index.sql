-- Allow duplicate EANs across different ERP products (business key is codigo)
DROP INDEX IF EXISTS products_ean_unique_idx;
