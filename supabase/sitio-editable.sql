-- Ejecutar completo en SQL Editor. Requiere las tablas actuales del proyecto.
-- No modifica productos, administradores ni sus políticas existentes.
begin;

create table if not exists public.configuracion_sitio (
  id integer primary key default 1 check (id = 1),
  nombre_negocio text not null default 'CARRASCO EQUIPAMIENTO',
  texto_principal text not null default 'Productos para tu vehículo.',
  texto_secundario text not null default 'Encuentra accesorios, compatibilidad y detalles de instalación en un solo lugar.',
  lema text not null default 'EQUIPA TU PRÓXIMO CAMINO',
  titulo_catalogo text not null default 'Nuestro catálogo',
  texto_catalogo_vacio text not null default 'Todavía no hay productos registrados en Carrasco Equipamiento.',
  texto_pie text not null default 'CARRASCO EQUIPAMIENTO @2026',
  telefono text not null default '', whatsapp text not null default '',
  correo text not null default '', direccion text not null default '',
  horario text not null default '', instagram text not null default '',
  facebook text not null default '', tiktok text not null default '',
  mapa_url text not null default '', logo text not null default '', portada text not null default '',
  titulo_contacto text not null default 'Contacto',
  titulo_ubicacion text not null default 'Ubicación',
  titulo_horarios text not null default 'Horarios',
  titulo_redes text not null default 'Redes sociales',
  mostrar_contacto boolean not null default true,
  mostrar_ubicacion boolean not null default true,
  mostrar_horarios boolean not null default true,
  mostrar_redes boolean not null default true,
  color_principal text not null default '#20352d' check (color_principal ~ '^#[0-9A-Fa-f]{6}$'),
  color_secundario text not null default '#637c58' check (color_secundario ~ '^#[0-9A-Fa-f]{6}$'),
  color_fondo text not null default '#f6f7f2' check (color_fondo ~ '^#[0-9A-Fa-f]{6}$'),
  color_texto text not null default '#20352d' check (color_texto ~ '^#[0-9A-Fa-f]{6}$'),
  color_botones text not null default '#274c38' check (color_botones ~ '^#[0-9A-Fa-f]{6}$'),
  color_tarjetas text not null default '#ffffff' check (color_tarjetas ~ '^#[0-9A-Fa-f]{6}$'),
  color_encabezado text not null default '#ffffff' check (color_encabezado ~ '^#[0-9A-Fa-f]{6}$'),
  color_pie text not null default '#f6f7f2' check (color_pie ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.bloques_sitio (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('texto','imagen_texto','banner','accion','contacto','ubicacion','galeria','destacados','personalizada')),
  titulo text not null default '', subtitulo text not null default '',
  descripcion text not null default '', imagen text not null default '',
  boton_texto text not null default '', boton_enlace text not null default '',
  ancla text not null unique check (ancla ~ '^[a-z][a-z0-9-]*$' and ancla not in ('inicio','catalogo','contacto','ubicacion','horarios','redes')),
  galeria text[] not null default '{}', productos_ids uuid[] not null default '{}',
  orden integer not null default 0, visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_sitio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  enlace text not null check (length(trim(enlace)) > 0),
  orden integer not null default 0, visible boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.configuracion_sitio (id) values (1) on conflict do nothing;
-- Semillas con UUID fijo: repetir este script no duplica opciones ni sobrescribe ediciones.
insert into public.menu_sitio (id, nombre, enlace, orden) values
  ('00000000-0000-4000-8000-000000000001','Inicio','#inicio',0),
  ('00000000-0000-4000-8000-000000000002','Productos','#catalogo',1)
on conflict do nothing;

alter table public.configuracion_sitio enable row level security;
alter table public.bloques_sitio enable row level security;
alter table public.menu_sitio enable row level security;

grant select on public.configuracion_sitio, public.bloques_sitio, public.menu_sitio to anon, authenticated;
grant insert, update, delete on public.configuracion_sitio, public.bloques_sitio, public.menu_sitio to authenticated;
revoke insert, update, delete on public.configuracion_sitio, public.bloques_sitio, public.menu_sitio from anon;

-- Crea políticas solamente para estas tres tablas nuevas.
do $$
declare tabla text;
begin
  foreach tabla in array array['configuracion_sitio','bloques_sitio','menu_sitio'] loop
    execute format('drop policy if exists "sitio lectura" on public.%I', tabla);
    execute format('drop policy if exists "sitio lectura autenticada" on public.%I', tabla);
    if tabla = 'configuracion_sitio' then
      execute format('create policy "sitio lectura" on public.%I for select to anon, authenticated using (true)', tabla);
    else
      -- anon no tiene SELECT sobre administradores: su política solo usa visible.
      execute format('create policy "sitio lectura" on public.%I for select to anon using (visible)', tabla);
      execute format('create policy "sitio lectura autenticada" on public.%I for select to authenticated using (visible or exists (select 1 from public.administradores where user_id = (select auth.uid())))', tabla);
    end if;
    execute format('drop policy if exists "sitio administradores" on public.%I', tabla);
    execute format('create policy "sitio administradores" on public.%I for all to authenticated using (exists (select 1 from public.administradores where user_id = (select auth.uid()))) with check (exists (select 1 from public.administradores where user_id = (select auth.uid())))', tabla);
  end loop;
end $$;
commit;
