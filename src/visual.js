// Opciones cerradas y valores acotados: no se admite CSS/HTML/JavaScript libre.
export const OPCIONES_VISUALES = {
  hero: {
    hero_subtitulo: { label:'Subtítulo del hero', default:'' }, hero_descripcion: { label:'Descripción del hero', default:'' },
    hero_boton: { label:'Botón principal', default:'Ver productos' }, hero_enlace: { label:'Enlace principal', default:'/productos', url:true },
    hero_boton_secundario: { label:'Botón secundario', default:'Contactar por WhatsApp' }, hero_enlace_secundario: { label:'Enlace secundario (vacío usa WhatsApp configurado)', default:'', url:true },
    hero_fondo: { label:'Imagen de fondo (URL)', default:'', url:true }, hero_video: { label:'Video de fondo MP4 / WEBM (URL)', default:'', url:true },
    hero_color: { label:'Color base del hero', default:'#101916', color:true }, hero_overlay: { label:'Oscurecer fondo (0 a 0.9)', default:0.45, min:0, max:0.9, step:0.05 },
    hero_logo: { label:'Mostrar logo en el hero', default:false }, header_fijo: { label:'Encabezado fijo', default:true },
  },
  animaciones: {
    intro_activa: { label:'Activar intro al entrar', default:false }, intro_tipo: { label:'Animación de intro', default:'fade', options:['fade','zoom','slide','reveal','blur','brillo','fondo_animado'] },
    intro_duracion: { label:'Duración de intro (segundos)', default:1.6, min:0.5, max:4, step:0.1 }, intro_sesion: { label:'Intro una vez por sesión', default:true },
    animaciones: { label:'Activar animaciones', default:true }, velocidad: { label:'Duración de entradas (segundos)', default:0.75, min:0.2, max:2, step:0.05 },
    intensidad: { label:'Intensidad (0 a 1)', default:0.5, min:0, max:1, step:0.1 }, entrada: { label:'Entrada de elementos', default:'slide', options:['fade','slide','zoom','reveal','blur'] },
    logo_efecto: { label:'Animación del logo', default:'fade', options:['ninguno','fade','zoom','brillo'] }, bloques_efecto: { label:'Entrada de bloques', default:'slide', options:['ninguno','fade','slide','zoom','reveal','blur'] },
    tarjetas_efecto: { label:'Efecto de tarjetas', default:'elevar', options:['ninguno','elevar','flotar'] }, botones_efecto: { label:'Efecto de botones', default:'deslizar', options:['ninguno','deslizar','brillo'] },
    imagenes_efecto: { label:'Efecto de imágenes', default:'zoom', options:['ninguno','zoom','reveal'] }, parallax: { label:'Parallax suave (solo escritorio)', default:false },
  },
  apariencia: {
    fondo_tipo: { label:'Tipo de fondo', default:'solido', options:['solido','degradado','imagen','video','textura'] }, fondo_imagen: { label:'Imagen de fondo (URL)', default:'', url:true }, fondo_video: { label:'Video de fondo (URL)', default:'', url:true },
    degradado_color: { label:'Segundo color del degradado', default:'#dce5de', color:true }, glass: { label:'Tarjetas con glassmorphism', default:false }, blur: { label:'Blur en el encabezado', default:true },
    sombra: { label:'Sombras', default:'suave', options:['ninguna','suave','profunda'] }, borde: { label:'Mostrar bordes', default:true }, radio: { label:'Bordes redondeados (px)', default:18, min:0, max:40, step:1 },
    fuente_principal: { label:'Fuente de títulos', default:'Manrope', options:['Manrope','DM Sans','Arial','Georgia'] }, fuente_secundaria: { label:'Fuente de texto', default:'DM Sans', options:['DM Sans','Manrope','Arial','Georgia'] },
    tamano_titulos: { label:'Tamaño máximo del hero (px)', default:88, min:40, max:120, step:1 }, tamano_texto: { label:'Tamaño del texto (px)', default:16, min:14, max:22, step:1 },
    peso_titulos: { label:'Peso de títulos', default:'800', options:['400','500','600','700','800'] }, espaciado: { label:'Espaciado de títulos (px)', default:-2, min:-4, max:4, step:0.25 },
  },
};
export const CAMPOS_VISUALES = Object.assign({}, ...Object.values(OPCIONES_VISUALES));
export function validarVisual(datos) {
  const salida = {};
  for (const [clave, valor] of Object.entries(datos ?? {})) {
    const campo = CAMPOS_VISUALES[clave];
    if (!campo) continue;
    if (typeof campo.default === 'boolean') {
      if (typeof valor !== 'boolean') throw new Error(`Revisa ${campo.label}.`);
      salida[clave] = valor;
    } else if ('min' in campo) {
      const numero = Number(valor);
      if (!Number.isFinite(numero) || numero < campo.min || numero > campo.max) throw new Error(`${campo.label}: usa un valor entre ${campo.min} y ${campo.max}.`);
      salida[clave] = numero;
    } else {
      const texto = String(valor ?? '').trim();
      if (campo.options && !campo.options.includes(texto)) throw new Error(`Selecciona una opción válida para ${campo.label}.`);
      if (campo.color && !/^#[\da-f]{6}$/i.test(texto)) throw new Error('Selecciona un color válido.');
      const anclas=['hero_enlace','hero_enlace_secundario'].includes(clave);
      if (campo.url && texto && !/^https?:\/\//i.test(texto) && !(anclas && (/^#[a-z][a-z0-9-]*$/i.test(texto)||/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)*(?:#[a-z][a-z0-9-]*)?$/i.test(texto)))) throw new Error(`Revisa el enlace en ${campo.label}.`);
      if (campo.url && /^https?:/i.test(texto)) { try { new URL(texto); } catch { throw new Error('URL inválida.'); } }
      if(clave.includes('video') && texto && !/\.(mp4|webm)$/i.test(new URL(texto).pathname)) throw new Error('El video debe ser una URL directa a un archivo MP4 o WEBM.');
      salida[clave] = texto;
    }
  }
  return salida;
}
export function visualConfig(config) {
  const salida = Object.fromEntries(Object.entries(CAMPOS_VISUALES).map(([k,c])=>[k,c.default]));
  // Una opción inválida en la base no inutiliza la página.
  for (const [clave,valor] of Object.entries(config?.visual ?? {})) {
    try { Object.assign(salida,validarVisual({[clave]:valor})); } catch { /* valor por defecto */ }
  }
  return salida;
}
export function slugProducto(producto) {
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(producto.slug ?? '')) return producto.slug;
  const nombre = String(producto.nombre || 'producto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return `${nombre || 'producto'}-${producto.id}`;
}
export function enlaceWhatsApp(config, producto = null) {
  const numero = String(config?.whatsapp ?? '').replace(/\D/g,'');
  if (!numero) return '';
  // No agrega SKU, precios, stock ni compatibilidad inventados al mensaje.
  return `https://wa.me/${numero}${producto ? `?text=${encodeURIComponent(`Hola, quiero consultar por ${producto.nombre}.`)}` : ''}`;
}
