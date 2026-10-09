import './style.css';
import './sitio.css';
import './premium.css';
import './identidad.css';
import { supabase } from './supabase.js';
import { buscarProductos, validarProducto, productosDestacados, filtrarCatalogo } from './productos.js';
import { subirFoto } from './fotos.js';
import { cargarSitio } from './sitio-datos.js';
import { aplicarSitio, renderTarjeta, renderProducto } from './sitio-render.js';
import { slugProducto } from './visual.js';
import { cargarPaginasPublicas } from './paginas-datos.js';

const app = document.querySelector('#app');
const dinero = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
let productos = [];
let administrador = false;
// La ruta decide la vista; no hay enlaces públicos hacia administración.
const modo = /^\/admin\/?$/.test(window.location.pathname) ? 'admin' : 'catalogo';
// El catálogo público solo se muestra cuando termina toda la carga inicial.
let loading = modo !== 'admin';
function mostrarAplicacion() {
  loading = false;
  document.documentElement.classList.remove('carga-inicial');
  document.getElementById('carga-inicial').hidden = true;
  app.removeAttribute('inert');
  app.setAttribute('aria-busy','false');
}
function mostrarErrorInicial() {
  const pantalla=document.getElementById('carga-inicial');
  pantalla.setAttribute('aria-busy','false');
  pantalla.querySelector('.carga-spinner').hidden=true;
  const mensaje=document.getElementById('carga-error');
  mensaje.textContent='No pudimos cargar la página. Comprueba tu conexión y vuelve a intentarlo.';
  mensaje.hidden=false;
  const reintentar=document.getElementById('carga-reintentar');
  reintentar.hidden=false;
  reintentar.onclick=()=>window.location.reload();
}
if (modo === 'admin') mostrarAplicacion();
const rutaProducto = window.location.pathname.match(/^\/producto\/([^/]+)\/?$/)?.[1];
const rutaCatalogo = /^\/productos\/?$/.test(window.location.pathname);
const esInicio = modo !== 'admin' && /^\/$/.test(window.location.pathname);
const rutaActual=window.location.pathname.replace(/\/$/,'')||'/';
const filtrosPublicos=modo!=='admin'&&!rutaProducto;
let paginasPublicas=null;
let categoriaInicial=new URLSearchParams(window.location.search).get('categoria')||'';
let cargaCorrecta = false;
let cargando = false;
let versionCarga = 0;
let guardando = false;
let subiendoFoto = false;
let editando = null;
let sitioPublico = null;
let gestorSitio = null;
const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);

