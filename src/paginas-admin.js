import { escapar as e } from './sitio-datos.js';
import { TIPOS_PAGINA, ANIMACIONES_BLOQUE, validarPagina, validarBloquePagina, rutaPagina, leerTablaPaginas, PALETA_CARRASCO, paginasVisibles } from './paginas-datos.js';
import { subirFoto } from './fotos.js';

const tiposImagen=['hero','imagen','imagen_texto','texto_imagen','banner','accion','fondo_imagen','parallax','animada','personalizada','antes_despues'];
const tiposGaleria=['galeria','carrusel','logos'];
const ayudas={testimonios:'Nombre | Testimonio real autorizado',estadisticas:'Valor real | Descripción',faq:'Pregunta | Respuesta',comparacion:'Símbolo | Característica | Descripción',iconos:'Símbolo | Título | Descripción',marcas:'Una marca con compatibilidad comprobada por línea',logos:'Un nombre por línea, en el orden de las imágenes',galeria:'Un título por línea, en el orden de las imágenes',carrusel:'Un título por línea, en el orden de las imágenes'};
const input=(nombre,label,tipo='text',extra='')=>`<label>${label}<input name="${nombre}" type="${tipo}" ${extra}></label>`;
const area=(nombre,label)=>`<label class="ancho">${label}<textarea name="${nombre}" rows="3"></textarea></label>`;
const select=(nombre,label,opciones)=>`<label>${label}<select name="${nombre}">${opciones.map(([valor,texto])=>`<option value="${e(valor)}">${e(texto)}</option>`).join('')}</select></label>`;
const dispositivo=(id)=>`<div class="cms-preview-card"><h3>Vista previa · Cambios sin publicar</h3><div class="cms-dispositivos" role="group" aria-label="Tamaño de vista previa">${[['escritorio','Escritorio'],['tablet','Tablet'],['celular','Celular']].map(([d,l])=>`<button type="button" class="secundario" data-device="${d}" data-frame="${id}" aria-pressed="${d==='escritorio'}">${l}</button>`).join('')}<button type="button" class="secundario" data-replay>Probar animaciones ↗</button></div><div class="cms-preview-stage"><div class="cms-preview-dispositivo" data-device="escritorio"><iframe id="${id}" src="/vista-previa.html" title="Vista previa de página" sandbox="allow-scripts allow-same-origin"></iframe></div></div><p class="cms-preview-note">Se actualiza al editar. Los enlaces externos y formularios no envían información. Escritorio 1200 px · Tablet 768 px · Celular 390 px.</p><p class="cms-preview-error" role="status"></p></div>`;

