-- Ejecutar en SQL Editor DESPUÉS de schema.sql.
-- Crea/configura exclusivamente el bucket productos. No toca las tablas públicas.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- La lectura de las URL públicas no requiere una política SELECT.
-- Esta barrera restrictiva impide que otras políticas permisivas den acceso
-- de escritura a personas que no estén en administradores, incluso con sesión.
-- No cambia el acceso de otros buckets.
drop policy if exists "productos storage solo administradores" on storage.objects;
create policy "productos storage solo administradores"
on storage.objects as restrictive for all to anon, authenticated
using (
  bucket_id <> 'productos' or exists (
    select 1 from public.administradores where user_id = (select auth.uid())
  )
)
with check (
  bucket_id <> 'productos' or exists (
    select 1 from public.administradores where user_id = (select auth.uid())
  )
);

drop policy if exists "productos storage subir fotos" on storage.objects;
create policy "productos storage subir fotos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'productos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and exists (
    select 1 from public.administradores where user_id = (select auth.uid())
  )
);

-- No se otorgan nuevos permisos UPDATE/DELETE: cada foto tiene un nombre nuevo.
commit;
