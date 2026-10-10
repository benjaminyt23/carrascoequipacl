-- Ejecutar completo en Supabase > SQL Editor, después de paginas-carrasco.sql.
-- No elimina páginas al ejecutar la migración. No modifica productos ni políticas RLS.
begin;

-- Protege Inicio incluso ante un DELETE directo y limpia los enlaces internos
-- del menú adicional dentro de la misma transacción que elimina la página.
create or replace function public.cms_antes_eliminar_pagina()
returns trigger language plpgsql security definer set search_path=public as $$
declare ruta_borrador text; ruta_publicada text;
begin
  if not public.cms_es_admin() then
    raise exception 'Solo administradores pueden eliminar páginas.' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(8173401);
  if old.sistema='inicio' then
    raise exception 'Página del sistema: Inicio es la entrada principal de la web y no puede eliminarse.' using errcode='42501';
  end if;
  if exists(select 1 from public.paginas where padre_id=old.id)
     or exists(select 1 from public.paginas_publicadas where padre_id=old.id) then
    raise exception 'Esta página tiene subpáginas. Muévelas y publica esos cambios, o elimínalas primero.' using errcode='23503';
  end if;
  with recursive padres as (
    select id,padre_id,slug,0 nivel from public.paginas where id=old.id
    union all select p.id,p.padre_id,p.slug,a.nivel+1
      from public.paginas p join padres a on p.id=a.padre_id
  ) select '/'||string_agg(slug,'/' order by nivel desc) filter(where slug<>'') into ruta_borrador from padres;
  select ruta into ruta_publicada from public.paginas_publicadas where id=old.id;
  delete from public.menu_sitio
    where rtrim(split_part(split_part(enlace,'#',1),'?',1),'/') in
      (rtrim(ruta_borrador,'/'),rtrim(ruta_publicada,'/'));
  -- FK ON DELETE CASCADE ya elimina bloques_pagina y paginas_publicadas.
  -- El menú automático deja de tener la página al desaparecer su publicación.
  return old;
end;
$$;
revoke all on function public.cms_antes_eliminar_pagina() from public,anon,authenticated;
drop trigger if exists cms_eliminar on public.paginas;
create trigger cms_eliminar before delete on public.paginas
  for each row execute function public.cms_antes_eliminar_pagina();

-- SECURITY INVOKER conserva las comprobaciones RLS actuales sobre paginas.
create or replace function public.cms_eliminar_pagina(p_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if not public.cms_es_admin() then
    raise exception 'Solo administradores pueden eliminar páginas.' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(8173401);
  delete from public.paginas where id=p_id;
  if not found then
    raise exception 'La página ya no existe. Actualiza la lista.' using errcode='P0002';
  end if;
end;
$$;
revoke all on function public.cms_eliminar_pagina(uuid) from public,anon;
grant execute on function public.cms_eliminar_pagina(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