app.innerHTML = `
  <header><a class="marca" href="/" aria-label="Carrasco Equipamiento, inicio"><span class="simbolo">CE</span><span>CARRASCO<span class="marca-sub">EQUIPAMIENTO</span></span></a><nav aria-label="Principal"><button id="catalogo" class="nav activo">Catálogo</button></nav></header>
  <main>
    <section class="intro"><div><span class="eyebrow">EQUIPA TU PRÓXIMO CAMINO</span><h1 id="titulo">Productos para tu vehículo.</h1><p id="subtitulo">Encuentra accesorios, compatibilidad y detalles de instalación en un solo lugar.</p></div></section>
    <div id="configuracion" class="aviso" hidden>Falta configurar Supabase. Copia <strong>.env.example</strong> como <strong>.env</strong>, completa las dos variables y reinicia el servidor. La guía está en README.md.</div>
    <div id="mensaje" role="status" aria-live="polite" hidden></div>
    ${modo === 'admin' ? `<section id="login" class="panel login" hidden><span class="eyebrow">ACCESO DE ADMINISTRACIÓN</span><h2>Ingresa a tu panel</h2><p>Usa la cuenta que configuraste en Supabase.</p><form id="login-form"><label>Correo<input name="email" type="email" autocomplete="username" required></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label><button class="primario" type="submit">Iniciar sesión</button></form></section>` : ''}
    ${modo === 'admin' ? '<section id="admin-sitio" hidden></section>' : ''}
    <section id="producto-pagina" hidden></section>
    <section class="catalogo-publico" id="catalogo-publico">
    <section id="herramientas" class="herramientas"><label class="busqueda"><span>Buscar productos</span><input id="buscar" type="search" placeholder="Busca por producto, vehículo o año…"></label><div class="acciones"><button id="recargar" class="secundario">Actualizar</button>${modo === 'admin' ? `<button id="nuevo" class="primario" hidden>＋ Agregar producto</button><button id="salir" class="secundario" hidden>Cerrar sesión</button>` : ''}</div></section>
    <div class="resumen"><h2 id="lista-titulo">Nuestro catálogo</h2><span id="contador"></span></div>
    ${filtrosPublicos ? '<div class="filtros-catalogo"><label>Categoría<select id="filtro-categoria"><option value="">Todas las categorías</option></select></label><label>Vehículo<select id="filtro-vehiculo"><option value="">Todos los vehículos</option></select></label><label>Estado<select id="filtro-estado"><option value="">Todos los productos</option><option value="disponible">Disponibles</option><option value="destacado">Destacados</option><option value="nuevo">Nuevos</option><option value="oferta">Ofertas</option></select></label><button type="button" id="limpiar-filtros" class="secundario">Limpiar filtros</button></div>' : ''}
    <section id="productos" class="grid" aria-label="Productos" aria-busy="false"></section>
    ${esInicio ? '<div class="catalogo-cta"><a class="primario" href="/productos">Ver todos los productos ↗</a></div>' : ''}
    </section>
    <div id="secciones-sitio"></div>
    <footer>CARRASCO EQUIPAMIENTO @2026</footer>
  </main>
  ${modo === 'admin' ? `<dialog id="editor"><form id="producto-form"><div class="dialog-header"><div><span class="eyebrow">ADMINISTRACIÓN</span><h2 id="editor-titulo">Agregar producto</h2></div><button type="button" id="cerrar" class="secundario" aria-label="Cerrar formulario">✕</button></div><div class="form-grid">
    <label class="ancho">Nombre del producto<input name="nombre" maxlength="200" required placeholder="Ej. Antivuelco"></label>
    <label class="ancho">Código / SKU interno (opcional)<input name="codigo" placeholder="Ej. AV-L200-001"><small>Referencia interna. No se muestra en el catálogo público.</small></label>
    <label>Enlace del producto (opcional)<input name="slug" placeholder="antivuelco-l200"><small>Minúsculas y guiones. Si está vacío se genera un enlace único.</small></label>
    <label>Categoría (opcional)<input name="categoria" placeholder="Ej. Protección"></label>
    <div class="ancho producto-etiquetas">${['destacado','nuevo','oferta'].map(b=>`<label><input type="checkbox" data-badge="${b}">${b[0].toUpperCase()+b.slice(1)}: sí / no</label>`).join('')}<small>Una casilla marcada significa Sí. Destacado muestra el producto en Inicio (máximo 8, primero los más recientes). Todos aparecen en /productos.</small></div>
    <label>Vehículo compatible<input name="vehiculo" maxlength="300" required placeholder="Ej. Mitsubishi L200"></label>
    <label>Años compatibles<input name="ano" maxlength="200" required placeholder="Ej. 2016–2024"></label>
    <label>Precio (CLP)<input name="precio" type="number" min="0" max="999999999999" step="1" required></label>
    <label>Stock (unidades)<input name="stock" type="number" min="0" max="2147483647" step="1" required></label>
    <label class="ancho">Descripción<textarea name="descripcion" rows="3" maxlength="5000" placeholder="Características del producto"></textarea></label>
    <label class="ancho">Instalación<textarea name="instalacion" rows="2" maxlength="3000" placeholder="Método de instalación y si está incluida en el precio"></textarea></label>
    <div class="ancho foto-controles"><input id="archivo-foto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden><button id="subir-foto" class="secundario" type="button">Subir foto</button><small>JPG, JPEG, PNG o WEBP · Máximo 5 MB.</small><p id="estado-foto" role="status" aria-live="polite"></p><img id="preview-foto" class="preview-foto" alt="Vista previa de la fotografía del producto" hidden></div>
    <label class="ancho">URL de fotografía (opcional)<input name="foto" type="url" placeholder="https://…"><small>Se completa al subir una foto. También puedes pegar una URL pública. Guarda el producto para aplicar el cambio.</small></label>
    <label class="ancho">Galería adicional (una URL por línea)<textarea name="galeria" rows="3"></textarea></label><div class="ancho"><button type="button" id="subir-galeria" class="secundario">Agregar fotos a galería</button><input id="archivo-galeria" type="file" accept=".jpg,.jpeg,.png,.webp" multiple hidden></div>
  </div><p id="error-form" class="error" role="alert" hidden></p><div class="dialog-footer"><button type="button" id="cancelar" class="secundario">Cancelar</button><button id="guardar" class="primario" type="submit">Guardar en Supabase</button></div></form></dialog>` : ''}`;

