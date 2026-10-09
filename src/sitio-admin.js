import { cargarSitio, escapar as e, TIPOS_BLOQUE, COLORES, validarConfiguracion, validarBloque, validarMenu } from './sitio-datos.js';
import { subirFoto } from './fotos.js';
import { OPCIONES_VISUALES, visualConfig, validarVisual } from './visual.js';
import { crearAdminPaginas } from './paginas-admin.js';

const camposGenerales = {
  nombre_negocio: 'Nombre del negocio', lema: 'Lema / texto superior', texto_principal: 'Texto principal',
  texto_secundario: 'Texto secundario', titulo_catalogo: 'Título del catálogo', texto_catalogo_vacio: 'Mensaje cuando no hay productos',
  texto_pie: 'Texto del pie de página', logo: 'Logo (URL)', portada: 'Imagen principal de portada (URL)',
};
const camposContacto = {
  telefono: 'Teléfono', whatsapp: 'WhatsApp (código de país + número)', correo: 'Correo', direccion: 'Dirección', horario: 'Horario',
  instagram: 'Instagram (URL)', facebook: 'Facebook (URL)', tiktok: 'TikTok (URL, opcional)', mapa_url: 'URL del mapa / ubicación',
  titulo_contacto: 'Título de contacto', titulo_ubicacion: 'Título de ubicación', titulo_horarios: 'Título de horarios', titulo_redes: 'Título de redes sociales',
};
const camposBloque = { titulo: 'Título', subtitulo: 'Subtítulo', descripcion: 'Descripción', ancla: 'Identificador para el menú (ej. quienes-somos)', imagen: 'Imagen opcional (URL)', boton_texto: 'Texto del botón (opcional)', boton_enlace: 'Enlace del botón (URL o #contacto)', orden: 'Orden (menor número primero)' };
const urlCampos = ['logo','portada','instagram','facebook','tiktok','mapa_url','imagen'];
const areas = ['descripcion','texto_principal','texto_secundario','direccion','horario','texto_catalogo_vacio'];
function campo(clave, titulo, valor = '') {
  const tipo = clave.startsWith('color_') ? 'color' : clave === 'orden' ? 'number' : clave === 'correo' ? 'email' : urlCampos.includes(clave) ? 'url' : 'text';
  const entrada = areas.includes(clave) ? `<textarea name="${clave}" rows="3">${e(valor)}</textarea>` : `<input name="${clave}" type="${tipo}" value="${e(valor)}" ${tipo === 'number' ? 'step="1"' : ''}>`;
  const carga = ['logo','portada','imagen'].includes(clave) ? `<div class="subida-sitio"><button type="button" class="secundario" data-elegir-imagen="${clave}">Subir imagen</button><input type="file" data-media="${clave}" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden></div>` : '';
  return `<label>${titulo}${entrada}</label>${carga}`;
}
function valoresFormulario(form) {
  const datos = Object.fromEntries(new FormData(form));
  form.querySelectorAll('input[type="checkbox"][name]').forEach(input => { datos[input.name] = input.checked; });
  return datos;
}
function opcionesFormulario(campos, datos) {
  return Object.entries(campos).map(([clave,titulo]) => campo(clave,titulo,datos[clave])).join('');
}
function camposVisuales(grupo,config) {
  const v=visualConfig(config);
  return `<div class="editor-visual-grupo"><div class="form-grid">${Object.entries(OPCIONES_VISUALES[grupo]).map(([clave,c])=>{
    const nombre=`visual_${clave}`;
    const input=typeof c.default==='boolean' ? `<input type="checkbox" name="${nombre}" ${v[clave]?'checked':''}>`
      : c.options ? `<select name="${nombre}">${c.options.map(op=>`<option value="${op}" ${v[clave]===op?'selected':''}>${op}</option>`).join('')}</select>`
      : `<input name="${nombre}" type="${c.color?'color':c.url?'url':'min' in c?'number':'text'}" value="${e(v[clave])}" ${'min' in c?`min="${c.min}" max="${c.max}" step="${c.step}"`:''}>`;
    const carga=['hero_fondo','fondo_imagen'].includes(clave) ? `<div><button type="button" class="secundario" data-elegir-imagen="${nombre}">Subir imagen</button><input data-media="${nombre}" type="file" accept=".jpg,.jpeg,.png,.webp" hidden></div>`:'';
    // Los enlaces admiten anclas; URL de medios solo admite http/https al validar.
    return `<label>${c.label}${input.replace('type="url"','type="text"')}</label>${carga}`;
  }).join('')}</div></div>`;
}
const opcionesBloqueHtml = `<div class="opciones-bloque form-grid"><label>Estilo<select name="opcion_estilo"><option value="normal">Normal</option><option value="oscuro">Oscuro</option><option value="glass">Glass</option></select></label><label>Animación de entrada<select name="opcion_animacion">${['global','ninguno','fade','slide','zoom','reveal','blur'].map(x=>`<option>${x}</option>`).join('')}</select></label><label id="opcion-video">Video MP4 / WEBM (URL)<input name="opcion_video_url" type="url"></label><label id="opcion-despues">Imagen después (URL)<input name="opcion_imagen_despues" type="url"><button type="button" class="secundario" data-elegir-imagen="opcion_imagen_despues">Subir imagen después</button><input data-media="opcion_imagen_despues" type="file" accept=".jpg,.jpeg,.png,.webp" hidden></label><label id="opcion-categoria">Categoría exacta de productos<input name="opcion_categoria"></label><label id="opcion-items" class="ancho">Contenido (una fila por línea)<textarea name="opcion_items" rows="5"></textarea><small id="items-ayuda"></small></label></div>`;

