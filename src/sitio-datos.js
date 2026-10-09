// El contenido visual se guarda aparte del catálogo que usará el futuro bot.
export const TIPOS_BLOQUE = {
  texto: 'Texto', imagen_texto: 'Imagen + texto', banner: 'Banner', accion: 'Llamada a la acción',
  contacto: 'Contacto', ubicacion: 'Ubicación', galeria: 'Galería', destacados: 'Productos destacados', personalizada: 'Sección personalizada',
  hero:'Hero', texto_imagen:'Texto + imagen', video:'Video', carrusel:'Carrusel', antes_despues:'Antes / después',
  testimonios:'Testimonios', estadisticas:'Estadísticas', marcas:'Marcas compatibles', logos:'Logos de marcas',
  faq:'Preguntas frecuentes', mapa:'Mapa', whatsapp:'WhatsApp', fondo_imagen:'Fondo con imagen',
  fondo_video:'Fondo con video', parallax:'Sección parallax', animada:'Sección con animación', iconos:'Tarjetas con iconos', categoria:'Productos por categoría',
};
export const COLORES = {
  color_principal: 'Color principal', color_secundario: 'Color secundario', color_fondo: 'Color de fondo',
  color_texto: 'Color de texto', color_botones: 'Color de botones', color_tarjetas: 'Color de tarjetas',
  color_encabezado: 'Color del encabezado', color_pie: 'Color del pie de página',
};
export const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function urlSegura(valor, permitirAncla = false) {
  const texto = String(valor ?? '').trim();
  if (permitirAncla && /^#[a-z][a-z0-9-]*$/i.test(texto)) return texto;
  if (permitirAncla && /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)*(?:#[a-z][a-z0-9-]*)?$/i.test(texto)) return texto;
  try { return ['https:', 'http:'].includes(new URL(texto).protocol) ? texto : ''; } catch { return ''; }
}
export function validarUrl(valor, ancla = false) {
  if (valor && !urlSegura(valor, ancla)) throw new Error('Usa una URL http:// o https:// válida, o un ancla como #contacto para los enlaces.');
}
export function validarConfiguracion(datos) {
  const salida = { ...datos };
  for (const [clave, valor] of Object.entries(salida)) {
    if (clave.startsWith('color_') && !/^#[\da-f]{6}$/i.test(valor)) throw new Error('Selecciona un color válido.');
    if (typeof valor === 'string') salida[clave] = valor.trim();
  }
  if ('nombre_negocio' in salida && !salida.nombre_negocio) throw new Error('Completa el nombre del negocio.');
  for (const clave of ['instagram','facebook','tiktok','mapa_url','logo','portada']) if (clave in salida) validarUrl(salida[clave]);
  if (salida.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(salida.correo)) throw new Error('Revisa el correo de contacto.');
  for (const clave of ['telefono','whatsapp']) {
    if (salida[clave] && !/^\+?[\d ()-]{6,25}$/.test(salida[clave])) throw new Error('Teléfono y WhatsApp deben contener números; incluye el código de país.');
  }
  return salida;
}
const reservadas = ['inicio','catalogo','contacto','ubicacion','horarios','redes'];
export function validarBloque(datos) {
  const bloque = { ...datos };
  if (!TIPOS_BLOQUE[bloque.tipo]) throw new Error('Selecciona un tipo de bloque válido.');
  for (const clave of ['titulo','subtitulo','descripcion','imagen','boton_texto','boton_enlace','ancla']) bloque[clave] = String(bloque[clave] ?? '').trim();
  if (!/^[a-z][a-z0-9-]*$/.test(bloque.ancla) || reservadas.includes(bloque.ancla)) throw new Error('El identificador debe usar letras minúsculas, números o guiones y no repetir una sección fija.');
  bloque.orden = Number(bloque.orden);
  if (!Number.isSafeInteger(bloque.orden) || Math.abs(bloque.orden) > 2147483647) throw new Error('El orden debe ser un número entero válido.');
  validarUrl(bloque.imagen);
  validarUrl(bloque.boton_enlace, true);
  if (!!bloque.boton_texto !== !!bloque.boton_enlace) throw new Error('Completa tanto el texto como el enlace del botón, o deja ambos vacíos.');
  bloque.galeria = Array.isArray(bloque.galeria) ? bloque.galeria : String(bloque.galeria ?? '').split('\n').map(x => x.trim()).filter(Boolean);
  bloque.galeria.forEach(url => validarUrl(url));
  bloque.productos_ids ??= [];
  if (bloque.opciones) {
    const opciones = bloque.opciones;
    for (const clave of ['video_url','imagen_despues']) validarUrl(opciones[clave]);
    if(opciones.video_url && !/\.(mp4|webm)$/i.test(new URL(opciones.video_url).pathname)) throw new Error('Usa una URL directa a un video MP4 o WEBM.');
    if (opciones.estilo && !['normal','oscuro','glass'].includes(opciones.estilo)) throw new Error('Estilo de bloque inválido.');
    if (opciones.animacion && !['global','ninguno','fade','slide','zoom','reveal','blur'].includes(opciones.animacion)) throw new Error('Animación de bloque inválida.');
    if (!Array.isArray(opciones.items)) throw new Error('Revisa las filas de contenido.');
    bloque.opciones = { video_url:String(opciones.video_url ?? '').trim(), imagen_despues:String(opciones.imagen_despues ?? '').trim(), categoria:String(opciones.categoria ?? '').trim(), estilo:opciones.estilo || 'normal', animacion:opciones.animacion || 'global', items:opciones.items.map(fila => String(fila).trim()).filter(Boolean) };
  }
  if (bloque.productos_ids.some(id => !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id))) throw new Error('Selecciona productos válidos para destacar.');
  return bloque;
}
export function validarMenu(datos) {
  const fila = { nombre: String(datos.nombre ?? '').trim(), enlace: String(datos.enlace ?? '').trim(), orden: Number(datos.orden), visible: !!datos.visible };
  if (!fila.nombre || !fila.enlace) throw new Error('Completa el nombre y el enlace del menú.');
  validarUrl(fila.enlace, true);
  if (!Number.isSafeInteger(fila.orden) || Math.abs(fila.orden) > 2147483647) throw new Error('El orden debe ser un número entero válido.');
  return fila;
}
export function visiblesOrdenados(filas) {
  return filas.filter(fila => fila.visible).slice().sort((a,b) => a.orden - b.orden || String(a.id).localeCompare(String(b.id)));
}

// Lee por páginas para no depender del límite por defecto de la API.
async function leerFilas(cliente, tabla) {
  const filas = [];
  for (let inicio = 0; ; inicio += 500) {
    const { data, error } = await cliente.from(tabla).select('*').order('orden').order('id').range(inicio, inicio + 499);
    if (error) throw error;
    filas.push(...data);
    if (data.length < 500) return filas;
  }
}
export async function cargarSitio(cliente) {
  const resultados = await Promise.allSettled([
    cliente.from('configuracion_sitio').select('*').eq('id', 1).single(),
    leerFilas(cliente, 'bloques_sitio'), leerFilas(cliente, 'menu_sitio'),
  ]);
  const [config, bloques, menu] = resultados;
  if (config.status === 'rejected') throw config.reason;
  if (config.value.error) throw config.value.error;
  if (bloques.status === 'rejected') throw bloques.reason;
  if (menu.status === 'rejected') throw menu.reason;
  return { config: config.value.data, bloques: bloques.value, menu: menu.value };
}
