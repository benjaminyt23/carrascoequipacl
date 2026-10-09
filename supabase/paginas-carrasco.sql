-- Ejecutar DESPUÉS de sitio-editable.sql y diseno-premium.sql.
-- Conserva productos, bloques_sitio, menu_sitio, usuarios y sus políticas.
begin;
create table if not exists public.paginas (
  id uuid primary key default gen_random_uuid(), nombre text not null check(length(trim(nombre)) between 1 and 120),
  slug text not null, padre_id uuid references public.paginas(id) on delete restrict,
  sistema text not null default 'personalizada' check(sistema in ('inicio','productos','personalizada')),
  orden integer not null default 0, en_menu boolean not null default true,
  nombre_menu text not null default '' check(length(nombre_menu)<=120), icono text not null default '' check(length(icono)<=12),
  nueva_pestana boolean not null default false, publicada boolean not null default false,
  revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check((sistema='inicio' and slug='' and padre_id is null) or
    (sistema='productos' and slug='productos' and padre_id is null) or
    (sistema='personalizada' and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=80 and slug not in ('admin','producto','vista-previa','index','assets')))
);
create unique index if not exists paginas_slug_padre on public.paginas(coalesce(padre_id,'00000000-0000-0000-0000-000000000000'::uuid),slug);
create table if not exists public.bloques_pagina (
  id uuid primary key default gen_random_uuid(), pagina_id uuid not null references public.paginas(id) on delete cascade,
  tipo text not null, orden integer not null default 0, datos jsonb not null default '{}' check(jsonb_typeof(datos)='object')
);
create index if not exists bloques_pagina_orden on public.bloques_pagina(pagina_id,orden);
-- Esta tabla contiene SOLO la última versión publicada. Nunca contiene borradores.
create table if not exists public.paginas_publicadas (
  id uuid primary key references public.paginas(id) on delete cascade, nombre text not null,
  slug text not null, ruta text not null unique, padre_id uuid references public.paginas_publicadas(id) on delete restrict,
  sistema text not null, orden integer not null, en_menu boolean not null, nombre_menu text not null,
  icono text not null, nueva_pestana boolean not null, visible boolean not null default true,
  bloques jsonb not null default '[]' check(jsonb_typeof(bloques)='array'), published_at timestamptz not null default now()
);

create or replace function public.cms_es_admin() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.administradores where user_id=auth.uid()); $$;
revoke all on function public.cms_es_admin() from public, anon;
grant execute on function public.cms_es_admin() to authenticated;

create or replace function public.cms_pagina_visible(p_id uuid) returns boolean language sql stable security definer set search_path=public
as $$
  with recursive cadena as (
    select id,padre_id,visible,array[id] camino,false ciclo from public.paginas_publicadas where id=p_id
    union all select p.id,p.padre_id,p.visible,c.camino||p.id,p.id=any(c.camino)
    from public.paginas_publicadas p join cadena c on p.id=c.padre_id where not c.ciclo
  ) select exists(select 1 from cadena) and not exists(select 1 from cadena where not visible or ciclo)
    and exists(select 1 from cadena where padre_id is null);
$$;
revoke all on function public.cms_pagina_visible(uuid) from public;
grant execute on function public.cms_pagina_visible(uuid) to anon,authenticated;

-- Serializa cambios de árbol para impedir ciclos incluso entre operaciones concurrentes.
create or replace function public.cms_validar_padre() returns trigger language plpgsql set search_path=public as $$
declare actual uuid; nivel integer:=0;
begin
  perform pg_advisory_xact_lock(8173401);
  actual:=new.padre_id;
  while actual is not null loop
    if actual=new.id or nivel>=6 then raise exception 'Página padre inválida: ciclo o más de seis niveles.'; end if;
    select padre_id into actual from public.paginas where id=actual;
    nivel:=nivel+1;
  end loop;
  if exists(with recursive hijos as (select id,1 profundidad from public.paginas where padre_id=new.id union all select p.id,h.profundidad+1 from public.paginas p join hijos h on p.padre_id=h.id) select 1 from hijos where profundidad+nivel>6) then raise exception 'La reorganización supera seis niveles de subpáginas.'; end if;
  if tg_op='UPDATE' and new.sistema<>old.sistema then raise exception 'No se puede cambiar el tipo de una página existente.'; end if;
  return new;
end; $$;
drop trigger if exists cms_padre on public.paginas;
create trigger cms_padre before insert or update on public.paginas for each row execute function public.cms_validar_padre();

