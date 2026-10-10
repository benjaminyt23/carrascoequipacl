import sanitizeHtml from 'sanitize-html';

// Solo URLs de servicios externos conocidos; nunca srcdoc ni páginas del sitio.
export const SERVICIOS_EMBED='Google Maps, YouTube, Vimeo, Google Forms, Microsoft Forms, Typeform, Jotform y Tally';
function urlEmbed(src) {
  let url;try {url=new URL(src);} catch {return '';}
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')) return '';
  const h=url.hostname,p=url.pathname;
  const permitido=(['www.google.com','maps.google.com','www.google.cl'].includes(h)&&p.startsWith('/maps/embed'))
    ||(['www.youtube.com','www.youtube-nocookie.com'].includes(h)&&p.startsWith('/embed/'))
    ||(h==='player.vimeo.com'&&p.startsWith('/video/'))
    ||(h==='docs.google.com'&&p.startsWith('/forms/'))
    ||(['forms.office.com','forms.microsoft.com'].includes(h)&&(p.startsWith('/Pages/ResponsePage.aspx')||p.startsWith('/r/')))
    ||(h.endsWith('.typeform.com')&&p.startsWith('/to/'))
    ||(['form.jotform.com','forms.jotform.com'].includes(h))
    ||(h==='tally.so'&&p.startsWith('/embed/'));
  return permitido?url.href:'';
}
function urlContenido(src,enlace=false) {
  if(enlace&&/^(?:#[a-z][a-z0-9-]*|\/(?!\/)[a-z0-9/?#=&%._-]*)$/i.test(src)) return src;
  try {const url=new URL(src);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';} catch {return '';}
}
export function sanitizarCodigo(valor) {
  const codigo=String(valor??'').trim();
  if(!codigo) throw new Error('Pega contenido en Código HTML / Embed.');
  if(codigo.length>50000) throw new Error('El código debe tener como máximo 50.000 caracteres.');
  let iframes=0;
  const limpio=sanitizeHtml(codigo,{
    allowedTags:['iframe','div','p','span','img','a','br','hr','strong','b','em','i','u','s','h2','h3','h4','ul','ol','li','blockquote','figure','figcaption'],
    allowedAttributes:{iframe:['src','title','loading','allowfullscreen','sandbox','referrerpolicy','allow'],img:['src','alt','loading','decoding'],a:['href','title','target','rel']},
    allowedSchemes:['https'],allowProtocolRelative:false,parseStyleAttributes:false,
    nonTextTags:['script','style','textarea','option','noscript','template'],
    transformTags:{
      iframe:(tag,attrs)=>{
        const src=urlEmbed(attrs.src);
        if(!src) throw new Error('Iframe no permitido. Usa una URL HTTPS de embed de '+SERVICIOS_EMBED+'.');
        if(++iframes>8) throw new Error('Usa como máximo 8 iframes por bloque.');
        return {tagName:tag,attribs:{src,title:(attrs.title||'Contenido externo').slice(0,200),loading:'lazy',allowfullscreen:'',sandbox:'allow-scripts allow-same-origin allow-forms',referrerpolicy:'strict-origin-when-cross-origin',allow:'fullscreen; picture-in-picture'}};
      },
      img:(tag,attrs)=>({tagName:tag,attribs:{src:urlContenido(attrs.src||''),alt:(attrs.alt||'').slice(0,300),loading:'lazy',decoding:'async'}}),
      a:(tag,attrs)=>({tagName:tag,attribs:{href:urlContenido(attrs.href||'',true),title:(attrs.title||'').slice(0,200),...(attrs.target==='_blank'?{target:'_blank',rel:'noopener noreferrer'}:{})}}),
    },
  }).trim();
  if(!limpio||!sanitizeHtml(limpio,{allowedTags:[],allowedAttributes:{}}).trim()&&!/<(?:iframe|img|hr)\b/i.test(limpio)) throw new Error('El código no contiene HTML o un embed permitido. Los scripts y estilos no se admiten.');
  return limpio;
}
export function validarOpcionesCodigo(opciones) {
  const salida={codigo_html:sanitizarCodigo(opciones.codigo_html)};
  for(const [clave,defecto,min,max] of [['embed_ancho',0,0,2400],['embed_alto',450,120,1200]]) {
    const n=opciones[clave]===''||opciones[clave]==null?defecto:Number(opciones[clave]);
    if(!Number.isInteger(n)||n<min||n>max) throw new Error(`${clave==='embed_ancho'?'Ancho':'Alto'} del embed: usa un número entre ${min} y ${max} px.`);
    salida[clave]=n;
  }
  return salida;
}
