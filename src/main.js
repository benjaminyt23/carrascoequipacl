import './style.css';
import { supabase } from './supabase.js';
import { buscarProductos, validarProducto } from './productos.js';
import { subirFoto } from './fotos.js';

const app = document.querySelector('#app');
const dinero = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
let productos = [];
let administrador = false;
// La ruta decide la vista; no hay enlaces públicos hacia administración.
const modo = /^\/admin\/?$/.test(window.location.pathname) ? 'admin' : 'catalogo';
let cargaCorrecta = false;
let cargando = false;
let versionCarga = 0;
let guardando = false;
let subiendoFoto = false;
let editando = null;
const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);

app.innerHTML = `
  <header><a class="marca" href="/" aria-label="Carrasco Equipa, inicio"><span class="simbolo">CE</span><span>CARRASCO<span class="marca-sub">EQUIPA · ACCESORIOS</span></span></a><nav aria-label="Principal"><button id="catalogo" class="nav activo">Catálogo</button></nav></header>
  <main>
    <section class="intro"><div><span class="eyebrow">EQUIPA TU PRÓXIMO CAMINO</span><h1 id="titulo">Productos para tu vehículo.</h1><p id="subtitulo">Encuentra accesorios, compatibilidad y detalles de instalación en un solo lugar.</p></div></section>
    <div id="configuracion" class="aviso" hidden>Falta configurar Supabase. Copia <strong>.env.example</strong> como <strong>.env</strong>, completa las dos variables y reinicia el servidor. La guía está en README.md.</div>
    <div id="mensaje" role="status" aria-live="polite" hidden></div>
    ${modo === 'admin' ? `<section id="login" class="panel login" hidden><span class="eyebrow">ACCESO DE ADMINISTRACIÓN</span><h2>Ingresa a tu panel</h2><p>Usa la cuenta que configuraste en Supabase.</p><form id="login-form"><label>Correo<input name="email" type="email" autocomplete="username" required></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label><button class="primario" type="submit">Iniciar sesión</button></form></section>` : ''}
    <section id="herramientas" class="herramientas"><label class="busqueda"><span>Buscar productos</span><input id="buscar" type="search" placeholder="Busca por producto, vehículo o año…"></label><div class="acciones"><button id="recargar" class="secundario">Actualizar</button>${modo === 'admin' ? `<button id="nuevo" class="primario" hidden>＋ Agregar producto</button><button id="salir" class="secundario" hidden>Cerrar sesión</button>` : ''}</div></section>
    <div class="resumen"><h2 id="lista-titulo">Nuestro catálogo</h2><span id="contador"></span></div>
    <section id="productos" class="grid" aria-label="Productos" aria-busy="false"></section>
    <footer>CARRASCO EQUIPAMIENTO @2026</footer>
  </main>
  ${modo === 'admin' ? `<dialog id="editor"><form id="producto-form"><div class="dialog-header"><div><span class="eyebrow">ADMINISTRACIÓN</span><h2 id="editor-titulo">Agregar producto</h2></div><button type="button" id="cerrar" class="secundario" aria-label="Cerrar formulario">✕</button></div><div class="form-grid">
    <label class="ancho">Nombre del producto<input name="nombre" maxlength="200" required placeholder="Ej. Antivuelco"></label>
    <label>Vehículo compatible<input name="vehiculo" maxlength="300" required placeholder="Ej. Mitsubishi L200"></label>
    <label>Años compatibles<input name="ano" maxlength="200" required placeholder="Ej. 2016–2024"></label>
    <label>Precio (CLP)<input name="precio" type="number" min="0" max="999999999999" step="1" required></label>
    <label>Stock (unidades)<input name="stock" type="number" min="0" max="2147483647" step="1" required></label>
    <label class="ancho">Descripción<textarea name="descripcion" rows="3" maxlength="5000" placeholder="Características del producto"></textarea></label>
    <label class="ancho">Instalación<textarea name="instalacion" rows="2" maxlength="3000" placeholder="Método de instalación y si está incluida en el precio"></textarea></label>
    <div class="ancho foto-controles"><input id="archivo-foto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden><button id="subir-foto" class="secundario" type="button">Subir foto</button><small>JPG, JPEG, PNG o WEBP · Máximo 5 MB.</small><p id="estado-foto" role="status" aria-live="polite"></p><img id="preview-foto" class="preview-foto" alt="Vista previa de la fotografía del producto" hidden></div>
    <label class="ancho">URL de fotografía (opcional)<input name="foto" type="url" placeholder="https://…"><small>Se completa al subir una foto. También puedes pegar una URL pública. Guarda el producto para aplicar el cambio.</small></label>
  </div><p id="error-form" class="error" role="alert" hidden></p><div class="dialog-footer"><button type="button" id="cancelar" class="secundario">Cancelar</button><button id="guardar" class="primario" type="submit">Guardar en Supabase</button></div></form></dialog>` : ''}`;

