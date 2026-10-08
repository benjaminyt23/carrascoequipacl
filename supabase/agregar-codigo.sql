-- Ejecuta en SQL Editor una sola vez (también es seguro repetirlo).
-- Añade una columna opcional, sin actualizar ni borrar productos existentes.
alter table public.productos add column if not exists codigo text;
comment on column public.productos.codigo is
  'Referencia interna. El futuro bot solo debe comunicarla cuando el cliente pregunte explícitamente por código o SKU.';
