import { TIPOS_BLOQUE, validarBloque } from './sitio-datos.js';
import { validarOpcionesCodigo } from './codigo-personalizado.js';

// El catálogo es una ruta de la aplicación, independiente de su página visual editable.
export function resolverPaginaPublica(paginas,ruta,config) {
  const normalizada=ruta.replace(/\/$/,'')||'/';
  const esCatalogo=['/productos','/catalogo'].includes(normalizada);
  const pagina=paginas?.find(p=>p.ruta===(esCatalogo?'/productos':normalizada));
  if(!esCatalogo) return pagina;
  if(pagina) return pagina.sistema==='productos'?pagina:{...pagina,sistema:'productos'};
  return {nombre:config.titulo_catalogo||'Catálogo',sistema:'productos',ruta:'/productos',bloques:[{tipo:'catalogo',ancla:'catalogo-carrasco',titulo:config.titulo_catalogo,visible:true,orden:0}]};
}

export const TIPOS_PAGINA = { ...TIPOS_BLOQUE, codigo_personalizado:'Código personalizado', hero_sitio:'Hero principal del negocio', destacados_auto:'Destacados de Inicio', categorias:'Categorías del catálogo', catalogo:'Catálogo completo (buscador y filtros)', imagen:'Imagen', formulario:'Formulario de contacto por correo', comparacion:'Comparación', separador:'Separador', espaciador:'Espaciador' };
export const ANIMACIONES_BLOQUE=['global','ninguno','fade','slide','fade_up','fade_down','slide_left','slide_right','zoom','reveal','blur','parallax'];
export const PALETA_CARRASCO={color_principal:'#f14545',color_secundario:'#ff6464',color_fondo:'#101114',color_texto:'#f4f4f5',color_botones:'#d92d36',color_tarjetas:'#1b1d22',color_encabezado:'#101114',color_pie:'#15161a'};
const idValido=id=>/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id??'');
export function validarPagina(datos,paginas=[]) {
  const pagina={id:datos.id||crypto.randomUUID(),nombre:String(datos.nombre??'').trim(),slug:String(datos.slug??'').trim().replace(/^\/+|\/+$/g,''),padre_id:datos.padre_id||null,orden:Number(datos.orden??0),en_menu:!!datos.en_menu,nombre_menu:String(datos.nombre_menu??'').trim(),icono:String(datos.icono??'').trim(),nueva_pestana:!!datos.nueva_pestana,sistema:datos.sistema||'personalizada'};
  if(!idValido(pagina.id)||!pagina.nombre||pagina.nombre.length>120) throw new Error('Completa un nombre de página de hasta 120 caracteres.');
  if(!['inicio','productos','personalizada'].includes(pagina.sistema)) throw new Error('Tipo de página inválido.');
  if(pagina.sistema==='inicio') {pagina.slug='';pagina.padre_id=null;}
  else if(pagina.sistema==='productos') {pagina.slug='productos';pagina.padre_id=null;}
  else if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pagina.slug)||['admin','producto','vista-previa','index','assets'].includes(pagina.slug)||pagina.slug.length>80) throw new Error('La URL debe ser una palabra en minúsculas con guiones, por ejemplo instalaciones.');
  if(!Number.isSafeInteger(pagina.orden)||Math.abs(pagina.orden)>2147483647) throw new Error('El orden debe ser un número entero.');
  if(pagina.icono.length>12||pagina.nombre_menu.length>120) throw new Error('Revisa el icono o nombre visible del menú.');
  const vistos=new Set([pagina.id]);let padre=pagina.padre_id;let profundidad=0;
  while(padre) {
    if(vistos.has(padre)||++profundidad>6) throw new Error('Una página no puede ser hija de sí misma o de sus descendientes. Máximo seis niveles.');
    vistos.add(padre);const fila=paginas.find(p=>p.id===padre);
    if(!fila) throw new Error('La página padre ya no existe.');padre=fila.padre_id;
  }
  if(paginas.some(p=>p.id!==pagina.id&&p.slug===pagina.slug&&(p.padre_id||null)===pagina.padre_id)) throw new Error('Ya existe esa URL dentro de la misma página padre.');
  return pagina;
}
export function rutaPagina(pagina,paginas) {
  const partes=[];const vistos=new Set();let actual=pagina;
  while(actual) {if(vistos.has(actual.id)) return '';vistos.add(actual.id);if(actual.slug) partes.unshift(actual.slug);actual=paginas.find(p=>p.id===actual.padre_id);}
  return '/'+partes.join('/');
}
export function paginasVisibles(paginas) {
  const visible=(p,vistos=new Set())=>{
    if(!p.visible||vistos.has(p.id)) return false;
    if(!p.padre_id) return true;
    const padre=paginas.find(x=>x.id===p.padre_id);vistos.add(p.id);
    return !!padre&&visible(padre,vistos);
  };
  return paginas.filter(p=>visible(p)).sort((a,b)=>a.orden-b.orden||a.nombre.localeCompare(b.nombre,'es'));
}
export function validarDiseno(datos={}) {
  const salida={};
  for(const [clave,min,max] of [['padding',0,160],['margin',0,100],['altura',0,1000],['radio',0,60],['columnas',1,4]]) if(datos[clave]!==''&&datos[clave]!=null) {
    const n=Number(datos[clave]);if(!Number.isFinite(n)||n<min||n>max) throw new Error(`${clave}: usa un valor entre ${min} y ${max}.`);salida[clave]=n;
  }
  for(const clave of ['fondo','color','borde']) if(datos[clave]) {if(!/^#[\da-f]{6}$/i.test(datos[clave])) throw new Error('Selecciona un color válido para el bloque.');salida[clave]=datos[clave];}
  for(const [clave,opciones] of Object.entries({ancho:['normal','amplio','completo'],alineacion:['izquierda','centro','derecha'],sombra:['ninguna','suave','profunda'],degradado:['ninguno','rojo','grafito','claro']})) if(datos[clave]) {if(!opciones.includes(datos[clave])) throw new Error('Selecciona un estilo válido.');salida[clave]=datos[clave];}
  return salida;
}
export function validarBloquePagina(datos) {
  if(!TIPOS_PAGINA[datos.tipo]) throw new Error('Tipo de bloque inválido.');
  const original=datos.tipo;
  const especial=!TIPOS_BLOQUE[original];
  const opciones=datos.opciones??{};
  if(opciones.animacion&&!ANIMACIONES_BLOQUE.includes(opciones.animacion)) throw new Error('Animación inválida.');
  const bloque=validarBloque({...datos,tipo:especial?'texto':original,opciones:{...opciones,animacion:'global',items:opciones.items??[]}});
  bloque.id=idValido(datos.id)?datos.id:crypto.randomUUID();bloque.tipo=original;
  bloque.opciones.animacion=opciones.animacion||'global';
  if(original==='codigo_personalizado') Object.assign(bloque.opciones,validarOpcionesCodigo(opciones));
  bloque.diseno=validarDiseno(datos.diseno);
  return bloque;
}
export async function leerTablaPaginas(cliente,tabla) {
  const filas=[];
  for(let n=0;;n+=500) {const {data,error}=await cliente.from(tabla).select('*').order('orden').order('id').range(n,n+499);if(error) throw error;filas.push(...data);if(data.length<500) return filas;}
}
export async function cargarPaginasPublicas(cliente) {return paginasVisibles(await leerTablaPaginas(cliente,'paginas_publicadas'));}