const $ = id => document.getElementById(id);
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
  $('titulo').textContent = admin ? 'Tu catálogo, bajo control.' : 'Productos para tu vehículo.';
  $('subtitulo').textContent = admin ? 'Administra productos, precios y stock. Cada cambio se guarda en Supabase.' : 'Encuentra accesorios, compatibilidad y detalles de instalación en un solo lugar.';
  $('catalogo').classList.toggle('activo', !admin);
  if (admin) {
    $('login').hidden = administrador || !supabase;
    $('nuevo').hidden = !administrador;
    $('salir').hidden = !administrador;
  }
  $('lista-titulo').textContent = admin && administrador ? 'Todos los productos' : 'Nuestro catálogo';
  renderProductos();
}
function renderProductos() {
  $('productos').setAttribute('aria-busy', String(cargando));
  if (cargando || !cargaCorrecta) {
    $('contador').textContent = '';
    $('productos').innerHTML = `<div class="vacio"><h3>${cargando ? 'Cargando productos…' : 'Catálogo pendiente de conexión'}</h3><p>${cargando ? 'Consultando Supabase.' : 'Los productos aparecerán cuando la conexión esté configurada y disponible.'}</p></div>`;
    return;
  }
  const resultado = buscarProductos(productos, $('buscar').value);
  $('contador').textContent = `${resultado.length} producto${resultado.length === 1 ? '' : 's'}`;
  $('productos').innerHTML = resultado.length ? resultado.map(producto => {
    let fotoValida = false;
    try { fotoValida = ['http:', 'https:'].includes(new URL(producto.foto).protocol); } catch { /* Sin imagen válida */ }
    return `<article class="producto"><div class="foto">${fotoValida ? `<img src="${escapar(producto.foto)}" alt="${escapar(producto.nombre)}" loading="lazy" referrerpolicy="no-referrer">` : '<span class="sin-foto">CE<span>Sin fotografía</span></span>'}<span class="stock ${producto.stock > 0 ? '' : 'agotado'}">${producto.stock > 0 ? `${escapar(producto.stock)} disponibles` : 'Sin stock'}</span></div><div class="contenido"><span class="vehiculo">${escapar(producto.vehiculo)}</span><h3>${escapar(producto.nombre)}</h3><p class="anos">Años: ${escapar(producto.ano)}</p><p class="precio">${dinero.format(producto.precio)}</p><p class="descripcion">${escapar(producto.descripcion || 'Sin descripción registrada.')}</p><div class="instalacion"><strong>Instalación</strong><p>${escapar(producto.instalacion || 'Sin información registrada.')}</p></div>${modo === 'admin' && administrador ? `<div class="producto-acciones"><button class="secundario" data-editar="${escapar(producto.id)}">Editar</button><button class="eliminar" data-eliminar="${escapar(producto.id)}">Eliminar</button></div>` : ''}</div></article>`;
  }).join('') : `<div class="vacio"><h3>${productos.length ? 'No encontramos coincidencias' : 'Tu catálogo está listo para comenzar'}</h3><p>${productos.length ? 'Prueba con un vehículo como L200 o con el nombre del accesorio.' : 'Todavía no hay productos registrados en Supabase.'}</p></div>`;
  $('productos').querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    img.replaceWith(Object.assign(document.createElement('span'), { className: 'sin-foto', textContent: 'Fotografía no disponible' }));
  }));
}
// Pagina todas las filas para no perder productos después del límite de la API.
async function cargarProductos() {
  if (!supabase) return;
  const version = ++versionCarga;
  cargando = true;
  renderProductos();
  try {
    const filas = [];
    const tamano = 500;
    for (let desde = 0; ; desde += tamano) {
      const { data, error } = await supabase.from('productos').select('*').order('created_at', { ascending: false }).order('id').range(desde, desde + tamano - 1);
      if (error) throw error;
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
  } finally {
    if (version === versionCarga) { cargando = false; renderProductos(); }
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
  for (const campo of ['nombre', 'vehiculo', 'ano', 'precio', 'stock', 'descripcion', 'instalacion', 'foto']) {
    $('producto-form').elements[campo].value = producto?.[campo] ?? '';
  }
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
$('catalogo').onclick = () => { window.location.href = '/'; };
$('buscar').oninput = renderProductos;
$('recargar').onclick = () => { avisar(''); cargarProductos(); };
if (modo === 'admin') {
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
    const producto = validarProducto(Object.fromEntries(new FormData(event.target)));
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

if (!supabase) {
  $('configuracion').hidden = false;
  $('recargar').disabled = true;
  actualizarVista();
} else {
  // No hacemos consultas dentro del callback de Auth para evitar bloqueos.
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') { administrador = false; actualizarVista(); }
  });
  if (modo === 'admin') await revisarAdministrador();
  actualizarVista();
  await cargarProductos();
}