export function crearAdminSitio({ cliente, esAdmin, obtenerProductos }) {
  const raiz = document.getElementById('admin-sitio');
  const catalogo = document.querySelector('.catalogo-publico');
  let sitio = null;
  let seleccionado = 'productos';
  let inicializado = false;
  let ocupado = false;
  let bloqueId = null;
  let menuId = null;
  let generacion = 0;
  let arrastrado = null;
  let gestorPaginas=null;
  const paneles = { productos: 'Productos', paginas:'Páginas', vista:'Vista previa', configuracion: 'Configuración del sitio', hero:'Hero / portada', apariencia: 'Apariencia', animaciones:'Animaciones e intro', bloques: 'Archivo de bloques', menu: 'Menú adicional', contacto: 'Contacto y ubicación' };
  raiz.innerHTML = `<div class="admin-barra"><nav aria-label="Secciones de administración">${Object.entries(paneles).map(([id,titulo]) => `<button class="secundario" data-panel="${id}">${titulo}</button>`).join('')}</nav><div id="admin-sesion"></div></div><div id="sitio-aviso" role="status" aria-live="polite" hidden></div><div class="admin-acciones"><button id="sitio-recargar" class="secundario">Actualizar configuración</button><button id="sitio-preview" class="secundario" disabled>Vista previa sin guardar</button><a class="secundario" href="/" target="_blank" rel="noopener">Abrir web pública</a></div><div id="sitio-paneles"></div>
    <dialog id="bloque-editor"><form id="bloque-form"><h2 id="bloque-editor-titulo">Crear bloque</h2><fieldset><label>Tipo<select name="tipo">${Object.entries(TIPOS_BLOQUE).map(([valor,titulo]) => `<option value="${valor}">${titulo}</option>`).join('')}</select></label><div class="form-grid">${opcionesFormulario(camposBloque,{ orden: 0 })}</div><label><input name="visible" type="checkbox" checked> Visible en la web</label><div id="galeria-campos"><label>Fotografías de galería (una URL por línea)<textarea name="galeria" rows="4"></textarea></label><div class="subida-sitio"><button type="button" class="secundario" data-elegir-imagen="galeria">Añadir foto a galería</button><input data-media="galeria" type="file" accept=".jpg,.jpeg,.png,.webp" hidden></div></div>${opcionesBloqueHtml}<div id="destacados-campos"><p>Selecciona los productos que quieres destacar. Sus datos se leen del catálogo.</p><div id="destacados-lista"></div></div></fieldset><p class="ayuda">El identificador crea el enlace #identificador. Usa letras minúsculas y guiones. Las secciones ocultas no aparecen en la web.</p><div class="dialog-footer"><button type="button" data-cancelar="bloque-editor" class="secundario">Cancelar</button><button type="button" data-preview class="secundario">Vista previa</button><button class="primario">Guardar bloque</button></div><p class="form-aviso" role="status"></p></form></dialog>
    <dialog id="menu-editor"><form id="menu-form"><h2>Opción del menú</h2><fieldset>${opcionesFormulario({ nombre:'Nombre', enlace:'Enlace (ej. #catalogo, #quienes-somos o https://…)', orden:'Orden' },{ orden:0 })}<label><input type="checkbox" name="visible" checked> Visible</label></fieldset><p class="ayuda" id="menu-anclas"></p><div class="dialog-footer"><button type="button" data-cancelar="menu-editor" class="secundario">Cancelar</button><button type="button" data-preview class="secundario">Vista previa</button><button class="primario">Guardar opción</button></div><p class="form-aviso" role="status"></p></form></dialog>
    <dialog id="sitio-preview-dialog" class="preview-dialog"><div class="dialog-header"><h2>Vista previa · Cambios sin guardar</h2><button type="button" id="preview-cerrar" class="secundario">Cerrar</button></div><label>Ancho de vista<select id="preview-ancho"><option value="100%">Escritorio</option><option value="768px">Tablet</option><option value="390px">Celular</option></select></label><iframe id="sitio-iframe" title="Vista previa de la página pública" sandbox="allow-same-origin allow-scripts"></iframe><small>Vista de contenido y colores. Vista local con animaciones. Los enlaces externos no se abren y no se guarda nada en Supabase.</small></dialog>`;
  const $ = id => document.getElementById(id);
  const panelPaginas=document.createElement('div');panelPaginas.id='cms-paneles';raiz.append(panelPaginas);
  gestorPaginas=crearAdminPaginas({raiz:panelPaginas,cliente,esAdmin,obtenerProductos,obtenerSitioBorrador:()=>{
    if(!sitio) return null;
    const borrador=structuredClone(sitio);
    raiz.querySelectorAll('form[data-config]').forEach(form=>Object.assign(borrador.config,datosConfiguracion(form,borrador.config.visual)));
    return borrador;
  }});
  $('admin-sesion').append(document.getElementById('salir'));
  function mensaje(texto, error = false) {
    $('sitio-aviso').hidden = !texto;
    $('sitio-aviso').className = `aviso ${error ? 'error' : 'exito'}`;
    $('sitio-aviso').textContent = texto;
  }
  function cambiarPanel(panel) {
    seleccionado = panel;
    catalogo.hidden = esAdmin() && panel !== 'productos';
    raiz.querySelectorAll('[data-panel]').forEach(b => { b.classList.toggle('activo', b.dataset.panel === panel); b.setAttribute('aria-pressed', String(b.dataset.panel === panel)); });
    raiz.querySelectorAll('[data-pane]').forEach(el => { el.hidden = el.dataset.pane !== panel; });
  }
  function crearFormulario(id, titulo, contenido) {
    return `<section data-pane="${id}" class="panel"><h2>${titulo}</h2><form data-config="${id}"><fieldset class="form-grid">${contenido}</fieldset><div class="dialog-footer"><button type="button" data-preview class="secundario">Vista previa</button><button class="primario">Guardar cambios</button></div><p class="form-aviso" role="status"></p></form></section>`;
  }
  function datosConfiguracion(form, baseVisual = sitio.config.visual) {
    const datos=valoresFormulario(form);
    const visual={};
    for(const clave of Object.keys(datos)) if(clave.startsWith('visual_')) { visual[clave.slice(7)]=datos[clave];delete datos[clave]; }
    if(Object.keys(visual).length) datos.visual={...(baseVisual??{}),...validarVisual(visual)};
    return validarConfiguracion(datos);
  }
  function pintar() {
    const { config, bloques, menu } = sitio;
    $('sitio-paneles').innerHTML = crearFormulario('configuracion','Configuración del sitio',opcionesFormulario(camposGenerales, config))
      + crearFormulario('hero','Hero / portada',camposVisuales('hero',config))
      + crearFormulario('apariencia','Apariencia','<div class="ancho"><button type="button" class="secundario" data-paleta-carrasco>Aplicar paleta Carrasco · Rojo / grafito / blanco</button><small>Revisa en Vista previa antes de guardar.</small></div>'+opcionesFormulario(COLORES, config)+camposVisuales('apariencia',config))
      + crearFormulario('animaciones','Animaciones e intro',camposVisuales('animaciones',config))
      + crearFormulario('contacto','Contacto y ubicación', opcionesFormulario(camposContacto, config) + ['contacto','ubicacion','horarios','redes'].map(clave => `<label><input type="checkbox" name="mostrar_${clave}" ${config[`mostrar_${clave}`] ? 'checked' : ''}> Mostrar ${clave}</label>`).join(''))
      + `<section data-pane="bloques" class="panel"><h2>Archivo de bloques anteriores</h2><p>La migración conserva estos originales y copia su contenido a Páginas. Una vez activado el constructor, edita las copias desde Páginas; este archivo no reemplaza las páginas publicadas.</p><button class="primario" data-nuevo="bloque">Crear bloque anterior</button><div class="lista-editor">${filas(bloques,'bloque')}</div></section>`
      + `<section data-pane="menu" class="panel"><h2>Menú adicional</h2><p>El menú principal se construye desde las páginas publicadas. Aquí se conservan enlaces adicionales a secciones o sitios externos. Inicio y Productos se obtienen automáticamente de Páginas.</p><button class="primario" data-nuevo="menu">Agregar opción</button><div class="lista-editor">${filas(menu,'menu')}</div></section>`;
    cambiarPanel(seleccionado);
    $('sitio-preview').disabled = false;
  }
  function filas(datos, tipo) {
    return datos.slice().sort((a,b) => a.orden-b.orden || a.id.localeCompare(b.id)).map(fila => `<article class="fila-editor" draggable="${tipo === 'bloque'}" data-orden-id="${fila.id}"><div><strong>${e(tipo === 'bloque' ? fila.titulo || TIPOS_BLOQUE[fila.tipo] : fila.nombre)}</strong><small>Orden ${fila.orden} · ${fila.visible ? 'Visible' : 'Oculto'} · ${e(tipo === 'bloque' ? `#${fila.ancla}` : fila.enlace)}</small></div><div class="acciones">${tipo === 'bloque' ? `<div class="orden-botones"><button type="button" class="secundario" data-mover="-1" data-id="${fila.id}" aria-label="Mover bloque arriba">↑</button><button type="button" class="secundario" data-mover="1" data-id="${fila.id}" aria-label="Mover bloque abajo">↓</button></div>` : ''}<button class="secundario" data-editar-sitio="${tipo}" data-id="${fila.id}">Editar / ordenar</button><button class="secundario" data-visibilidad="${tipo}" data-id="${fila.id}">${fila.visible ? 'Ocultar' : 'Mostrar'}</button><button class="eliminar" data-borrar="${tipo}" data-id="${fila.id}">Eliminar</button></div></article>`).join('') || '<p>No hay opciones creadas.</p>';
  }
  async function refrescar(preservarBorradores = false) {
    const borradores = preservarBorradores ? [...raiz.querySelectorAll('form[data-config]')].filter(form => form.dataset.sucio === 'true').map(form => ({ panel: form.dataset.config, datos: valoresFormulario(form) })) : [];
    const miGeneracion = ++generacion;
    const datos = await cargarSitio(cliente);
    if (miGeneracion !== generacion || !esAdmin()) return;
    sitio = datos;
    pintar();
    for (const { panel, datos } of borradores) {
      const form = raiz.querySelector(`form[data-config="${panel}"]`);
      for (const [clave,valor] of Object.entries(datos)) {
        if (typeof valor === 'boolean') form.elements[clave].checked = valor;
        else form.elements[clave].value = valor;
      }
      form.dataset.sucio = 'true';
    }
  }
  function bloquesOrdenados() { return sitio.bloques.slice().sort((a,b)=>a.orden-b.orden || a.id.localeCompare(b.id)); }
  async function moverBloque(id,destino) {
    if(ocupado || !esAdmin()) return;
    const ids=bloquesOrdenados().map(b=>b.id);
    const indice=ids.indexOf(id);
    if(indice<0 || destino<0 || destino>=ids.length || indice===destino) return;
    ids.splice(destino,0,ids.splice(indice,1)[0]);
    await operacion(null,async()=> {
      const {error}=await cliente.rpc('ordenar_bloques_sitio',{ids});
      if(error) throw error;
    });
  }
  async function operacion(form, tarea, escritura = true) {
    if (ocupado || !esAdmin()) return;
    ocupado = true;
    const aviso = form?.querySelector('.form-aviso');
    let guardado = false;
    if (aviso) aviso.textContent = 'Guardando…';
    if (form) form.querySelector('fieldset').disabled = true;
    raiz.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      // La tarea recibió los valores antes de deshabilitar el formulario.
      await tarea();
      guardado = escritura;
      if (form?.dataset.config) form.dataset.sucio = 'false';
      await refrescar(true);
      mensaje(escritura ? 'Cambios guardados en Supabase. Recarga la web pública para verlos.' : 'Configuración actualizada desde Supabase.');
      if (aviso) aviso.textContent = 'Guardado.';
      if (form?.closest('dialog')) form.closest('dialog').close();
    } catch (error) {
      const texto = (guardado ? 'El cambio se guardó, pero no se pudo recargar la configuración: ' : '') + (error.message || 'Revisa conexión y permisos.');
      mensaje(texto, true);
      if (aviso) aviso.textContent = texto;
    } finally {
      ocupado = false;
      if (form) form.querySelector('fieldset').disabled = false;
      raiz.querySelectorAll('button').forEach(b => { b.disabled = false; });
      $('sitio-preview').disabled = !sitio;
    }
  }
  function leerBloque() {
    const datos = valoresFormulario($('bloque-form'));
    datos.opciones={};
    for(const clave of Object.keys(datos)) if(clave.startsWith('opcion_')) { datos.opciones[clave.slice(7)]=datos[clave];delete datos[clave]; }
    datos.opciones.items=String(datos.opciones.items??'').split('\n').map(x=>x.trim()).filter(Boolean);
    datos.productos_ids = [...$('destacados-lista').querySelectorAll('input:checked')].map(input => input.value);
    return validarBloque(datos);
  }
  function mostrarCamposTipo() {
    const tipo = $('bloque-form').elements.tipo.value;
    $('galeria-campos').hidden = !['galeria','carrusel','logos'].includes(tipo);
    $('destacados-campos').hidden = tipo !== 'destacados';
    $('opcion-video').hidden=!['video','fondo_video'].includes(tipo);
    $('opcion-despues').hidden=tipo!=='antes_despues';
    $('opcion-categoria').hidden=tipo!=='categoria';
    const ayudas={testimonios:'Nombre | Testimonio (solo testimonios reales y autorizados)',estadisticas:'Valor | Descripción (solo cifras reales)',faq:'Pregunta | Respuesta',iconos:'Símbolo o emoji | Título | Descripción',marcas:'Una marca por línea (solo compatibilidades verificadas)',logos:'Nombre por línea, en el mismo orden que las imágenes',galeria:'Título por línea, en el mismo orden que las imágenes',carrusel:'Título por línea, en el mismo orden que las imágenes'};
    $('opcion-items').hidden=!ayudas[tipo];
    $('items-ayuda').textContent=ayudas[tipo]??'';
  }
  function abrirBloque(id = null) {
    bloqueId = id;
    const bloque = sitio.bloques.find(b => b.id === id) ?? { tipo:'texto', orden: sitio.bloques.length, visible:true, ancla: `seccion-${crypto.randomUUID().slice(0,8)}` };
    const form = $('bloque-form');
    form.reset();
    for (const clave of ['tipo', ...Object.keys(camposBloque)]) form.elements[clave].value = bloque[clave] ?? '';
    form.elements.visible.checked = bloque.visible;
    form.elements.galeria.value = (bloque.galeria ?? []).join('\n');
    for(const clave of ['video_url','imagen_despues','categoria','estilo','animacion','items']) form.elements[`opcion_${clave}`].value = clave==='items' ? (bloque.opciones?.items??[]).join('\n') : bloque.opciones?.[clave]??(clave==='estilo'?'normal':clave==='animacion'?'global':'');
    $('destacados-lista').innerHTML = obtenerProductos().map(p => `<label><input type="checkbox" value="${e(p.id)}" ${(bloque.productos_ids ?? []).includes(p.id) ? 'checked' : ''}>${e(p.nombre)} · ${e(p.vehiculo)}${p.codigo ? ` · ${e(p.codigo)}` : ''}</label>`).join('') || '<p>Agrega productos en el catálogo antes de destacar alguno.</p>';
    form.querySelector('.form-aviso').textContent = '';
    $('bloque-editor-titulo').textContent = id ? 'Editar bloque' : 'Crear bloque';
    mostrarCamposTipo();
    $('bloque-editor').showModal();
  }
  function abrirMenu(id = null) {
    menuId = id;
    const fila = sitio.menu.find(m => m.id === id) ?? { orden: sitio.menu.length, visible:true };
    const form = $('menu-form');
    form.reset();
    for (const clave of ['nombre','enlace','orden']) form.elements[clave].value = fila[clave] ?? '';
    form.elements.visible.checked = fila.visible;
    form.querySelector('.form-aviso').textContent = '';
    $('menu-anclas').textContent = `Enlaces disponibles: #inicio, #catalogo; #contacto, #ubicacion, #horarios, #redes si están configurados y visibles; ${sitio.bloques.map(b => `#${b.ancla}`).join(', ')}.`;
    $('menu-editor').showModal();
  }
  function preview() {
    if (!sitio || ocupado || !esAdmin()) return;
    if(gestorPaginas?.listo()&&!$('bloque-editor').open&&!$('menu-editor').open) {cambiarPanel('vista');gestorPaginas.actualizarPreview();return;}
    try {
      const borrador = structuredClone(sitio);
      // Combina cambios de las tres secciones sin escribirlos en Supabase.
      raiz.querySelectorAll('form[data-config]').forEach(form => { Object.assign(borrador.config, datosConfiguracion(form,borrador.config.visual)); });
      if ($('bloque-editor').open) {
        const bloque = { ...leerBloque(), id: bloqueId || 'nuevo-bloque' };
        borrador.bloques = borrador.bloques.filter(b => b.id !== bloqueId).concat(bloque);
      }
      if ($('menu-editor').open) borrador.menu = borrador.menu.filter(m => m.id !== menuId).concat({ ...validarMenu(valoresFormulario($('menu-form'))), id: menuId || 'nuevo-menu' });
      const frame=$('sitio-iframe');
      frame.removeAttribute('srcdoc');
      const catalogo=$('bloque-editor').open && ['destacados','categoria'].includes($('bloque-form').elements.tipo.value);
      frame.onload=()=>frame.contentWindow.postMessage({tipo:'carrasco-preview',catalogo,sitio:borrador,productos:obtenerProductos().map(({codigo,...p})=>p)},window.location.origin);
      frame.src='/vista-previa.html';
      $('sitio-preview-dialog').showModal();
    } catch (error) {
      mensaje(`Revisa el borrador: ${error.message}`, true);
      const form = $('bloque-editor').open ? $('bloque-form') : $('menu-editor').open ? $('menu-form') : null;
      if (form) form.querySelector('.form-aviso').textContent = error.message;
    }
  }
  raiz.addEventListener('click', async event => {
    const boton = event.target.closest('button');
    if (!boton || ocupado || !esAdmin()) return;
    if (boton.dataset.panel) {
      if (boton.dataset.panel !== seleccionado && [...raiz.querySelectorAll('form[data-config]')].some(f => f.dataset.sucio === 'true') && !confirm('Hay cambios sin guardar. ¿Cambiar de sección? Tus cambios permanecerán en el formulario hasta guardar o actualizar.')) return;
      cambiarPanel(boton.dataset.panel);
    }
    if ('preview' in boton.dataset) preview();
    if(boton.hasAttribute('data-paleta-carrasco')) gestorPaginas.aplicarPaleta(boton.closest('form'));
    if (boton.dataset.elegirImagen) boton.closest('form').querySelector(`input[data-media="${boton.dataset.elegirImagen}"]`).click();
    if (boton.dataset.cancelar) $(boton.dataset.cancelar).close();
    if (boton.dataset.nuevo === 'bloque') abrirBloque();
    if (boton.dataset.nuevo === 'menu') abrirMenu();
    if (boton.dataset.editarSitio === 'bloque') abrirBloque(boton.dataset.id);
    if (boton.dataset.editarSitio === 'menu') abrirMenu(boton.dataset.id);
    if(boton.dataset.mover) await moverBloque(boton.dataset.id,bloquesOrdenados().findIndex(b=>b.id===boton.dataset.id)+Number(boton.dataset.mover));
    if (boton.dataset.borrar || boton.dataset.visibilidad) {
      const tipo = boton.dataset.borrar || boton.dataset.visibilidad;
      const tabla = tipo === 'bloque' ? 'bloques_sitio' : 'menu_sitio';
      const fila = (tipo === 'bloque' ? sitio.bloques : sitio.menu).find(f => f.id === boton.dataset.id);
      if (boton.dataset.borrar && !confirm('¿Eliminar esta opción? No se puede deshacer.')) return;
      await operacion(null, async () => {
        const consulta = boton.dataset.borrar ? cliente.from(tabla).delete().eq('id',fila.id) : cliente.from(tabla).update({ visible: !fila.visible }).eq('id',fila.id);
        const { error } = await consulta.select('id').single();
        if (error) throw error;
      });
    }
  });
  raiz.addEventListener('dragstart',event=> {
    const fila=event.target.closest('.fila-editor[draggable=true]');
    if(!fila || ocupado || !esAdmin()) { event.preventDefault();return; }
    arrastrado=fila.dataset.ordenId;fila.classList.add('arrastrando');event.dataTransfer.setData('text/plain',arrastrado);
  });
  raiz.addEventListener('dragover',event=> {
    const fila=event.target.closest('.fila-editor[draggable=true]');
    if(fila && arrastrado) {event.preventDefault();fila.classList.add('sobre-destino');}
  });
  raiz.addEventListener('dragleave',event=>event.target.closest('.fila-editor')?.classList.remove('sobre-destino'));
  raiz.addEventListener('drop',event=> {
    const fila=event.target.closest('.fila-editor[draggable=true]');
    if(!fila || !arrastrado) return;
    event.preventDefault();
    const destino=bloquesOrdenados().findIndex(b=>b.id===fila.dataset.ordenId);
    void moverBloque(arrastrado,destino);arrastrado=null;
    raiz.querySelectorAll('.fila-editor').forEach(f=>f.classList.remove('arrastrando','sobre-destino'));
  });
  raiz.addEventListener('dragend',()=>{arrastrado=null;raiz.querySelectorAll('.fila-editor').forEach(f=>f.classList.remove('arrastrando','sobre-destino'));});
  raiz.addEventListener('input', event => {
    const form = event.target.closest('form[data-config]');
    if (form) form.dataset.sucio = 'true';
    if(form) gestorPaginas.actualizarPreview();
  });
  raiz.addEventListener('change', async event => {
    const input = event.target;
    if (!input.dataset.media || !input.files?.[0] || ocupado || !esAdmin()) return;
    const form = input.closest('form');
    const fieldset = form.querySelector('fieldset');
    ocupado = true;
    fieldset.disabled = true;
    raiz.querySelectorAll('button').forEach(b => { b.disabled = true; });
    form.querySelector('.form-aviso').textContent = 'Subiendo imagen…';
    try {
      const url = await subirFoto(cliente, input.files[0]);
      const destino = form.elements[input.dataset.media];
      destino.value = input.dataset.media === 'galeria' ? [destino.value.trim(),url].filter(Boolean).join('\n') : url;
      form.dataset.sucio = 'true';
      form.querySelector('.form-aviso').textContent = 'Imagen subida. Guarda los cambios para publicarla; puedes verla con Vista previa.';
    } catch (error) { form.querySelector('.form-aviso').textContent = error.message; }
    finally {
      ocupado = false;
      fieldset.disabled = false;
      raiz.querySelectorAll('button').forEach(b => { b.disabled = false; });
      $('sitio-preview').disabled = !sitio;
      input.value = '';
      gestorPaginas.actualizarPreview();
    }
  });
  raiz.addEventListener('submit', event => {
    const form = event.target;
    if (!form.dataset.config) return;
    event.preventDefault();
    if (ocupado || !esAdmin()) return;
    try {
      const datos = datosConfiguracion(form);
      operacion(form, async () => {
        const { error } = await cliente.from('configuracion_sitio').update(datos).eq('id',1).select('id').single();
        if (error) throw error;
      });
    } catch (error) { form.querySelector('.form-aviso').textContent = error.message; }
  });
  $('bloque-form').elements.tipo.onchange = mostrarCamposTipo;
  $('bloque-form').onsubmit = event => {
    event.preventDefault();
    if (ocupado || !esAdmin()) return;
    try {
      const datos = leerBloque();
      operacion(event.target, async () => {
        const consulta = bloqueId ? cliente.from('bloques_sitio').update(datos).eq('id',bloqueId) : cliente.from('bloques_sitio').insert(datos);
        const { error } = await consulta.select('id').single();
        if (error) throw error;
      });
    } catch (error) { event.target.querySelector('.form-aviso').textContent = error.message; }
  };
  $('menu-form').onsubmit = event => {
    event.preventDefault();
    if (ocupado || !esAdmin()) return;
    try {
      const datos = validarMenu(valoresFormulario(event.target));
      operacion(event.target, async () => {
        const consulta = menuId ? cliente.from('menu_sitio').update(datos).eq('id',menuId) : cliente.from('menu_sitio').insert(datos);
        const { error } = await consulta.select('id').single();
        if (error) throw error;
      });
    } catch (error) { event.target.querySelector('.form-aviso').textContent = error.message; }
  };
  for (const id of ['bloque-editor','menu-editor']) $(id).addEventListener('cancel', event => { if (ocupado) event.preventDefault(); });
  $('sitio-preview').onclick = preview;
  $('preview-cerrar').onclick = () => $('sitio-preview-dialog').close();
  $('preview-ancho').onchange = event => { $('sitio-iframe').style.width = event.target.value; };
  $('sitio-recargar').onclick = () => {
    if (ocupado || !esAdmin()) return;
    if ([...raiz.querySelectorAll('form[data-config]')].some(f => f.dataset.sucio === 'true') && !confirm('¿Descartar los cambios sin guardar y cargar la configuración de Supabase?')) return;
    operacion(null, async () => { raiz.querySelectorAll('form[data-config]').forEach(form => { form.dataset.sucio = 'false'; }); }, false);
  };
  return {
    async actualizarAcceso() {
      raiz.hidden = !esAdmin();
      if (!esAdmin()) {
        generacion++;
        inicializado = false;
        sitio = null;
        catalogo.hidden = false;
        for (const id of ['bloque-editor','menu-editor','sitio-preview-dialog']) if ($(id).open) $(id).close();
        await gestorPaginas.actualizarAcceso();
        return;
      }
      if (!inicializado) {
        inicializado = true;
        try { await refrescar(); }
        catch { mensaje('No se pudo cargar el editor del sitio. Ejecuta supabase/sitio-editable.sql y pulsa Actualizar configuración. El catálogo sigue disponible.', true); }
      }
      cambiarPanel(seleccionado);
      await gestorPaginas.actualizarAcceso();
    },
  };
}
