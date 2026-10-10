import { escapar as e, urlSegura, visiblesOrdenados, COLORES } from './sitio-datos.js';
import { visualConfig, slugProducto, enlaceWhatsApp } from './visual.js';
import { activarExperiencia } from './experiencia.js';
import { productosDestacados } from './productos.js';
import { paginasVisibles, validarDiseno, resolverPaginaPublica } from './paginas-datos.js';
import { validarOpcionesCodigo } from './codigo-personalizado.js';

const dinero = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const imagen = (url, alt, clase = '', hero = false) => urlSegura(url) ? `<img class="${clase}" src="${e(url)}" alt="${e(alt)}" loading="${hero ? 'eager' : 'lazy'}" ${hero ? 'fetchpriority="high"' : ''} decoding="async" referrerpolicy="no-referrer">` : '';
const enlace = (url, texto, clase = '') => urlSegura(url,true) ? `<a class="${clase}" href="${e(['#catalogo','/#catalogo'].includes(url) ? '/productos' : url)}">${e(texto)}<span aria-hidden="true"> ↗</span></a>` : '';
export function variablesColores(config) {
  return Object.keys(COLORES).filter(clave => /^#[\da-f]{6}$/i.test(config[clave])).map(clave => `--${clave.replaceAll('_','-')}:${config[clave]}`).join(';');
}
export function aplicarFondoExterior(config) {
  const color=/^#[\da-f]{6}$/i.test(config.color_fondo)?config.color_fondo:'#101114';
  document.documentElement.style.setProperty('--fondo-exterior',color);
  // La barra de desplazamiento nativa también debe respetar un tema oscuro.
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  document.documentElement.style.colorScheme=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114<128?'dark':'light';
}
export function variablesVisuales(config) {
  const v = visualConfig(config);
  const fondo=urlSegura(v.fondo_imagen) ? `url("${encodeURI(v.fondo_imagen).replace(/["()]/g,c=>encodeURIComponent(c).replace('(', '%28').replace(')', '%29'))}")` : 'none';
  return `${variablesColores(config)};--hero-color:${v.hero_color};--hero-overlay:${v.hero_overlay};--radio:${v.radio}px;--font-titulo:'${v.fuente_principal}';--font-texto:'${v.fuente_secundaria}';--titulo-max:${v.tamano_titulos}px;--texto-size:${v.tamano_texto}px;--peso-titulo:${v.peso_titulos};--tracking:${v.espaciado}px;--degradado-color:${v.degradado_color};--intensidad:${v.intensidad};--fondo-imagen:${fondo}`;
}
export function renderMarca(config) {
  return `<a class="marca" href="/" aria-label="${e(config.nombre_negocio)}">${imagen(config.logo,config.nombre_negocio,'sitio-logo') || '<span class="marca-emblema" aria-hidden="true">CE<span>↗</span></span>'}<span>${e(config.nombre_negocio)}</span></a>`;
}
// El catálogo tiene su propio botón. Evita duplicarlo desde menús o páginas,
// sin alterar las rutas, los bloques ni los productos almacenados.
const enlaceCatalogo=url=>['/productos','/catalogo','#catalogo','/#catalogo'].includes(String(url??'').trim().replace(/\/$/,'').split('?')[0].replace(/^(\/productos|\/catalogo)#.*$/,'$1'));
const nombreProductos=nombre=>String(nombre??'').trim().toLocaleLowerCase('es')==='productos';
export function renderMenu(menu, raiz = false) {
  // Retira el enlace antiguo «quienessomos» que quedó sin una sección válida.
  return visiblesOrdenados(menu).filter(f=>String(f.nombre).trim().toLowerCase()!=='quienessomos'&&!nombreProductos(f.nombre)&&!enlaceCatalogo(f.enlace)).map(f=>{
    const html=enlace(f.enlace,f.nombre,'nav');
    return raiz && f.enlace.startsWith('#') ? html.replace('href="#','href="/#') : html;
  }).join('');
}
export function renderMenuPaginas(paginas) {
  const visibles=paginasVisibles(paginas).map(p=>({...p,en_menu:p.en_menu&&p.sistema!=='productos'&&!enlaceCatalogo(p.ruta)&&!nombreProductos(p.nombre_menu||p.nombre)}));
  const navegar=(padre=null)=>visibles.filter(p=>p.padre_id===padre&&p.en_menu).map(p=>{
    const hijos=navegar(p.id);
    const link=`<a class="nav" href="${e(urlSegura(p.ruta,true)||'/')}" ${p.nueva_pestana ? 'target="_blank" rel="noopener noreferrer"' : ''}>${p.icono?`<span class="menu-icono">${e(p.icono)}</span>`:''}${e(p.nombre_menu||p.nombre)}</a>`;
    return hijos ? `<details class="menu-dropdown"><summary>${p.icono?`<span class="menu-icono">${e(p.icono)}</span>`:''}${e(p.nombre_menu||p.nombre)} <span aria-hidden="true">⌄</span></summary><div class="menu-submenu">${link}${hijos}</div></details>` : link;
  }).join('');
  // Un padre fuera del menú no oculta la página: sus hijos se promueven al nivel principal.
  const promovidas=visibles.filter(p=>p.en_menu&&p.padre_id&&!visibles.find(x=>x.id===p.padre_id)?.en_menu).map(p=>({...p,padre_id:null}));
  if(promovidas.length) return renderMenuPaginas(visibles.filter(p=>!promovidas.some(x=>x.id===p.id)).concat(promovidas));
  return navegar();
}
function menuAdicional(menu,paginas) {
  const basicos=['#inicio','#catalogo','/#inicio','/#catalogo','/','/productos'];
  return menu.filter(m=>!basicos.includes(m.enlace)).map(m=>{
    if(!m.enlace.startsWith('#')) return m;
    let ancla=m.enlace.slice(1);
    if(!paginas.some(p=>p.bloques?.some(b=>b.visible&&b.ancla===ancla))) ancla=({contacto:'contacto-carrasco',ubicacion:'ubicacion-carrasco'}[ancla]||ancla);
    const pagina=paginas.find(p=>p.bloques?.some(b=>b.visible&&b.ancla===ancla));
    return pagina ? {...m,enlace:pagina.ruta+'#'+ancla} : m;
  });
}
export function renderHeader(config,menu,paginas=null) {
  return `${renderMarca(config)}<button class="menu-toggle" aria-label="Abrir menú" aria-controls="menu-publico" aria-expanded="false"><span></span><span></span></button><nav id="menu-publico" aria-label="Principal">${paginas ? renderMenuPaginas(paginas)+renderMenu(menuAdicional(menu,paginas),true) : renderMenu(menu,true)}<div class="header-acciones"><a class="secundario" href="/productos">Catálogo</a>${enlace(enlaceWhatsApp(config),'WhatsApp','primario')}</div></nav>`;
}
function arteAutomotriz() {
  return `<div class="hero-arte" aria-hidden="true"><div class="orbita orbita-uno"></div><div class="orbita orbita-dos"></div><svg viewBox="0 0 700 420" fill="none"><defs><linearGradient id="metal" x1="80" y1="100" x2="600" y2="350"><stop stop-color="#9dbbab"/><stop offset=".5" stop-color="#eef4ee"/><stop offset="1" stop-color="#36534b"/></linearGradient></defs><path d="M45 340h600M90 370h510M150 400h390" stroke="#29443a"/><path d="m110 275 35-85 70-15 75-80h150l65 81 80 23 34 55-8 29h-47m-335 0h232m-325 0h-34l-17-8Z" stroke="url(#metal)" stroke-width="4"/><path d="m248 173 52-59h125l48 59H248ZM332 114v59m-105 10-15 70m252-70 23 68M156 202h42m327 0h42m-306 23h36m130 0h36M120 253h60m339 0h64" stroke="url(#metal)" stroke-width="3"/><circle cx="213" cy="284" r="46" stroke="url(#metal)" stroke-width="5"/><circle cx="514" cy="284" r="46" stroke="url(#metal)" stroke-width="5"/><circle cx="213" cy="284" r="22" stroke="#78958a" stroke-width="3"/><circle cx="514" cy="284" r="22" stroke="#78958a" stroke-width="3"/></svg><span class="arte-linea"></span></div>`;
}
function video(url, fondo = false) {
  return urlSegura(url) ? `<video ${fondo ? 'data-video-fondo muted loop playsinline' : 'controls playsinline'} preload="none" ${fondo ? 'aria-hidden="true" tabindex="-1"' : ''} src="${e(url)}"></video>` : '';
}
export function renderPortada(config) {
  const v = visualConfig(config);
  const secundario = v.hero_enlace_secundario || enlaceWhatsApp(config);
  const fondo = imagen(v.hero_fondo,'','hero-fondo',true) + video(v.hero_video,true);
  return `${fondo}<div class="hero-velo"></div><div class="hero-contenido"><div class="portada-texto">${v.hero_logo ? imagen(config.logo,config.nombre_negocio,'hero-logo',true) : ''}<span class="eyebrow"><i></i>${e(config.lema)}</span><h1>${e(config.texto_principal)}</h1>${v.hero_subtitulo ? `<h2 class="hero-subtitulo">${e(v.hero_subtitulo)}</h2>` : ''}<p>${e(config.texto_secundario)}</p>${v.hero_descripcion ? `<p class="hero-descripcion">${e(v.hero_descripcion)}</p>` : ''}<div class="hero-botones">${enlace(v.hero_enlace,v.hero_boton,'primario')}${enlace(secundario,v.hero_boton_secundario,'secundario')}</div></div><div class="hero-visual" data-parallax>${imagen(config.portada,config.nombre_negocio,'sitio-portada',true) || arteAutomotriz()}</div></div><div class="hero-base"><span>${e(config.nombre_negocio)}</span><a href="/productos">Explorar catálogo <span aria-hidden="true">↓</span></a><span class="hero-indice">01 / EQUIPAMIENTO</span></div>`;
}
export function renderContacto(config) {
  const tel = String(config.telefono ?? '').replace(/[^\d+]/g,'');
  const correo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.correo ?? '') ? config.correo : '';
  return `<div class="contacto-enlaces">${tel ? `<a href="tel:${e(tel)}">${e(config.telefono)}</a>` : ''}${enlace(enlaceWhatsApp(config),'WhatsApp','primario')}${correo ? `<a href="mailto:${e(correo)}">${e(correo)}</a>` : ''}</div>`;
}
export function renderUbicacion(config) {
  let mapa='';
  try {
    const url=new URL(config.mapa_url);
    if(url.protocol==='https:' && ['www.google.com','maps.google.com'].includes(url.hostname) && url.pathname.startsWith('/maps/embed')) mapa=url.href;
  } catch { /* enlace opcional */ }
  if(!mapa && config.direccion) mapa=`https://maps.google.com/maps?q=${encodeURIComponent(config.direccion)}&output=embed`;
  return `<p class="multilinea">${e(config.direccion)}</p>${mapa ? `<iframe class="mapa-embed" src="${e(mapa)}" title="Mapa de ${e(config.nombre_negocio)}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen></iframe>` : ''}${enlace(config.mapa_url,config.titulo_ubicacion,'secundario')}`;
}
export function renderTarjeta(p,config = {}) {
  const url = `/producto/${slugProducto(p)}`;
  const badges = (p.badges ?? []).filter(b=>['nuevo','oferta','destacado'].includes(b));
  return `<article class="producto premium-producto" data-entrada><a class="foto" href="${e(url)}" aria-label="Ver ${e(p.nombre)}">${imagen(p.foto,p.nombre) || '<span class="sin-foto"><span class="pieza-emblema" aria-hidden="true">↗</span>Sin fotografía</span>'}<span class="badges">${badges.map(b=>`<span class="badge badge-${b}">${e(b)}</span>`).join('')}</span><span class="foto-indice" aria-hidden="true">↗</span></a><div class="contenido"><div class="card-meta"><span class="vehiculo">${e(p.vehiculo)}</span><span class="stock-line ${p.stock > 0 ? '' : 'agotado'}"><i></i>${p.stock > 0 ? 'Disponible' : 'Sin stock'}</span></div><h3><a href="${e(url)}">${e(p.nombre)}</a></h3><p class="anos">${e(p.ano)}${p.categoria ? ` · ${e(p.categoria)}` : ''}</p><div class="card-precio"><p class="precio">${dinero.format(p.precio)}</p><small>${e(p.stock)} unidades</small></div><div class="card-botones"><a class="secundario" href="${e(url)}">Ver producto <span aria-hidden="true">↗</span></a>${enlace(enlaceWhatsApp(config,p),'Consultar','primario')}</div></div></article>`;
}
export function renderProductosDestacados(productos,config = {}) {
  return productos.map(p=>renderTarjeta(p,config)).join('');
}
const filas = b => (b.opciones?.items ?? []).map(x=>String(x).split('|').map(s=>s.trim()));
export function renderBloques(config,bloques,productos) {
  return visiblesOrdenados(bloques).map((b,i)=> {
    const o = b.opciones ?? {};
    let extra = '';
    const tipo = b.tipo;
    if (['contacto','whatsapp'].includes(tipo)) extra = renderContacto(config);
    if (['ubicacion','mapa'].includes(tipo)) extra = renderUbicacion(config);
    if (['video','fondo_video'].includes(tipo)) extra = video(o.video_url,tipo === 'fondo_video');
    if (['galeria','carrusel','logos'].includes(tipo)) extra = `<div class="${tipo === 'carrusel' ? 'sitio-carrusel' : tipo === 'logos' ? 'logos-grid' : 'sitio-galeria'}" ${tipo === 'carrusel' ? 'tabindex="0" aria-label="Galería deslizable"' : ''}>${(b.galeria ?? []).map((url,n)=>`<figure>${imagen(url,filas(b)[n]?.[0] || b.titulo)}${filas(b)[n]?.[0] ? `<figcaption>${e(filas(b)[n][0])}</figcaption>` : ''}</figure>`).join('')}</div>`;
    if (['destacados','categoria'].includes(tipo)) {
      const seleccion = tipo === 'categoria' ? productos.filter(p=>o.categoria && p.categoria === o.categoria) : (b.productos_ids ?? []).map(id=>productos.find(p=>p.id===id)).filter(Boolean);
      extra = `<div class="grid">${renderProductosDestacados(seleccion,config)}</div>`;
    }
    if (tipo === 'antes_despues') extra = `<div class="comparador" style="--comparacion:50%"><div class="comparador-imagenes">${imagen(b.imagen,'Antes','antes')}${imagen(o.imagen_despues,'Después','despues')}<span class="comparador-antes">Antes</span><span class="comparador-despues">Después</span></div><label>Comparar imágenes<input data-comparador type="range" min="0" max="100" value="50" aria-label="Comparar antes y después"></label></div>`;
    if (tipo === 'testimonios') extra = `<div class="items-grid">${filas(b).map(([nombre,opinion])=>`<blockquote><span aria-hidden="true">“</span><p>${e(opinion)}</p><cite>${e(nombre)}</cite></blockquote>`).join('')}</div>`;
    if (tipo === 'estadisticas') extra = `<div class="estadisticas-grid">${filas(b).map(([valor,texto])=>`<div><strong ${/^\d+(\.\d+)?$/.test(valor) ? `data-contador="${e(valor)}"` : ''}>${e(valor)}</strong><p>${e(texto)}</p></div>`).join('')}</div>`;
    if (tipo === 'marcas') extra = `<div class="marcas-grid">${filas(b).map(([nombre])=>`<span>${e(nombre)}</span>`).join('')}</div>`;
    if (tipo === 'faq') extra = `<div class="faq-lista">${filas(b).map(([pregunta,respuesta])=>`<details><summary>${e(pregunta)}<span aria-hidden="true">＋</span></summary><p>${e(respuesta)}</p></details>`).join('')}</div>`;
    if (tipo === 'iconos') extra = `<div class="items-grid">${filas(b).map(([icono,titulo,texto])=>`<article class="icon-card"><span class="icono">${e(icono || '↗')}</span><h3>${e(titulo)}</h3><p>${e(texto)}</p></article>`).join('')}</div>`;
    const foto = ['antes_despues','fondo_video'].includes(tipo) ? '' : imagen(b.imagen,b.titulo,'bloque-imagen');
    return `<section id="${e(b.ancla)}" class="sitio-bloque bloque-${e(tipo)} estilo-${e(o.estilo || 'normal')}" data-entrada="${e(o.animacion || 'global')}" ${tipo === 'parallax' ? 'data-parallax' : ''}><span class="bloque-numero" aria-hidden="true">${String(i+1).padStart(2,'0')}</span>${foto}<div class="bloque-texto">${b.subtitulo ? `<span class="eyebrow">${e(b.subtitulo)}</span>` : ''}${b.titulo ? `<h2>${e(b.titulo)}</h2>` : ''}<p class="multilinea">${e(b.descripcion)}</p>${extra}${b.boton_texto ? enlace(b.boton_enlace,b.boton_texto,'primario') : ''}</div></section>`;
  }).join('');
}
export function renderSecciones(config) {
  const seccion = (id,titulo,contenido) => `<section id="${id}" class="sitio-bloque seccion-contacto" data-entrada><span class="eyebrow">${e(config.nombre_negocio)}</span><h2>${e(titulo)}</h2>${contenido}</section>`;
  let html = '';
  if (config.mostrar_contacto && (config.telefono || config.whatsapp || config.correo)) html += seccion('contacto',config.titulo_contacto,renderContacto(config));
  if (config.mostrar_ubicacion && (config.direccion || config.mapa_url)) html += seccion('ubicacion',config.titulo_ubicacion,renderUbicacion(config));
  if (config.mostrar_horarios && config.horario) html += seccion('horarios',config.titulo_horarios,`<p class="multilinea">${e(config.horario)}</p>`);
  if (config.mostrar_redes && (config.instagram || config.facebook || config.tiktok)) html += seccion('redes',config.titulo_redes,`<div class="contacto-enlaces">${enlace(config.instagram,'Instagram')}${enlace(config.facebook,'Facebook')}${enlace(config.tiktok,'TikTok')}</div>`);
  return html;
}
export function renderFooter(config,menu,paginas=null) {
  return `<div class="footer-superior"><div>${renderMarca(config)}<p>${e(config.lema)}</p></div><div><h3>Navegación</h3>${paginas ? renderMenuPaginas(paginas)+renderMenu(menuAdicional(menu,paginas),true) : renderMenu(menu,true)}</div><div><h3>${e(config.titulo_contacto)}</h3>${renderContacto(config)}<p class="multilinea">${e(config.horario)}</p></div><div><h3>${e(config.titulo_ubicacion)}</h3>${renderUbicacion(config)}<div class="footer-redes">${enlace(config.instagram,'Instagram')}${enlace(config.facebook,'Facebook')}${enlace(config.tiktok,'TikTok')}</div></div></div><div class="footer-base"><span>${e(config.texto_pie)}</span><a href="${paginas ? '#topo-carrasco' : '/#inicio'}">Volver arriba ↑</a></div>`;
}
export function renderProducto(p,config,productos) {
  const fotos = [...new Set([p.foto,...(p.galeria ?? [])].filter(url=>urlSegura(url)))];
  const relacionados = productos.filter(x=>x.id!==p.id && ((p.categoria && x.categoria===p.categoria) || x.vehiculo===p.vehiculo)).slice(0,3);
  return `<div class="producto-detalle"><a class="producto-volver" href="/productos">← Volver al catálogo</a><div class="producto-layout"><div class="producto-galeria">${fotos.length ? imagen(fotos[0],p.nombre,'producto-foto-principal',true) : '<div class="producto-foto-vacia">Sin fotografía registrada</div>'}${fotos.length > 1 ? `<div class="producto-miniaturas">${fotos.map((url,n)=>`<button data-foto-producto="${e(url)}" aria-label="Ver foto ${n+1}">${imagen(url,p.nombre)}</button>`).join('')}</div>` : ''}</div><div class="producto-info"><span class="eyebrow">${e(p.vehiculo)}</span><h1>${e(p.nombre)}</h1><p class="detalle-precio">${dinero.format(p.precio)}</p><span class="stock-line"><i></i>${p.stock > 0 ? `Disponible · ${e(p.stock)} unidades` : 'Sin stock'}</span><dl><div><dt>Vehículo compatible</dt><dd>${e(p.vehiculo)}</dd></div><div><dt>Años compatibles</dt><dd>${e(p.ano)}</dd></div></dl><h2>Descripción</h2><p class="multilinea">${e(p.descripcion || 'Sin descripción registrada.')}</p><h2>Instalación</h2><p class="multilinea">${e(p.instalacion || 'Sin información registrada.')}</p>${enlace(enlaceWhatsApp(config,p),'Consultar por WhatsApp','primario')}</div></div>${relacionados.length ? `<section class="relacionados"><span class="eyebrow">SIGUE EQUIPANDO</span><h2>Productos relacionados</h2><div class="grid">${renderProductosDestacados(relacionados,config)}</div></section>` : ''}</div>`;
}
export function atributosVisuales(config) {
  const v = visualConfig(config);
  return `data-animaciones="${v.animaciones}" data-tarjetas="${v.tarjetas_efecto}" data-botones="${v.botones_efecto}" data-imagenes="${v.imagenes_efecto}" data-fondo="${v.fondo_tipo}" data-glass="${v.glass}" data-blur="${v.blur}" data-sombra="${v.sombra}" data-borde="${v.borde}"`;
}
export function renderPagina(sitio,productos,{catalogo=false}={}) {
  const {config,bloques,menu}=sitio;
  const v=visualConfig(config);
  const fondo=v.fondo_tipo==='video' ? `<div class="fondo-video-sitio">${video(v.fondo_video,true)}</div>` : '';
  const destacados=catalogo ? productos : productosDestacados(productos);
  const bloquesPagina=bloques.filter(b=>catalogo ? ['destacados','categoria'].includes(b.tipo) : !['destacados','categoria'].includes(b.tipo));
  return `<div class="sitio-publico" style="${e(variablesVisuales(config))}" ${atributosVisuales(config)}>${fondo}<header>${renderHeader(config,menu)}</header><main>${catalogo ? '' : `<section id="inicio" class="intro hero-premium">${renderPortada(config)}</section>`}<section id="${catalogo ? 'catalogo' : 'destacados'}" class="catalogo-publico"><div class="resumen"><h2>${catalogo ? e(config.titulo_catalogo) : 'Productos destacados'}</h2><span>${destacados.length} productos</span></div><div class="grid">${renderProductosDestacados(destacados,config) || `<p>${catalogo ? e(config.texto_catalogo_vacio) : 'Pronto encontrarás nuestros productos destacados aquí.'}</p>`}</div>${catalogo ? '' : '<div class="catalogo-cta"><a class="primario" href="/productos">Ver todos los productos ↗</a></div>'}</section>${renderBloques(config,bloquesPagina,productos)}${catalogo ? '' : renderSecciones(config)}<footer>${renderFooter(config,menu)}</footer></main></div>`;
}
let limpiarExperiencia = () => {};
export function renderBloquesPagina(config,pagina,productos,{preview=false}={}) {
  const home=pagina.sistema==='inicio';
  const productosPagina=home ? productosDestacados(productos) : productos;
  let catalogoMostrado=false;
  const html=visiblesOrdenados(pagina.bloques??[]).map((b,n)=>{
    let diseno={};try {diseno=validarDiseno(b.diseno);} catch { /* ignora estilos inválidos */ }
    const css=[];
    for(const [k,v] of Object.entries(diseno)) {
      const propiedades={padding:'--bloque-padding',margin:'--bloque-margin',altura:'--bloque-altura',radio:'--bloque-radio',columnas:'--bloque-columnas',fondo:'--bloque-fondo',color:'--bloque-color',borde:'--bloque-borde'};
      if(propiedades[k]) css.push(`${propiedades[k]}:${v}${typeof v==='number'&&k!=='columnas'?'px':''}`);
    }
    const tipo=b.tipo;const entrada=b.opciones?.animacion||'global';let contenido='';
    if(tipo==='codigo_personalizado') {
      try {
        // También limpia al leer Supabase: no confía en lo guardado por el editor.
        const o=validarOpcionesCodigo(b.opciones??{});
        contenido=`<section id="${e(b.ancla)}" class="sitio-bloque bloque-codigo"><div class="codigo-contenido" style="--embed-ancho:${o.embed_ancho?o.embed_ancho+'px':'100%'};--embed-alto:${o.embed_alto}px">${o.codigo_html}</div></section>`;
      } catch { contenido=`<section id="${e(b.ancla)}" class="sitio-bloque"><p role="status">Este contenido externo no está disponible. Revisa el bloque Código personalizado en administración.</p></section>`; }
    }
    else if(tipo==='hero_sitio') contenido=`<section id="${e(b.ancla)}" class="intro hero-premium">${renderPortada(config)}</section>`;
    else if(tipo==='catalogo'&&!home) {
      if(catalogoMostrado) return '';catalogoMostrado=true;
      contenido=preview ? `<section class="catalogo-publico"><div class="resumen"><h2>${e(b.titulo||config.titulo_catalogo)}</h2><span>${productos.length} productos</span></div><p>Buscador y filtros disponibles en la página pública.</p><div class="grid">${renderProductosDestacados(productos,config)}</div></section>` : '<div data-catalogo-pagina></div>';
    } else if(['destacados_auto','catalogo'].includes(tipo)) contenido=renderBloques(config,[{...b,tipo:'destacados',productos_ids:productosDestacados(productos).map(p=>p.id)}],productos);
    else if(tipo==='categorias') {
      const categorias=[...new Set(productos.map(p=>p.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
      contenido=`<section id="${e(b.ancla)}" class="sitio-bloque bloque-categorias"><span class="eyebrow">${e(b.subtitulo)}</span><h2>${e(b.titulo)}</h2><p>${e(b.descripcion)}</p><div class="categorias-grid">${categorias.map((c,i)=>`<a href="/productos?categoria=${encodeURIComponent(c)}"><span>${String(i+1).padStart(2,'0')} / EQUIPAMIENTO</span><h3>${e(c)}</h3><span>Explorar ↗</span></a>`).join('')||'<p>Las categorías aparecerán cuando las completes en tus productos.</p>'}</div></section>`;
    } else if(tipo==='imagen') contenido=`<section id="${e(b.ancla)}" class="sitio-bloque bloque-imagen-sola">${imagen(b.imagen,b.titulo,'bloque-imagen')}${b.titulo?`<h2>${e(b.titulo)}</h2>`:''}<p>${e(b.descripcion)}</p></section>`;
    else if(tipo==='separador') contenido=`<hr id="${e(b.ancla)}" class="cms-separador">`;
    else if(tipo==='espaciador') contenido=`<div id="${e(b.ancla)}" class="cms-espaciador" aria-hidden="true"></div>`;
    else if(tipo==='formulario') contenido=`<section id="${e(b.ancla)}" class="sitio-bloque"><h2>${e(b.titulo||'Contacto')}</h2><p>${e(b.descripcion)}</p>${config.correo ? `<form data-contacto-correo="${e(config.correo)}" class="form-contacto"><label>Nombre<input name="nombre" maxlength="120" autocomplete="name" required></label><label>Correo<input name="correo" type="email" autocomplete="email" required></label><label>Consulta<textarea name="mensaje" maxlength="3000" required></textarea></label><button class="primario" type="submit">Preparar correo ↗</button><small>Abre tu aplicación de correo para enviar la consulta. No se envía automáticamente.</small></form>` : '<p>Completa el correo del negocio en Contacto y ubicación para activar el formulario.</p>'}</section>`;
    else contenido=renderBloques(config,[{...b,tipo:tipo==='comparacion'?'iconos':tipo}],productosPagina);
    contenido=contenido.replace(/ data-entrada="[^"]*"/g,'');
    return `<div class="cms-bloque cms-ancho-${e(diseno.ancho||'normal')} cms-alineacion-${e(diseno.alineacion||'izquierda')} cms-sombra-${e(diseno.sombra||'ninguna')} cms-degradado-${e(diseno.degradado||'ninguno')}" style="${e(css.join(';'))}" data-entrada="${e(entrada)}" ${entrada==='parallax'?'data-parallax':''}>${contenido}</div>`;
  }).join('');
  return html+(pagina.sistema==='productos'&&!catalogoMostrado ? (preview?`<section class="catalogo-publico"><h2>${e(config.titulo_catalogo)}</h2><div class="grid">${renderProductosDestacados(productos,config)}</div></section>`:'<div data-catalogo-pagina></div>'):'');
}
export function renderPaginaCMS(sitio,pagina,productos,paginas) {
  const v=visualConfig(sitio.config),fondo=v.fondo_tipo==='video'?`<div class="fondo-video-sitio">${video(v.fondo_video,true)}</div>`:'';
  return `<div id="topo-carrasco" class="sitio-publico identidad-carrasco" style="${e(variablesVisuales(sitio.config))}" ${atributosVisuales(sitio.config)}>${fondo}<header>${renderHeader(sitio.config,sitio.menu,paginas)}</header><main><div id="pagina-cms" class="pagina-construida">${renderBloquesPagina(sitio.config,pagina,productos,{preview:true})}</div><footer>${renderFooter(sitio.config,sitio.menu,paginas)}</footer></main></div>`;
}
export function aplicarSitio(sitio,productos,{catalogo=false,pagina=null,paginas=null,ruta='/'}={}) {
  limpiarExperiencia();
  const {config,bloques,menu}=sitio;
  aplicarFondoExterior(config);
  // El catálogo nunca depende de que siga existiendo una página en el constructor.
  if(catalogo||/^\/(productos|catalogo)\/?$/.test(ruta)) {
    catalogo=true;
    pagina=resolverPaginaPublica(pagina?[{...pagina,ruta:'/productos'}]:paginas,'/productos',config);
  }
  const v = visualConfig(config);
  document.body.classList.add('sitio-publico');
  document.body.id='topo-carrasco';
  document.body.classList.toggle('identidad-carrasco',paginas!==null||config.visual?.identidad==='carrasco-rojo');
  document.body.style.cssText = variablesVisuales(config);
  for (const [clave,valor] of Object.entries({ animaciones:v.animaciones,tarjetas:v.tarjetas_efecto,botones:v.botones_efecto,imagenes:v.imagenes_efecto,fondo:v.fondo_tipo,glass:v.glass,blur:v.blur,sombra:v.sombra,borde:v.borde })) document.body.dataset[clave]=String(valor);
  document.body.style.setProperty('--fondo-imagen',urlSegura(v.fondo_imagen) ? `url("${encodeURI(v.fondo_imagen).replaceAll('"','%22').replaceAll(')','%29')}")` : 'none');
  const catalogoActual=document.querySelector('.catalogo-publico');
  // Recupera el catálogo antes de reemplazar el constructor: conserva sus eventos y filtros.
  if(document.getElementById('pagina-cms')?.contains(catalogoActual)) document.querySelector('main').insertBefore(catalogoActual,document.getElementById('secciones-sitio'));
  document.getElementById('pagina-cms')?.remove();
  document.querySelector('header').innerHTML=renderHeader(config,menu,paginas);
  document.querySelector('header').classList.toggle('header-fijo',v.header_fijo);
  document.querySelector('.intro').innerHTML=renderPortada(config);
  document.querySelector('.intro').id='inicio';
  document.querySelector('.intro').classList.add('hero-premium');
  document.querySelector('.catalogo-publico').id=catalogo ? 'catalogo' : 'destacados';
  document.getElementById('lista-titulo').textContent=catalogo ? config.titulo_catalogo : 'Productos destacados';
  const bloquesPagina=bloques.filter(b=>catalogo ? ['destacados','categoria'].includes(b.tipo) : !['destacados','categoria'].includes(b.tipo));
  document.getElementById('secciones-sitio').innerHTML=renderBloques(config,bloquesPagina,productos)+(catalogo ? '' : renderSecciones(config));
  document.querySelector('footer').innerHTML=renderFooter(config,menu,paginas);
  if(paginas!==null&&!/^\/producto\//.test(ruta)) {
    document.body.classList.add('identidad-carrasco');
    document.querySelector('.intro').hidden=true;catalogoActual.hidden=true;document.getElementById('secciones-sitio').hidden=true;
    const panel=document.createElement('div');panel.id='pagina-cms';panel.className='pagina-construida';
    panel.innerHTML=pagina ? renderBloquesPagina(config,pagina,productos) : '<section class="pagina-no-disponible"><span class="eyebrow">CARRASCO / EQUIPAMIENTO</span><h1>Página no disponible</h1><p>Esta página no está publicada o su dirección ha cambiado.</p><a class="primario" href="/">Volver al inicio ↗</a></section>';
    document.querySelector('main').insertBefore(panel,document.querySelector('footer'));
    const destino=panel.querySelector('[data-catalogo-pagina]');
    if(destino) {destino.append(catalogoActual);catalogoActual.hidden=false;document.getElementById('lista-titulo').textContent=pagina.bloques?.find(b=>b.visible&&b.tipo==='catalogo')?.titulo||config.titulo_catalogo;}
    document.title=`${pagina?.nombre||'Página no disponible'} · ${config.nombre_negocio}`;
  }
  if(paginas===null||/^\/producto\//.test(ruta)) document.title=config.nombre_negocio;
  document.querySelector('meta[name="description"]').content=config.texto_secundario;
  document.getElementById('fondo-video-sitio')?.remove();
  if (v.fondo_tipo==='video' && urlSegura(v.fondo_video)) document.body.insertAdjacentHTML('afterbegin',`<div id="fondo-video-sitio" class="fondo-video-sitio">${video(v.fondo_video,true)}</div>`);
  limpiarExperiencia=activarExperiencia(config);
}


