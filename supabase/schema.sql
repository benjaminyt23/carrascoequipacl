-- Ejecuta este archivo en el SQL Editor de tu proyecto Supabase.
-- No contiene productos de ejemplo ni modifica datos existentes.
begin;

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  codigo text,
  vehiculo text not null check (length(trim(vehiculo)) > 0),
  ano text not null check (length(trim(ano)) > 0),
  precio numeric(12,0) not null check (precio >= 0),
  descripcion text not null default '',
  instalacion text not null default '',
  stock integer not null default 0 check (stock >= 0),
  foto text check (foto is null or foto ~* '^https?://'),
  created_at timestamptz not null default now()
);

-- Esta tabla permite autorizar administradores sin exponer claves privadas.
create table if not exists public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.productos enable row level security;
alter table public.administradores enable row level security;

revoke all on public.productos from anon, authenticated;
grant select on public.productos to anon, authenticated;
grant insert, update, delete on public.productos to authenticated;
revoke all on public.administradores from anon, authenticated;
grant select on public.administradores to authenticated;

drop policy if exists "Ver mi autorizacion" on public.administradores;
create policy "Ver mi autorizacion" on public.administradores
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Catalogo publico" on public.productos;
create policy "Catalogo publico" on public.productos
  for select to anon, authenticated using (true);

drop policy if exists "Administradores agregan" on public.productos;
create policy "Administradores agregan" on public.productos
  for insert to authenticated with check (
    exists (select 1 from public.administradores where user_id = (select auth.uid()))
  );
drop policy if exists "Administradores editan" on public.productos;
create policy "Administradores editan" on public.productos
  for update to authenticated using (
    exists (select 1 from public.administradores where user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.administradores where user_id = (select auth.uid()))
  );
drop policy if exists "Administradores eliminan" on public.productos;
create policy "Administradores eliminan" on public.productos
  for delete to authenticated using (
    exists (select 1 from public.administradores where user_id = (select auth.uid()))
  );

commit;

-- Después de crear tu usuario en Authentication > Users, copia su UUID
-- y ejecuta por separado (reemplaza el texto por el UUID real):
-- insert into public.administradores (user_id) values ('UUID-DE-TU-USUARIO')
-- on conflict do nothing;