const $ = id => document.getElementById(id);
if(esInicio) $('herramientas').hidden=true;
if(esInicio) document.querySelector('.filtros-catalogo').hidden=true;
if(rutaCatalogo) document.querySelector('.intro').hidden=true;
if (rutaProducto) {
  document.querySelector('.intro').hidden=true;
  document.querySelector('.catalogo-publico').hidden=true;
  $('producto-pagina').hidden=false;
  $('producto-pagina').innerHTML='<div class="vacio"><h1>Cargando producto…</h1></div>';
}
function avisar(texto, error = false) {
  $('mensaje').hidden = !texto;
  $('mensaje').textContent = texto;
  $('mensaje').className = error ? 'aviso error' : 'aviso exito';
}
function explicarError(error) {
  if (error.code === '42501') return 'No tienes permiso para esta operación. Revisa la cuenta administradora y las políticas RLS en Supabase.';
  return error.message || 'No se pudo conectar a Supabase. Revisa tu conexión y configuración.';
}
function actualizarVista() {
  const admin = modo === 'admin';
  if (admin || !sitioPublico) {
    $('titulo').textContent = admin ? 'Tu catálogo, bajo control.' : 'Productos para tu vehículo.';
    $('subtitulo').textContent = admin ? 'Administra productos, precios y stock. Cada cambio se guarda en Supabase.' : 'Encuentra accesorios, compatibilidad y detalles de instalación en un solo lugar.';
    $('catalogo')?.classList.toggle('activo', !admin);
  }
  if (admin) {
    $('login').hidden = administrador || !supabase;
    $('nuevo').hidden = !administrador;
    $('salir').hidden = !administrador;
  }
  $('buscar').placeholder = admin && administrador ? 'Busca por código, producto, vehículo o año…' : 'Busca por producto, vehículo o año…';
  $('lista-titulo').textContent = esInicio ? 'Productos destacados' : admin && administrador ? 'Todos los productos' : sitioPublico?.config.titulo_catalogo ?? 'Nuestro catálogo';
  renderProductos();
  if (gestorSitio) void gestorSitio.actualizarAcceso();
}
function renderProductos() {
  if (loading) return;
  $('productos').setAttribute('aria-busy', String(cargando));
  if (cargando || !cargaCorrecta) {
    $('contador').textContent = '';
    $('productos').innerHTML = `<div class="vacio"><h3>${cargando ? 'Cargando productos…' : 'Catálogo pendiente de conexión'}</h3><p>${cargando ? 'Consultando Supabase.' : 'Los productos aparecerán cuando la conexión esté configurada y disponible.'}</p></div>`;
    return;
  }
  for (const [id,campo,titulo] of [['filtro-categoria','categoria','Todas las categorías'],['filtro-vehiculo','vehiculo','Todos los vehículos']]) {
    const select=$(id);
    if(!select) continue;
    const anterior=select.value;
    const valores=[...new Set(productos.map(p=>p[campo]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    select.innerHTML=`<option value="">${titulo}</option>`+valores.map(valor=>`<option value="${escapar(valor)}">${escapar(valor)}</option>`).join('');
    select.value=valores.includes(anterior) ? anterior : '';
    if(id==='filtro-categoria'&&categoriaInicial) {select.value=valores.includes(categoriaInicial)?categoriaInicial:'';categoriaInicial='';}
  }
  const resultado = esInicio ? productosDestacados(productos) : filtrosPublicos ? filtrarCatalogo(productos,{consulta:$('buscar').value,categoria:$('filtro-categoria').value,vehiculo:$('filtro-vehiculo').value,estado:$('filtro-estado').value}) : buscarProductos(productos, $('buscar').value, modo === 'admin' && administrador);
  $('contador').textContent = `${resultado.length} producto${resultado.length === 1 ? '' : 's'}`;
  $('productos').innerHTML = resultado.length ? resultado.map(producto => {
    if (modo !== 'admin') return renderTarjeta(producto, sitioPublico?.config ?? {});
    let fotoValida = false;
    try { fotoValida = ['http:', 'https:'].includes(new URL(producto.foto).protocol); } catch { /* Sin imagen válida */ }
    return `<article class="producto"><div class="foto">${fotoValida ? `<img src="${escapar(producto.foto)}" alt="${escapar(producto.nombre)}" loading="lazy" referrerpolicy="no-referrer">` : '<span class="sin-foto">CE<span>Sin fotografía</span></span>'}<span class="stock ${producto.stock > 0 ? '' : 'agotado'}">${producto.stock > 0 ? `${escapar(producto.stock)} disponibles` : 'Sin stock'}</span></div><div class="contenido"><span class="vehiculo">${escapar(producto.vehiculo)}</span><h3>${escapar(producto.nombre)}</h3><p class="anos">Años: ${escapar(producto.ano)}</p><p class="precio">${dinero.format(producto.precio)}</p><p class="descripcion">${escapar(producto.descripcion || 'Sin descripción registrada.')}</p><div class="instalacion"><strong>Instalación</strong><p>${escapar(producto.instalacion || 'Sin información registrada.')}</p></div>${modo === 'admin' && administrador ? `<p class="anos">Código / SKU: ${escapar(producto.codigo || 'Sin código')}</p><div class="producto-acciones"><button class="secundario" data-editar="${escapar(producto.id)}">Editar</button><button class="eliminar" data-eliminar="${escapar(producto.id)}">Eliminar</button></div>` : ''}</div></article>`;
  }).join('') : esInicio ? '<div class="vacio"><h3>Pronto encontrarás nuestros productos destacados aquí.</h3></div>' : `<div class="vacio"><h3>${productos.length ? 'No encontramos coincidencias' : 'Tu catálogo está listo para comenzar'}</h3><p>${productos.length ? 'Prueba con un vehículo como L200 o con el nombre del accesorio.' : escapar(sitioPublico?.config.texto_catalogo_vacio ?? 'Todavía no hay productos registrados en Carrasco Equipamiento.')}</p></div>`;
  $('productos').querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    img.replaceWith(Object.assign(document.createElement('span'), { className: 'sin-foto', textContent: 'Fotografía no disponible' }));
  }));
}
function actualizarPaginaProducto() {
  if (!rutaProducto) return;
  document.querySelector('.intro').hidden = true;
  document.querySelector('.catalogo-publico').hidden = true;
  const panel=$('producto-pagina');
  panel.hidden=false;
  const producto=productos.find(p=>slugProducto(p)===rutaProducto || p.id===rutaProducto);
  panel.innerHTML = producto ? renderProducto(producto,sitioPublico?.config ?? {},productos)
    : `<div class="vacio"><h1>${cargando || !cargaCorrecta ? 'Cargando producto…' : 'Producto no encontrado'}</h1><p>${cargaCorrecta ? 'El producto puede haberse eliminado o su enlace puede haber cambiado.' : 'Esperando la información del catálogo.'}</p><a href="/productos">Volver al catálogo</a></div>`;
}
function aplicarPaginaPublica() {
  actualizarPaginaProducto();
  if(sitioPublico) {
    aplicarSitio(sitioPublico,productos,{catalogo:rutaCatalogo,pagina:paginasPublicas?.find(p=>p.ruta===rutaActual),paginas:paginasPublicas,ruta:rutaActual});
    if(paginasPublicas===null&&!esInicio&&!rutaProducto&&!rutaCatalogo) {
      document.querySelector('.intro').hidden=true;document.querySelector('.catalogo-publico').hidden=true;$('secciones-sitio').hidden=true;
      $('producto-pagina').hidden=false;$('producto-pagina').innerHTML='<div class="vacio"><h1>Página no disponible</h1><a href="/">Volver al inicio</a></div>';
    }
    if(rutaProducto) {
      $('secciones-sitio').hidden=true;
      const p=productos.find(p=>slugProducto(p)===rutaProducto || p.id===rutaProducto);
      if(p) document.title=`${p.nombre} · ${sitioPublico.config.nombre_negocio}`;
    }
  }
}
async function cargarConfiguracionPublica() {
  if (!supabase || modo === 'admin') return;
  try {
    [sitioPublico,paginasPublicas] = await Promise.all([cargarSitio(supabase),cargarPaginasPublicas(supabase)]);
    if (!loading) { renderProductos(); aplicarPaginaPublica(); }
  } catch (error) {
    console.warn('No se pudo cargar la configuración visual del sitio:', error.message);
    if (loading) throw error;
    avisar('No se pudo actualizar la configuración del sitio. Intenta nuevamente.',true);
  }
}
// Pagina todas las filas para no perder productos después del límite de la API.
async function cargarProductos() {
  if (!supabase) return;
  const version = ++versionCarga;
  cargando = true;
  renderProductos();
  try {
    const filas = [];
    let leerExtras=true;
    const tamano = 500;
    for (let desde = 0; ; desde += tamano) {
      const columnas = modo === 'admin' && administrador ? '*' : 'id,nombre,vehiculo,ano,precio,descripcion,instalacion,stock,foto,created_at';
      const { data, error } = await supabase.from('productos').select(columnas).order('created_at', { ascending: false }).order('id').range(desde, desde + tamano - 1);
      if (error) throw error;
      if(modo !== 'admin' && leerExtras) {
        const extras=await supabase.from('productos').select('id,slug,categoria,galeria,badges').order('created_at',{ascending:false}).order('id').range(desde,desde+tamano-1);
        if(extras.error) { leerExtras=false;console.warn('Opciones visuales de productos pendientes: ejecuta diseno-premium.sql.'); }
        else { const indice=new Map(extras.data.map(p=>[p.id,p]));data.forEach(p=>Object.assign(p,indice.get(p.id)??{})); }
      }
      filas.push(...data);
      if (data.length < tamano) break;
    }
    if (version !== versionCarga) return;
    productos = filas;
    cargaCorrecta = true;
  } catch (error) {
    if (version !== versionCarga) return;
    productos = [];
    cargaCorrecta = false;
    avisar(`No se pudo cargar el catálogo: ${explicarError(error)}`, true);
    if (loading) throw error;
  } finally {
    if (version === versionCarga) { cargando = false; renderProductos(); }
    if (version === versionCarga && modo !== 'admin' && !loading) aplicarPaginaPublica();
  }
}
async function revisarAdministrador() {
  const { data: { session }, error } = await supabase.auth.getSession();
  administrador = false;
  if (error) avisar(explicarError(error), true);
  if (session) {
    const { data, error: permisoError } = await supabase.from('administradores').select('user_id').eq('user_id', session.user.id).maybeSingle();
    administrador = !!data && !permisoError;
    if (!administrador) {
      await supabase.auth.signOut();
      avisar('Esta cuenta no está autorizada. Agrega su UUID en la tabla administradores de Supabase.', true);
    }
  }
  actualizarVista();
}
function abrirEditor(producto = null) {
  if (!administrador || subiendoFoto || guardando) return;
  editando = producto?.id ?? null;
  $('producto-form').reset();
  for (const campo of ['nombre', 'codigo', 'slug', 'categoria', 'vehiculo', 'ano', 'precio', 'stock', 'descripcion', 'instalacion', 'foto']) {
    $('producto-form').elements[campo].value = producto?.[campo] ?? '';
  }
  $('producto-form').elements.galeria.value=(producto?.galeria??[]).join('\n');
  $('producto-form').querySelectorAll('[data-badge]').forEach(input=>{input.checked=(producto?.badges??[]).includes(input.dataset.badge);});
  $('editor-titulo').textContent = producto ? 'Editar producto' : 'Agregar producto';
  $('error-form').hidden = true;
  $('estado-foto').textContent = '';
  actualizarPreview();
  $('editor').showModal();
}
function actualizarPreview() {
  const imagen = $('preview-foto');
  const url = $('producto-form').elements.foto.value.trim();
  imagen.hidden = true;
  imagen.removeAttribute('src');
  try {
    if (!['http:', 'https:'].includes(new URL(url).protocol)) return;
    imagen.src = url;
    imagen.hidden = false;
  } catch { /* Campo vacío o URL incompleta */ }
}
$('catalogo').onclick = () => { window.location.href = '/productos'; };
$('buscar').oninput = renderProductos;
for(const id of ['filtro-categoria','filtro-vehiculo','filtro-estado']) if($(id)) $(id).onchange=renderProductos;
if($('limpiar-filtros')) $('limpiar-filtros').onclick=()=>{
  for(const id of ['buscar','filtro-categoria','filtro-vehiculo','filtro-estado']) $(id).value='';
  renderProductos();
};
$('recargar').onclick = () => { avisar(''); void Promise.allSettled([cargarProductos(), cargarConfiguracionPublica()]); };
if (modo === 'admin') {
$('subir-galeria').onclick=()=>{if(administrador && !guardando && !subiendoFoto) $('archivo-galeria').click();};
$('archivo-galeria').onchange=async event=> {
  if(subiendoFoto || guardando || !administrador) return;
  const archivos=[...event.target.files];
  if(!archivos.length) return;
  subiendoFoto=true;
  for(const id of ['subir-foto','subir-galeria','guardar','cerrar','cancelar','salir']) $(id).disabled=true;
  $('error-form').hidden=true;
  try {
    for(let n=0;n<archivos.length;n++) {
      $('estado-foto').textContent=`Subiendo foto ${n+1} de ${archivos.length}…`;
      const url=await subirFoto(supabase,archivos[n]);
      const campo=$('producto-form').elements.galeria;
      campo.value=[campo.value.trim(),url].filter(Boolean).join('\n');
    }
    $('estado-foto').textContent='Galería subida. Guarda el producto para publicarla.';
  } catch(error) { $('error-form').textContent=explicarError(error);$('error-form').hidden=false; }
  finally {subiendoFoto=false;event.target.value='';for(const id of ['subir-foto','subir-galeria','guardar','cerrar','cancelar','salir']) $(id).disabled=false;}
};
$('subir-foto').onclick = () => { if (administrador && !guardando && !subiendoFoto) $('archivo-foto').click(); };
$('producto-form').elements.foto.addEventListener('input', actualizarPreview);
$('preview-foto').onerror = () => {
  $('preview-foto').hidden = true;
  $('estado-foto').textContent = 'No se pudo mostrar la imagen. Revisa su URL y que el bucket sea público.';
};
$('archivo-foto').onchange = async event => {
  const archivo = event.target.files[0];
  if (!archivo || subiendoFoto || guardando || !administrador) return;
  subiendoFoto = true;
  for (const id of ['subir-foto', 'guardar', 'cerrar', 'cancelar', 'salir']) $(id).disabled = true;
  $('producto-form').elements.foto.disabled = true;
  $('error-form').hidden = true;
  $('estado-foto').textContent = 'Subiendo fotografía a Supabase…';
  try {
    const url = await subirFoto(supabase, archivo);
    $('producto-form').elements.foto.value = url;
    actualizarPreview();
    $('estado-foto').textContent = 'Foto subida. Pulsa “Guardar en Supabase” para asociarla al producto.';
  } catch (error) {
    $('estado-foto').textContent = '';
    $('error-form').textContent = explicarError(error);
    $('error-form').hidden = false;
  } finally {
    subiendoFoto = false;
    event.target.value = '';
    for (const id of ['subir-foto', 'guardar', 'cerrar', 'cancelar', 'salir']) $(id).disabled = false;
    $('producto-form').elements.foto.disabled = false;
  }
};
$('nuevo').onclick = () => abrirEditor();
for (const id of ['cerrar', 'cancelar']) $(id).onclick = () => { if (!guardando && !subiendoFoto) $('editor').close(); };
$('editor').addEventListener('cancel', event => { if (guardando || subiendoFoto) event.preventDefault(); });
$('login-form').onsubmit = async event => {
  event.preventDefault();
  const boton = event.target.querySelector('button');
  boton.disabled = true;
  avisar('');
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: event.target.elements.email.value.trim(), password: event.target.elements.password.value });
    if (error) throw error;
    event.target.reset();
    await revisarAdministrador();
    await cargarProductos();
  } catch (error) { avisar(`No se pudo iniciar sesión: ${explicarError(error)}`, true); }
  finally { boton.disabled = false; }
};
$('salir').onclick = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) { avisar(explicarError(error), true); return; }
  administrador = false;
  actualizarVista();
};
$('producto-form').onsubmit = async event => {
  event.preventDefault();
  if (guardando || subiendoFoto || !administrador) return;
  guardando = true;
  $('guardar').disabled = true;
  $('subir-foto').disabled = true;
  $('guardar').textContent = 'Guardando…';
  $('error-form').hidden = true;
  try {
    const datos=Object.fromEntries(new FormData(event.target));
    datos.badges=[...event.target.querySelectorAll('[data-badge]:checked')].map(input=>input.dataset.badge);
    const producto = validarProducto(datos);
    // select + single confirma que Supabase escribió una fila, incluso con RLS.
    const consulta = editando ? supabase.from('productos').update(producto).eq('id', editando) : supabase.from('productos').insert(producto);
    const { error } = await consulta.select('id').single();
    if (error) throw error;
    $('editor').close();
    avisar('Producto guardado en Supabase.');
    await cargarProductos();
  } catch (error) {
    $('error-form').textContent = explicarError(error);
    $('error-form').hidden = false;
  } finally {
    guardando = false;
    $('guardar').disabled = false;
    $('subir-foto').disabled = false;
    $('guardar').textContent = 'Guardar en Supabase';
  }
};
}
$('productos').onclick = async event => {
  if (!administrador) return;
  const botonEditar = event.target.closest('[data-editar]');
  if (botonEditar) abrirEditor(productos.find(producto => producto.id === botonEditar.dataset.editar));
  const boton = event.target.closest('[data-eliminar]');
  if (!boton) return;
  const producto = productos.find(producto => producto.id === boton.dataset.eliminar);
  if (!producto || !confirm(`¿Eliminar “${producto.nombre}” de Supabase? Esta acción no se puede deshacer.`)) return;
  boton.disabled = true;
  try {
    const { error } = await supabase.from('productos').delete().eq('id', producto.id).select('id').single();
    if (error) throw error;
    avisar('Producto eliminado de Supabase.');
    await cargarProductos();
  } catch (error) { avisar(`No se pudo eliminar: ${explicarError(error)}`, true); }
  finally { boton.disabled = false; }
};

if (modo === 'admin') {
  const { crearAdminSitio } = await import('./sitio-admin.js');
  gestorSitio = crearAdminSitio({ cliente: supabase, esAdmin: () => administrador, obtenerProductos: () => productos });
}
if (!supabase) {
  $('configuracion').hidden = false;
  $('recargar').disabled = true;
  actualizarVista();
  if (loading) mostrarErrorInicial();
} else {
  // No hacemos consultas dentro del callback de Auth para evitar bloqueos.
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') { administrador = false; actualizarVista(); }
  });
  if (modo === 'admin') await revisarAdministrador();
  if (modo === 'admin') {
    actualizarVista();
    await cargarProductos();
  } else {
    try {
      await Promise.all([cargarProductos(), cargarConfiguracionPublica()]);
      // Construye la página final bajo la pantalla de carga y la revela de una vez.
      loading=false;
      renderProductos();
      aplicarPaginaPublica();
      mostrarAplicacion();
    } catch (error) {
      loading=true;
      console.warn('Carga inicial interrumpida:',error.message);
      mostrarErrorInicial();
    }
  }
}