alter table public.paginas enable row level security;
alter table public.bloques_pagina enable row level security;
alter table public.paginas_publicadas enable row level security;
revoke all on public.paginas,public.bloques_pagina from anon;
grant select,insert,update,delete on public.paginas,public.bloques_pagina to authenticated;
grant select on public.paginas_publicadas to anon,authenticated;
revoke insert,update,delete on public.paginas_publicadas from anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['paginas','bloques_pagina'] loop
    execute format('drop policy if exists "cms solo administradores" on public.%I',t);
    execute format('create policy "cms solo administradores" on public.%I for all to authenticated using (public.cms_es_admin()) with check (public.cms_es_admin())',t);
  end loop;
end $$;
drop policy if exists "cms publico" on public.paginas_publicadas;
create policy "cms publico" on public.paginas_publicadas for select to anon using(public.cms_pagina_visible(id));
drop policy if exists "cms lectura autenticada" on public.paginas_publicadas;
create policy "cms lectura autenticada" on public.paginas_publicadas for select to authenticated using(public.cms_es_admin() or public.cms_pagina_visible(id));

create or replace function public.cms_guardar_pagina(pagina jsonb,bloques jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare p_id uuid:=(pagina->>'id')::uuid; actual public.paginas; b jsonb;
begin
  if not public.cms_es_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(8173401);
  if jsonb_typeof(bloques)<>'array' or jsonb_array_length(bloques)>200 then raise exception 'Máximo 200 bloques por página.'; end if;
  select * into actual from public.paginas where id=p_id for update;
  if found and actual.revision<>coalesce((pagina->>'revision')::integer,0) then raise exception 'Esta página cambió en otra sesión. Vuelve a cargarla antes de guardar.'; end if;
  if not found and coalesce(pagina->>'sistema','personalizada')<>'personalizada' then raise exception 'Las páginas de sistema ya están creadas.'; end if;
  insert into public.paginas(id,nombre,slug,padre_id,sistema,orden,en_menu,nombre_menu,icono,nueva_pestana)
  values(p_id,pagina->>'nombre',pagina->>'slug',nullif(pagina->>'padre_id','')::uuid,coalesce(pagina->>'sistema','personalizada'),coalesce((pagina->>'orden')::integer,0),coalesce((pagina->>'en_menu')::boolean,false),coalesce(pagina->>'nombre_menu',''),coalesce(pagina->>'icono',''),coalesce((pagina->>'nueva_pestana')::boolean,false))
  on conflict(id) do update set nombre=excluded.nombre,slug=excluded.slug,padre_id=excluded.padre_id,orden=excluded.orden,en_menu=excluded.en_menu,nombre_menu=excluded.nombre_menu,icono=excluded.icono,nueva_pestana=excluded.nueva_pestana,revision=paginas.revision+1,updated_at=now();
  delete from public.bloques_pagina where pagina_id=p_id;
  for b in select value from jsonb_array_elements(bloques) loop
    if coalesce(b->>'tipo','')='' or jsonb_typeof(b)<>'object' then raise exception 'Bloque inválido.'; end if;
    insert into public.bloques_pagina(id,pagina_id,tipo,orden,datos) values((b->>'id')::uuid,p_id,b->>'tipo',(b->>'orden')::integer,b);
  end loop;
  return p_id;
end; $$;

create or replace function public.cms_publicar_pagina(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare p public.paginas; nueva_ruta text; lista jsonb; padre public.paginas_publicadas;
begin
  if not public.cms_es_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(8173401);
  select * into strict p from public.paginas where id=p_id for update;
  if p.padre_id is not null then
    select * into padre from public.paginas_publicadas where id=p.padre_id;
    if not found or not public.cms_pagina_visible(p.padre_id) then raise exception 'Publica primero la página padre y asegúrate de que sea visible.'; end if;
    if exists(select 1 from public.paginas d where d.id=p.padre_id and (d.slug<>padre.slug or d.padre_id is distinct from padre.padre_id)) then raise exception 'Publica primero los cambios de URL de la página padre.'; end if;
    if exists(with recursive hijos as (select id from public.paginas_publicadas where padre_id=p_id union all select pp.id from public.paginas_publicadas pp join hijos h on pp.padre_id=h.id) select 1 from hijos where id=p.padre_id) then raise exception 'Publica primero la reorganización de la página padre para evitar un ciclo.'; end if;
    nueva_ruta:=rtrim(padre.ruta,'/')||'/'||p.slug;
  else nueva_ruta:='/'||p.slug; end if;
  select coalesce(jsonb_agg(datos order by orden,id),'[]') into lista from public.bloques_pagina where pagina_id=p_id and coalesce((datos->>'visible')::boolean,false);
  insert into public.paginas_publicadas(id,nombre,slug,ruta,padre_id,sistema,orden,en_menu,nombre_menu,icono,nueva_pestana,visible,bloques)
  values(p.id,p.nombre,p.slug,nueva_ruta,p.padre_id,p.sistema,p.orden,p.en_menu,p.nombre_menu,p.icono,p.nueva_pestana,true,lista)
  on conflict(id) do update set nombre=excluded.nombre,slug=excluded.slug,ruta=excluded.ruta,padre_id=excluded.padre_id,sistema=excluded.sistema,orden=excluded.orden,en_menu=excluded.en_menu,nombre_menu=excluded.nombre_menu,icono=excluded.icono,nueva_pestana=excluded.nueva_pestana,visible=true,bloques=excluded.bloques,published_at=now();
  -- Al publicar un cambio de URL, conserva y actualiza las rutas de las subpáginas ya publicadas.
  with recursive descendientes as (
    select pp.id,rtrim(nueva_ruta,'/')||'/'||pp.slug ruta from public.paginas_publicadas pp where pp.padre_id=p_id
    union all select pp.id,rtrim(d.ruta,'/')||'/'||pp.slug from public.paginas_publicadas pp join descendientes d on pp.padre_id=d.id
  ) update public.paginas_publicadas pp set ruta=d.ruta from descendientes d where pp.id=d.id;
  update public.paginas set publicada=true where id=p_id;
end; $$;

create or replace function public.cms_ocultar_pagina(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.cms_es_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(8173401);
  update public.paginas_publicadas set visible=false where id=p_id;
  update public.paginas set publicada=false where id=p_id;
end; $$;

create or replace function public.cms_duplicar_pagina(p_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare original public.paginas; nuevo uuid:=gen_random_uuid(); b record; nuevo_b uuid;
begin
  if not public.cms_es_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(8173401);
  select * into strict original from public.paginas where id=p_id;
  insert into public.paginas(id,nombre,slug,padre_id,orden,en_menu,nombre_menu,icono)
  values(nuevo,left(original.nombre||' (copia)',120),left(coalesce(nullif(original.slug,''),'inicio'),60)||'-copia-'||left(nuevo::text,8),original.padre_id,original.orden+1,false,original.nombre_menu,original.icono);
  for b in select * from public.bloques_pagina where pagina_id=p_id loop
    nuevo_b:=gen_random_uuid();insert into public.bloques_pagina(id,pagina_id,tipo,orden,datos) values(nuevo_b,nuevo,b.tipo,b.orden,jsonb_set(b.datos,'{id}',to_jsonb(nuevo_b::text)));
  end loop;
  return nuevo;
end; $$;

-- Los RPC de escritura nunca están disponibles para anon.
revoke all on function public.cms_guardar_pagina(jsonb,jsonb),public.cms_publicar_pagina(uuid),public.cms_ocultar_pagina(uuid),public.cms_duplicar_pagina(uuid) from public,anon;
grant execute on function public.cms_guardar_pagina(jsonb,jsonb),public.cms_publicar_pagina(uuid),public.cms_ocultar_pagina(uuid),public.cms_duplicar_pagina(uuid) to authenticated;

-- Estructura inicial: sin precios, promociones, testimonios ni compatibilidades ficticias.
do $$ declare home uuid; catalogo uuid; nuevo uuid; b record; datos jsonb; n integer:=0; begin
  insert into public.paginas(id,nombre,slug,sistema,orden,en_menu) values('00000000-0000-4000-8000-000000000101','Inicio','','inicio',0,true) on conflict do nothing returning id into home;
  insert into public.paginas(id,nombre,slug,sistema,orden,en_menu) values('00000000-0000-4000-8000-000000000102','Productos','productos','productos',1,true) on conflict do nothing returning id into catalogo;
  if home is not null then
    for datos in select value from jsonb_array_elements('[
      {"tipo":"hero_sitio","titulo":"","ancla":"portada-carrasco"},
      {"tipo":"categorias","titulo":"Encuentra tu próximo accesorio","subtitulo":"EXPLORA / EQUIPAMIENTO","ancla":"categorias-carrasco"},
      {"tipo":"destacados_auto","titulo":"Productos destacados","ancla":"destacados-carrasco","boton_texto":"Ver todos los productos","boton_enlace":"/productos"},
      {"tipo":"imagen_texto","titulo":"Tu próximo proyecto empieza aquí.","subtitulo":"INSTALACIÓN / PERSONALIZACIÓN","descripcion":"Cuéntanos qué quieres instalar y consulta las opciones para tu vehículo.","ancla":"instalacion-carrasco","boton_texto":"Consultar instalación","boton_enlace":"#contacto-carrasco","diseno":{"degradado":"claro","padding":64}},
      {"tipo":"marcas","titulo":"Marcas compatibles","descripcion":"Consulta la compatibilidad específica indicada en cada producto.","ancla":"marcas-carrasco"},
      {"tipo":"banner","titulo":"Hazlo tuyo.","subtitulo":"CARRASCO / EQUIPAMIENTO","descripcion":"Explora accesorios y prepara tu próximo proyecto.","ancla":"banner-carrasco","boton_texto":"Explorar productos","boton_enlace":"/productos","diseno":{"degradado":"rojo","padding":64}},
      {"tipo":"texto","titulo":"Quiénes somos","descripcion":"Edita esta sección para contar la historia de tu negocio.","ancla":"nosotros-carrasco"},
      {"tipo":"ubicacion","titulo":"Visítanos","ancla":"ubicacion-carrasco"},
      {"tipo":"contacto","titulo":"Hablemos de tu vehículo.","ancla":"contacto-carrasco"}
    ]'::jsonb) loop
      nuevo:=gen_random_uuid();datos:=datos||jsonb_build_object('id',nuevo,'orden',n,'visible',true,'galeria','[]'::jsonb,'productos_ids','[]'::jsonb,'opciones',jsonb_build_object('items','[]'::jsonb,'animacion','fade_up'));
      insert into public.bloques_pagina values(nuevo,home,datos->>'tipo',n,datos);n:=n+1;
    end loop;
    for b in select * from public.bloques_sitio where tipo not in ('destacados','categoria') order by orden,id loop
      nuevo:=gen_random_uuid();datos:=to_jsonb(b)||jsonb_build_object('id',nuevo,'orden',n);
      insert into public.bloques_pagina values(nuevo,home,b.tipo,n,datos);n:=n+1;
    end loop;
  end if;
  if catalogo is not null then
    nuevo:=gen_random_uuid();insert into public.bloques_pagina values(nuevo,catalogo,'catalogo',0,jsonb_build_object('id',nuevo,'tipo','catalogo','titulo','Nuestro catálogo','ancla','catalogo-carrasco','orden',0,'visible',true));
    for b in select * from public.bloques_sitio where tipo in ('destacados','categoria') order by orden,id loop
      nuevo:=gen_random_uuid();datos:=to_jsonb(b)||jsonb_build_object('id',nuevo,'orden',b.orden+1);
      insert into public.bloques_pagina values(nuevo,catalogo,b.tipo,b.orden+1,datos);
    end loop;
  end if;
  -- Semillas publicadas una única vez. No se necesita una sesión Auth en SQL Editor.
  insert into public.paginas_publicadas(id,nombre,slug,ruta,padre_id,sistema,orden,en_menu,nombre_menu,icono,nueva_pestana,bloques)
  select p.id,p.nombre,p.slug,'/'||p.slug,p.padre_id,p.sistema,p.orden,p.en_menu,p.nombre_menu,p.icono,p.nueva_pestana,
    coalesce((select jsonb_agg(bp.datos order by bp.orden,bp.id) from public.bloques_pagina bp where bp.pagina_id=p.id and coalesce((bp.datos->>'visible')::boolean,false)),'[]')
  from public.paginas p where p.id in (home,catalogo) on conflict do nothing;
  update public.paginas set publicada=true where id in (home,catalogo);
end $$;

-- Identidad solicitada. La paleta anterior queda respaldada; el contenido se conserva.
update public.configuracion_sitio set
  visual=visual||jsonb_build_object('paleta_anterior',jsonb_build_object('color_principal',color_principal,'color_secundario',color_secundario,'color_fondo',color_fondo,'color_texto',color_texto,'color_botones',color_botones,'color_tarjetas',color_tarjetas,'color_encabezado',color_encabezado,'color_pie',color_pie),'identidad','carrasco-rojo','hero_color','#111216','degradado_color','#191b20','botones_efecto','brillo','intro_activa',true),
  color_principal='#f14545',color_secundario='#ff6464',color_fondo='#101114',color_texto='#f4f4f5',color_botones='#d92d36',color_tarjetas='#1b1d22',color_encabezado='#101114',color_pie='#15161a'
where id=1 and not (visual ? 'paleta_anterior');
notify pgrst,'reload schema';
commit;
