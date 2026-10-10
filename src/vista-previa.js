import './style.css';
import './sitio.css';
import './premium.css';
import './identidad.css';
import { renderPagina, renderPaginaCMS, renderHeader, renderFooter, aplicarFondoExterior } from './sitio-render.js';
import { activarExperiencia } from './experiencia.js';
let limpiar=()=>{};
let focoAnterior='';
window.addEventListener('message',event=> {
  if(event.origin!==window.location.origin || event.source!==window.parent || event.data?.tipo!=='carrasco-preview') return;
  const {sitio,productos}=event.data;
  if(!sitio?.config || !Array.isArray(sitio.bloques) || !Array.isArray(sitio.menu) || !Array.isArray(productos)) return;
  limpiar();
  aplicarFondoExterior(sitio.config);
  document.body.innerHTML=event.data.pagina ? renderPaginaCMS(sitio,event.data.pagina,productos,event.data.paginas??[]) : renderPagina(sitio,productos,{catalogo:event.data.catalogo===true});
  // También la vista previa antigua de bloques usa el header y la fuente pública.
  if(!event.data.pagina && Array.isArray(event.data.paginas)) {
    document.querySelector('header').innerHTML=renderHeader(sitio.config,sitio.menu,event.data.paginas);
    document.querySelector('footer').innerHTML=renderFooter(sitio.config,sitio.menu,event.data.paginas);
  }
  document.querySelector('header').classList.toggle('header-fijo',sitio.config.visual?.header_fijo!==false);
  // Vista real con animaciones e interacción local, sin escrituras ni cliente Supabase.
  document.querySelectorAll('a').forEach(a=>a.addEventListener('click',event=> {
    event.preventDefault();
    const hash=a.getAttribute('href').split('#')[1];
    if(hash) document.getElementById(hash)?.scrollIntoView({behavior:'smooth'});
  }));
  const config=event.data.animar===false ? {...sitio.config,visual:{...sitio.config.visual,animaciones:false,intro_activa:false}} : sitio.config;
  document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',ev=>ev.preventDefault()));
  limpiar=activarExperiencia(config,{demo:true});
  if(event.data.foco&&(event.data.foco!==focoAnterior||event.data.animar)) requestAnimationFrame(()=>document.getElementById(event.data.foco)?.scrollIntoView({block:'center'}));
  focoAnterior=event.data.foco||'';
});
window.parent.postMessage({tipo:'carrasco-preview-lista'},window.location.origin);