export function crearAdminPaginas({raiz,cliente,esAdmin,obtenerProductos,obtenerSitioBorrador}) {
  let paginas=[],publicadas=[],bloquesTodos=[],actual=null,bloques=[],ocupado=false,listo=false,arrastrado=null,temporizador=null,sucio=false;
  raiz.innerHTML=`<section data-pane="paginas" hidden class="panel"><div class="cms-cabecera"><div><h2>Páginas</h2><p>Crea páginas y subpáginas. Guarda un borrador, revisa y publica cuando esté listo.</p></div><button type="button" class="primario" data-cms="nueva">Crear página</button></div><p id="cms-aviso" role="status"></p><div id="cms-lista" class="cms-paginas-lista"></div><div class="cms-editor-layout" id="cms-editor" hidden><div><h3 id="cms-titulo">Editor de página</h3><form id="cms-meta" class="cms-editor-meta"><fieldset class="form-grid">${input('nombre','Nombre de la página')}${input('slug','URL: solo el último segmento (ej. multimedia)')}${select('padre_id','Página padre',[['','Sin página padre']])}${input('orden','Orden de página','number','step="1"')}${input('nombre_menu','Nombre visible en el menú (opcional)')}${input('icono','Icono opcional (emoji o símbolo)','text','maxlength="12"')}<label><input type="checkbox" name="en_menu"> Mostrar en el menú</label><label><input type="checkbox" name="nueva_pestana"> Abrir en nueva pestaña</label></fieldset></form><p class="cms-url" id="cms-ruta"></p><div class="cms-acciones"><button class="primario" type="button" data-cms="guardar">Guardar borrador</button><button class="primario" type="button" data-cms="publicar">Guardar y publicar</button><button class="secundario" type="button" data-cms="recargar">Descartar cambios / recargar</button></div><p class="cms-ayuda">Guardar borrador no cambia la página pública. Publicar actualiza su contenido y menú. Publica primero la página padre. La configuración general del sitio conserva sus botones Guardar independientes.</p><div class="cms-cabecera"><h3>Bloques de esta página</h3><button type="button" class="secundario" data-cms="bloque-nuevo">Agregar bloque</button></div><div id="cms-bloques" class="cms-bloques-lista"></div></div>${dispositivo('cms-frame-editor')}</div></section>
  <section data-pane="vista" hidden class="panel cms-preview-full"><h2>Vista previa</h2><label>Página a visualizar<select id="cms-preview-pagina"></select></label><p class="cms-ayuda">Visualiza borradores guardados y cambios locales del editor. El público sigue viendo la última versión publicada.</p>${dispositivo('cms-frame-vista')}</section>
  <dialog id="cms-bloque-dialog" class="cms-bloque-dialog"><form id="cms-bloque-form"><div class="dialog-header"><h2>Editar bloque</h2><button type="button" class="secundario" data-cms="bloque-cerrar">Cerrar</button></div><fieldset><div class="form-grid">${select('tipo','Tipo de bloque',Object.entries(TIPOS_PAGINA))}${input('ancla','Identificador de sección (minúsculas y guiones)')}${input('titulo','Título')}${input('subtitulo','Subtítulo')}${area('descripcion','Descripción')}<label><input name="visible" type="checkbox"> Visible</label><div class="ancho" data-tipos="imagen">${input('imagen','Imagen (URL)','url')}<button type="button" class="secundario" data-upload="imagen">Subir imagen</button></div><div data-tipos="boton">${input('boton_texto','Texto del botón')}${input('boton_enlace','Enlace del botón (URL, ruta o #seccion)')}</div><div class="ancho" data-tipos="galeria">${area('galeria','Imágenes (una URL por línea)')}<button type="button" class="secundario" data-upload="galeria">Añadir imagen</button></div><div data-tipos="video">${input('video_url','Video: URL directa MP4 / WEBM','url')}</div><div data-tipos="despues">${input('imagen_despues','Imagen después (URL)','url')}<button type="button" class="secundario" data-upload="imagen_despues">Subir imagen después</button></div><div data-tipos="categoria">${input('categoria','Categoría exacta del producto')}</div><div class="ancho" data-tipos="items">${area('items','Contenido: una fila por línea')}<small id="cms-items-ayuda"></small></div><div class="ancho" data-tipos="productos"><p>Selecciona productos reales. En Inicio solo se muestran los marcados Destacado.</p><div id="cms-productos-seleccion"></div></div></div>
  <details open><summary>Diseño y animación del bloque</summary><div class="form-grid">${select('animacion','Entrada',ANIMACIONES_BLOQUE.map(x=>[x,x]))}${select('estilo','Superficie',[['normal','Normal'],['oscuro','Oscuro'],['glass','Transparencia']])}${select('ancho','Ancho',[['normal','Normal'],['amplio','Amplio'],['completo','Completo']])}${select('alineacion','Alineación',[['izquierda','Izquierda'],['centro','Centro'],['derecha','Derecha']])}${select('degradado','Fondo con degradado',[['ninguno','Sin degradado'],['grafito','Grafito'],['rojo','Rojo'],['claro','Blanco / gris']])}${select('sombra','Sombra',[['ninguna','Ninguna'],['suave','Suave'],['profunda','Profunda']])}${input('padding','Espacio interior (px, vacío usa el diseño)','number','min="0" max="160"')}${input('margin','Espacio exterior (px)','number','min="0" max="100"')}${input('altura','Altura mínima (px, 0 automática)','number','min="0" max="1000"')}${input('radio','Bordes redondeados (px)','number','min="0" max="60"')}<div data-tipos="columnas">${input('columnas','Columnas en escritorio','number','min="1" max="4"')}</div>${['fondo','color','borde'].map(k=>`<label><input type="checkbox" name="usar_${k}"> Personalizar ${k}<input name="${k}" type="color" value="${k==='color'?'#f4f4f5':'#1b1d22'}"></label>`).join('')}</div></details><input type="file" id="cms-archivo" accept=".jpg,.jpeg,.png,.webp" hidden><p class="cms-ayuda">Los colores personalizados se aplican al marcar su casilla. Los tamaños se adaptan al celular. Vista previa refleja este bloque antes de guardarlo.</p></fieldset><p id="cms-bloque-error" role="status"></p><div class="dialog-footer"><button type="button" class="secundario" data-replay>Probar animación en vista previa</button><button class="primario" type="submit">Aplicar al borrador</button></div></form></dialog>`;
  const $=id=>raiz.querySelector('#'+id);
  const previewBloque=document.createElement('div');previewBloque.innerHTML=dispositivo('cms-frame-bloque');
  $('cms-bloque-form').insertBefore(previewBloque,$('cms-bloque-form').querySelector('.dialog-footer'));
  const frames=()=>[$('cms-frame-editor'),$('cms-frame-vista'),$('cms-frame-bloque')];
  function aviso(texto,error=false) {$('cms-aviso').textContent=texto;$('cms-aviso').className=error?'error':'cms-ayuda';}
  function valores(form) {const datos=Object.fromEntries(new FormData(form));form.querySelectorAll('input[type=checkbox][name]').forEach(i=>datos[i.name]=i.checked);return datos;}
  function meta() {if(!actual) throw new Error('Selecciona una página.');return {...validarPagina({...actual,...valores($('cms-meta'))},paginas),revision:actual.revision};}
  function snapshot() {
    const p=meta();let lista=structuredClone(bloques);
    if($('cms-bloque-dialog').open) {const b=leerBloque();lista=lista.filter(x=>x.id!==b.id).concat(b);}
    const anclas=lista.map(b=>b.ancla);if(new Set(anclas).size!==anclas.length) throw new Error('Cada bloque necesita un identificador de sección diferente.');
    const menu=paginas.map(x=>x.id===p.id?p:x).map(x=>({...x,visible:true,ruta:rutaPagina(x,paginas.map(f=>f.id===p.id?p:f))}));
    return {pagina:{...p,ruta:rutaPagina(p,paginas),bloques:lista},paginas:menu};
  }
  function enviarPreview(animar=false) {
    if(!actual||!esAdmin()) return;
    try {
      const estado=snapshot(),sitio=obtenerSitioBorrador();
      if(!sitio) return;
      const foco=$('cms-bloque-dialog').open ? $('cms-bloque-form').elements.ancla.value : '';
      frames().forEach(f=>{if(f.dataset.ready==='true') f.contentWindow.postMessage({tipo:'carrasco-preview',...estado,sitio,animar,foco,productos:obtenerProductos().map(({codigo,...p})=>p)},window.location.origin);});
      raiz.querySelectorAll('.cms-preview-error').forEach(p=>p.textContent='');
      $('cms-ruta').textContent='URL: '+estado.pagina.ruta;
    } catch(error) {raiz.querySelectorAll('.cms-preview-error').forEach(p=>p.textContent='Revisa el borrador: '+error.message);}
  }
  function programarPreview() {clearTimeout(temporizador);temporizador=setTimeout(()=>enviarPreview(false),250);}
  function dimensionar(frame) {
    const marco=frame.parentElement,stage=marco.parentElement,device=marco.dataset.device;
    const ancho=device==='celular'?416:device==='tablet'?770:1202;
    const escala=Math.min(1,(stage.clientWidth||800)/ancho);
    marco.style.width=ancho+'px';marco.style.transform=`scale(${escala})`;marco.style.left=Math.max(0,((stage.clientWidth||800)-ancho*escala)/2)+'px';
    stage.style.height=((device==='celular'?760:762)*escala+2)+'px';
  }
  const resize=new ResizeObserver(()=>frames().forEach(dimensionar));frames().forEach(f=>resize.observe(f.parentElement.parentElement));
  window.addEventListener('message',event=>{
    if(event.origin!==window.location.origin||event.data?.tipo!=='carrasco-preview-lista') return;
    const frame=frames().find(f=>f.contentWindow===event.source);if(frame) {frame.dataset.ready='true';enviarPreview(false);}
  });
  function pintarLista() {
    const visibles=new Set(paginasVisibles(publicadas).map(p=>p.id));
    $('cms-lista').innerHTML=paginas.slice().sort((a,b)=>a.orden-b.orden).map(p=>{
      const publicada=publicadas.find(x=>x.id===p.id);
      const estado=visibles.has(p.id)?'Publicada':publicada?.visible?'Oculta por página padre':publicada?'Oculta':'Borrador';
      return `<article class="cms-pagina-fila"><div><strong>${e(p.nombre)}</strong><small>${e(rutaPagina(p,paginas))} · ${estado} · Orden ${p.orden}${publicada&&new Date(p.updated_at)>new Date(publicada.published_at)?' · Borrador pendiente':''}</small>${p.sistema==='inicio'?'<small>Página del sistema: Inicio es la entrada principal de la web y no puede eliminarse.</small>':p.sistema==='productos'?'<small>Página visual eliminable. El catálogo independiente seguirá disponible en /productos; no se borran productos.</small>':''}</div><div class="acciones"><button class="secundario" type="button" data-edit-page="${p.id}">Editar</button><button class="secundario" type="button" data-copy-page="${p.id}">Duplicar</button>${publicada?.visible?`<button class="secundario" type="button" data-hide-page="${p.id}">Ocultar</button>`:''}${p.sistema!=='inicio'?`<button class="eliminar" type="button" data-delete-page="${p.id}">Eliminar</button>`:''}</div></article>`;
    }).join('')||'<p>No hay páginas. Ejecuta paginas-carrasco.sql.</p>';
    $('cms-preview-pagina').innerHTML=paginas.map(p=>`<option value="${p.id}">${e(p.nombre)} · ${e(rutaPagina(p,paginas))}</option>`).join('');
    if(actual) $('cms-preview-pagina').value=actual.id;
  }
  function pintarBloques() {
    $('cms-bloques').innerHTML=bloques.slice().sort((a,b)=>a.orden-b.orden).map((b,i)=>`<article class="cms-bloque-fila" draggable="true" data-bloque-id="${b.id}"><div><strong>${i+1}. ${e(b.titulo||TIPOS_PAGINA[b.tipo])}</strong><small>${e(TIPOS_PAGINA[b.tipo])} · ${b.visible?'Visible':'Oculto'}</small></div><div class="acciones"><button type="button" class="secundario" data-move-block="-1" data-id="${b.id}" aria-label="Mover bloque arriba">↑</button><button type="button" class="secundario" data-move-block="1" data-id="${b.id}" aria-label="Mover bloque abajo">↓</button><button type="button" class="secundario" data-edit-block="${b.id}">Editar</button><button type="button" class="secundario" data-copy-block="${b.id}">Duplicar</button><button type="button" class="eliminar" data-delete-block="${b.id}">Quitar</button></div></article>`).join('');
  }
  function seleccionar(id,preservar=false) {
    if(sucio&&!preservar&&!confirm('Hay cambios locales sin guardar. ¿Descartarlos para abrir otra página?')) return;
    actual=structuredClone(paginas.find(p=>p.id===id));if(!actual) return;
    bloques=bloquesTodos.filter(b=>b.pagina_id===id).map(b=>({...b.datos,id:b.id,tipo:b.tipo,orden:b.orden}));
    const form=$('cms-meta');form.reset();
    form.elements.padre_id.innerHTML='<option value="">Sin página padre</option>'+paginas.filter(p=>p.id!==id).map(p=>`<option value="${p.id}">${e(p.nombre)} · ${e(rutaPagina(p,paginas))}</option>`).join('');
    for(const campo of ['nombre','slug','padre_id','orden','nombre_menu','icono']) form.elements[campo].value=actual[campo]??'';
    for(const campo of ['en_menu','nueva_pestana']) form.elements[campo].checked=actual[campo];
    form.elements.slug.disabled=actual.sistema!=='personalizada';form.elements.padre_id.disabled=actual.sistema!=='personalizada';
    $('cms-editor').hidden=false;$('cms-titulo').textContent='Editar: '+actual.nombre;$('cms-preview-pagina').value=id;
    sucio=false;pintarBloques();enviarPreview(false);frames().forEach(dimensionar);
  }
  async function cargar(id=actual?.id) {
    const [p,b,pub]=await Promise.all([leerTablaPaginas(cliente,'paginas'),leerTablaPaginas(cliente,'bloques_pagina'),leerTablaPaginas(cliente,'paginas_publicadas')]);
    if(!esAdmin()) return;
    paginas=p;bloquesTodos=b;publicadas=pub;pintarLista();seleccionar(paginas.find(x=>x.id===id)?.id||paginas[0]?.id,true);listo=true;
  }
  async function operar(fn) {
    if(ocupado||!esAdmin()) return;
    ocupado=true;raiz.querySelectorAll('button').forEach(b=>b.disabled=true);
    try {await fn();} catch(error) {aviso(error.code==='23503'?'Esta página tiene subpáginas. Muévelas a otro padre y publica esos cambios antes de eliminarla.':error.code==='23505'?'Ya existe una página con esa URL. Cambia el segmento de URL y vuelve a intentarlo.':error.message||'No se pudo guardar. Revisa tu conexión y permisos.',true);}
    finally {ocupado=false;raiz.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  async function guardar(publicar=false) {
    const estado=snapshot();
    const lista=estado.pagina.bloques.map((b,n)=>validarBloquePagina({...b,orden:n}));
    await operar(async()=>{
      const {error}=await cliente.rpc('cms_guardar_pagina',{pagina:estado.pagina,bloques:lista});if(error) throw error;
      sucio=false;
      // Si publicar falla, el borrador está guardado y se informa explícitamente.
      await cargar(estado.pagina.id);
      if(publicar) {const {error}=await cliente.rpc('cms_publicar_pagina',{p_id:estado.pagina.id});if(error) throw new Error('Borrador guardado. No se pudo publicar: '+error.message);await cargar(estado.pagina.id);}
      aviso(publicar?'Página publicada. Recarga la web pública para verla.':'Borrador guardado. La página pública conserva la última versión publicada.');
    });
  }
  let bloqueEditado=null,campoUpload=null;
  function mostrarCampos() {
    const tipo=$('cms-bloque-form').elements.tipo.value;
    for(const k of ['titulo','subtitulo','descripcion']) $('cms-bloque-form').elements[k].closest('label').hidden=['hero_sitio','separador','espaciador'].includes(tipo);
    const condiciones={imagen:tiposImagen.includes(tipo),boton:!['separador','espaciador','hero_sitio','catalogo','formulario'].includes(tipo),galeria:tiposGaleria.includes(tipo),video:['video','fondo_video'].includes(tipo),despues:tipo==='antes_despues',categoria:tipo==='categoria',items:!!ayudas[tipo],productos:tipo==='destacados',columnas:['galeria','logos','estadisticas','testimonios','iconos','comparacion','destacados','destacados_auto','categorias','categoria'].includes(tipo)};
    raiz.querySelectorAll('[data-tipos]').forEach(el=>el.hidden=!condiciones[el.dataset.tipos]);$('cms-items-ayuda').textContent=ayudas[tipo]||'';
  }
  function abrirBloque(id=null) {
    if(!actual) return;
    const b=bloques.find(x=>x.id===id)||{id:crypto.randomUUID(),tipo:'texto',titulo:'',visible:true,ancla:'seccion-'+crypto.randomUUID().slice(0,8),orden:bloques.length,opciones:{},diseno:{}};
    bloqueEditado=b.id;const f=$('cms-bloque-form');f.reset();
    for(const k of ['tipo','ancla','titulo','subtitulo','descripcion','imagen','boton_texto','boton_enlace']) f.elements[k].value=b[k]||'';
    f.elements.visible.checked=b.visible;f.elements.galeria.value=(b.galeria||[]).join('\n');
    for(const k of ['video_url','imagen_despues','categoria','items','estilo','animacion']) f.elements[k].value=k==='items'?(b.opciones?.items||[]).join('\n'):b.opciones?.[k]||(k==='estilo'?'normal':k==='animacion'?'global':'');
    for(const k of ['padding','margin','altura','radio','columnas','ancho','alineacion','sombra','degradado']) f.elements[k].value=b.diseno?.[k]??({ancho:'normal',alineacion:'izquierda',sombra:'ninguna',degradado:'ninguno'}[k]||'');
    for(const k of ['fondo','color','borde']) {f.elements['usar_'+k].checked=!!b.diseno?.[k];if(b.diseno?.[k]) f.elements[k].value=b.diseno[k];}
    $('cms-productos-seleccion').innerHTML=obtenerProductos().map(p=>`<label><input type="checkbox" data-producto="${p.id}" ${(b.productos_ids||[]).includes(p.id)?'checked':''}>${e(p.nombre)} · ${e(p.vehiculo)}</label>`).join('');
    $('cms-bloque-error').textContent='';mostrarCampos();$('cms-bloque-dialog').showModal();enviarPreview(false);
  }
  function leerBloque() {
    const f=$('cms-bloque-form'),d=valores(f),diseno={};
    for(const k of ['padding','margin','altura','radio','columnas','ancho','alineacion','sombra','degradado']) diseno[k]=d[k];
    for(const k of ['fondo','color','borde']) if(d['usar_'+k]) diseno[k]=d[k];
    return validarBloquePagina({id:bloqueEditado,tipo:d.tipo,ancla:d.ancla,titulo:d.titulo,subtitulo:d.subtitulo,descripcion:d.descripcion,imagen:d.imagen,boton_texto:d.boton_texto,boton_enlace:d.boton_enlace,visible:d.visible,orden:bloques.find(b=>b.id===bloqueEditado)?.orden??bloques.length,galeria:d.galeria,productos_ids:[...f.querySelectorAll('[data-producto]:checked')].map(i=>i.dataset.producto),opciones:{video_url:d.video_url,imagen_despues:d.imagen_despues,categoria:d.categoria,estilo:d.estilo,animacion:d.animacion,items:d.items.split('\n').map(x=>x.trim()).filter(Boolean)},diseno});
  }
  function moverBloque(id,destino) {
    bloques.sort((a,b)=>a.orden-b.orden);const indice=bloques.findIndex(b=>b.id===id);
    if(indice<0||destino<0||destino>=bloques.length) return;
    bloques.splice(destino,0,bloques.splice(indice,1)[0]);bloques.forEach((b,n)=>b.orden=n);sucio=true;pintarBloques();enviarPreview(false);
  }
  raiz.addEventListener('click',async event=>{
    const boton=event.target.closest('button');if(!boton||ocupado||!esAdmin()) return;
    try {
      if(boton.dataset.device) {const frame=$(boton.dataset.frame);frame.parentElement.dataset.device=boton.dataset.device;boton.parentElement.querySelectorAll('[data-device]').forEach(b=>b.setAttribute('aria-pressed',String(b===boton)));dimensionar(frame);}
      if(boton.hasAttribute('data-replay')) {enviarPreview(true);if($('cms-bloque-dialog').open) previewBloque.scrollIntoView({block:'center'});return;}
      if(boton.dataset.editPage) seleccionar(boton.dataset.editPage);
      if(boton.dataset.copyPage) await operar(async()=>{const {data,error}=await cliente.rpc('cms_duplicar_pagina',{p_id:boton.dataset.copyPage});if(error) throw error;await cargar(data);aviso('Copia creada como borrador. Edita su URL y publícala cuando esté lista.');});
      if(boton.dataset.hidePage&&confirm('¿Ocultar esta página? Sus subpáginas también dejarán de ser públicas hasta volver a publicarla.')) await operar(async()=>{const {error}=await cliente.rpc('cms_ocultar_pagina',{p_id:boton.dataset.hidePage});if(error) throw error;await cargar();aviso('Página oculta.');});
      if(boton.dataset.deletePage) {
        const id=boton.dataset.deletePage,p=paginas.find(x=>x.id===id);
        if(!p||p.sistema==='inicio') return;
        if(paginas.some(x=>x.padre_id===id)||publicadas.some(x=>x.padre_id===id)) {aviso('Esta página tiene subpáginas. Muévelas a otro padre y publica esos cambios, o elimínalas primero. No se ha eliminado nada.',true);return;}
        const extra=p.sistema==='productos'?' El catálogo seguirá funcionando en /productos y no se borrará ningún producto.':'';
        if(!confirm(`¿Seguro que quieres eliminar la página “${p.nombre}” y sus bloques? Esta acción no se puede deshacer.${extra}`)) return;
        await operar(async()=>{
          if(!p.created_at) {paginas=paginas.filter(x=>x.id!==id);sucio=false;pintarLista();seleccionar(paginas[0]?.id,true);}
          else {
            const {error}=await cliente.rpc('cms_eliminar_pagina',{p_id:id});
            if(error?.code==='PGRST202'||error?.code==='42883') throw new Error('Falta activar la eliminación segura. Ejecuta supabase/eliminar-paginas.sql en SQL Editor y vuelve a intentarlo.');
            if(error) throw error;
            sucio=false;await cargar();
          }
          aviso('Página y bloques eliminados. Los productos del catálogo se conservan.'+extra);
        });
      }
      if(boton.dataset.cms==='nueva') {
        if(sucio&&!confirm('¿Descartar los cambios locales para crear una página?')) return;
        const p={id:crypto.randomUUID(),nombre:'Nueva página',slug:'nueva-pagina-'+crypto.randomUUID().slice(0,8),padre_id:null,sistema:'personalizada',orden:paginas.length,en_menu:true,nombre_menu:'',icono:'',nueva_pestana:false};paginas.push(p);sucio=false;pintarLista();seleccionar(p.id,true);sucio=true;aviso('Página nueva local. Guarda el borrador para conservarla en Supabase.');
      }
      if(boton.dataset.cms==='guardar') await guardar(false);
      if(boton.dataset.cms==='publicar') await guardar(true);
      if(boton.dataset.cms==='recargar'&&(!sucio||confirm('¿Descartar cambios locales y recargar el borrador guardado?'))) await operar(()=>cargar());
      if(boton.dataset.cms==='bloque-nuevo') abrirBloque();
      if(boton.dataset.cms==='bloque-cerrar') {$('cms-bloque-dialog').close();enviarPreview(false);}
      if(boton.dataset.editBlock) abrirBloque(boton.dataset.editBlock);
      if(boton.dataset.copyBlock) {const b=structuredClone(bloques.find(x=>x.id===boton.dataset.copyBlock));b.id=crypto.randomUUID();b.ancla=b.ancla.slice(0,70)+'-'+b.id.slice(0,8);b.orden=bloques.length;bloques.push(b);sucio=true;pintarBloques();enviarPreview(false);}
      if(boton.dataset.deleteBlock) {bloques=bloques.filter(x=>x.id!==boton.dataset.deleteBlock);sucio=true;pintarBloques();enviarPreview(false);}
      if(boton.dataset.moveBlock) moverBloque(boton.dataset.id,bloques.slice().sort((a,b)=>a.orden-b.orden).findIndex(b=>b.id===boton.dataset.id)+Number(boton.dataset.moveBlock));
      if(boton.dataset.upload) {campoUpload=boton.dataset.upload;$('cms-archivo').click();}
    } catch(error) {aviso(error.message,true);}
  });
  $('cms-meta').onsubmit=event=>event.preventDefault();
  $('cms-bloque-form').onsubmit=event=>{event.preventDefault();if(ocupado||!esAdmin()) return;try {const b=leerBloque();if(bloques.some(x=>x.id!==b.id&&x.ancla===b.ancla)) throw new Error('Ese identificador ya existe en otro bloque.');bloques=bloques.filter(x=>x.id!==b.id).concat(b);sucio=true;pintarBloques();$('cms-bloque-dialog').close();enviarPreview(false);} catch(error) {$('cms-bloque-error').textContent=error.message;}};
  $('cms-bloque-form').elements.tipo.onchange=mostrarCampos;
  raiz.addEventListener('input',event=>{if(event.target.closest('#cms-meta,#cms-bloque-form')) {sucio=true;programarPreview();}});
  raiz.addEventListener('change',event=>{if(event.target.closest('#cms-meta,#cms-bloque-form')) {sucio=true;programarPreview();}});
  $('cms-preview-pagina').onchange=event=>seleccionar(event.target.value);
  $('cms-archivo').onchange=async event=>{
    if(!event.target.files?.[0]||ocupado||!esAdmin()) return;
    await operar(async()=>{const url=await subirFoto(cliente,event.target.files[0]);const f=$('cms-bloque-form').elements[campoUpload];f.value=campoUpload==='galeria'?[f.value.trim(),url].filter(Boolean).join('\n'):url;sucio=true;enviarPreview(false);$('cms-bloque-error').textContent='Imagen subida. Aplica al borrador, guarda y publica para mostrarla.';});event.target.value='';
  };
  raiz.addEventListener('dragstart',event=>{const fila=event.target.closest('[data-bloque-id]');if(!fila||ocupado) return;arrastrado=fila.dataset.bloqueId;event.dataTransfer.setData('text/plain',arrastrado);fila.classList.add('arrastrando');});
  raiz.addEventListener('dragover',event=>{const fila=event.target.closest('[data-bloque-id]');if(fila&&arrastrado) {event.preventDefault();fila.classList.add('sobre');}});
  raiz.addEventListener('dragleave',event=>event.target.closest('[data-bloque-id]')?.classList.remove('sobre'));
  raiz.addEventListener('drop',event=>{const fila=event.target.closest('[data-bloque-id]');if(!fila||!arrastrado) return;event.preventDefault();moverBloque(arrastrado,bloques.slice().sort((a,b)=>a.orden-b.orden).findIndex(b=>b.id===fila.dataset.bloqueId));arrastrado=null;});
  raiz.addEventListener('dragend',()=>{arrastrado=null;raiz.querySelectorAll('[data-bloque-id]').forEach(f=>f.classList.remove('sobre','arrastrando'));});
  window.addEventListener('beforeunload',event=>{if(sucio&&esAdmin()) {event.preventDefault();event.returnValue='';}});
  $('cms-bloque-dialog').addEventListener('cancel',event=>{if(ocupado) event.preventDefault();else programarPreview();});
  return {
    async actualizarAcceso() {
      if(!esAdmin()) {listo=false;paginas=[];actual=null;bloques=[];sucio=false;$('cms-bloque-dialog').close();frames().forEach(f=>{f.dataset.ready='false';f.src='/vista-previa.html';});return;}
      if(!listo) try {await cargar();} catch(error) {aviso('Ejecuta supabase/paginas-carrasco.sql para activar Páginas y Vista previa. '+error.message,true);}
    },
    actualizarPreview:programarPreview,
    listo:()=>listo,
    refrescar:()=>cargar(),
    aplicarPaleta(form) {for(const [k,v] of Object.entries(PALETA_CARRASCO)) if(form.elements[k]) form.elements[k].value=v;form.dataset.sucio='true';programarPreview();},
  };
}
