-- Ejecutar DESPUÉS de sitio-editable.sql. No borra ni actualiza datos existentes.
begin;
alter table public.configuracion_sitio add column if not exists visual jsonb not null default '{}';
alter table public.bloques_sitio add column if not exists opciones jsonb not null default '{}';
alter table public.bloques_sitio drop constraint if exists bloques_sitio_tipo_check;
alter table public.bloques_sitio add constraint bloques_sitio_tipo_check check (tipo in (
  'texto','imagen_texto','banner','accion','contacto','ubicacion','galeria','destacados','personalizada',
  'hero','texto_imagen','video','carrusel','antes_despues','testimonios','estadisticas',
  'marcas','logos','faq','mapa','whatsapp','fondo_imagen','fondo_video','parallax','animada','iconos','categoria'
));

alter table public.productos add column if not exists slug text;
alter table public.productos add column if not exists categoria text not null default '';
alter table public.productos add column if not exists galeria text[] not null default '{}';
alter table public.productos add column if not exists badges text[] not null default '{}';
create unique index if not exists productos_slug_unico on public.productos (slug) where slug is not null;

-- Reordenación atómica: no deja órdenes a medias por fallos de red.
-- SECURITY INVOKER respeta las políticas existentes; no cambia RLS.
create or replace function public.ordenar_bloques_sitio(ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.administradores where user_id = auth.uid()) then
    raise exception 'Solo administradores' using errcode = '42501';
  end if;
  if cardinality(ids) <> (select count(*) from public.bloques_sitio)
     or cardinality(ids) <> (select count(distinct x) from unnest(ids) as x)
     or exists (select 1 from unnest(ids) as x where not exists (select 1 from public.bloques_sitio b where b.id = x)) then
    raise exception 'Los bloques cambiaron. Actualiza el panel y vuelve a ordenar.';
  end if;
  update public.bloques_sitio b set orden = lista.posicion - 1
    from unnest(ids) with ordinality as lista(id, posicion) where b.id = lista.id;
end;
$$;
revoke all on function public.ordenar_bloques_sitio(uuid[]) from public, anon;
grant execute on function public.ordenar_bloques_sitio(uuid[]) to authenticated;
commit;
