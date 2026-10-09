import { visualConfig } from './visual.js';
import { escapar, urlSegura } from './sitio-datos.js';
let introMostrada = false;

export function activarExperiencia(config, { demo = false } = {}) {
  const v = visualConfig(config);
  const raiz = document.querySelector('.sitio-publico');
  if (!raiz) return () => {};
  let cancelado = false;
  let mm = null;
  const limpiar = [];
  const evento = (el,tipo,fn) => { el?.addEventListener(tipo,fn); limpiar.push(()=>el?.removeEventListener(tipo,fn)); };
  const header = document.querySelector('header');
  const toggle = header?.querySelector('.menu-toggle');
  function cerrarMenu() { header?.classList.remove('menu-abierto'); toggle?.setAttribute('aria-expanded','false'); toggle?.setAttribute('aria-label','Abrir menú'); }
  evento(toggle,'click',()=> {
    const abierto = header.classList.toggle('menu-abierto');
    toggle.setAttribute('aria-expanded',String(abierto));
    toggle.setAttribute('aria-label',abierto ? 'Cerrar menú' : 'Abrir menú');
  });
  evento(header?.querySelector('nav'),'click',event=>{ if(event.target.closest('a')) cerrarMenu(); });
  header?.querySelectorAll('.menu-dropdown').forEach(detalle=>evento(detalle,'toggle',()=>{
    const submenu=detalle.querySelector(':scope > .menu-submenu');
    if(!detalle.open||!submenu) return;
    submenu.classList.remove('submenu-invertido');
    if(submenu.getBoundingClientRect().right>window.innerWidth-12) submenu.classList.add('submenu-invertido');
  }));
  evento(document,'keydown',event=>{ if(event.key==='Escape' && header?.classList.contains('menu-abierto')) { cerrarMenu();toggle?.focus(); } });
  evento(document,'keydown',event=>{if(event.key==='Escape') header?.querySelectorAll('.menu-dropdown[open]').forEach(d=>{d.open=false;});});
  const scroll = () => header?.classList.toggle('header-scroll',window.scrollY > 35);
  evento(window,'scroll',scroll); scroll();
  document.querySelectorAll('[data-comparador]').forEach(input=>evento(input,'input',()=>input.closest('.comparador').style.setProperty('--comparacion',`${input.value}%`)));
  document.querySelectorAll('[data-foto-producto]').forEach(boton=>evento(boton,'click',()=> {
    const imagen = document.querySelector('.producto-foto-principal');
    if (imagen && urlSegura(boton.dataset.fotoProducto)) imagen.src=boton.dataset.fotoProducto;
  }));
  document.querySelectorAll('[data-contacto-correo]').forEach(form=>evento(form,'submit',event=>{
    event.preventDefault();if(demo) return;
    const datos=new FormData(form),correo=form.dataset.contactoCorreo;
    const texto=`Nombre: ${datos.get('nombre')}\nCorreo: ${datos.get('correo')}\n\n${datos.get('mensaje')}`;
    window.location.href=`mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent('Consulta desde la web')}&body=${encodeURIComponent(texto)}`;
  }));
  const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const videos = [...document.querySelectorAll('[data-video-fondo]')];
  const observerVideo = new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
    if (isIntersecting && !preferencia.matches && v.animaciones && !document.hidden) target.play().catch(()=>{});
    else target.pause();
  }),{threshold:0.1});
  videos.forEach(video=>observerVideo.observe(video));
  const pausar = () => videos.forEach(video=>{ if (preferencia.matches || document.hidden) video.pause(); });
  evento(preferencia,'change',pausar); evento(document,'visibilitychange',pausar);
  limpiar.push(()=>{observerVideo.disconnect();videos.forEach(video=>video.pause());});

  let intro = null;
  let timeoutIntro = null;
  function terminarIntro() { if (intro) { intro.remove(); intro=null; } clearTimeout(timeoutIntro); }
  let vista = introMostrada;
  try { vista ||= v.intro_sesion && sessionStorage.getItem('carrasco-intro')==='1'; } catch { /* almacenamiento opcional */ }
  if (v.intro_activa && !preferencia.matches && (!vista || demo)) {
    introMostrada=true;
    try { if(!demo) sessionStorage.setItem('carrasco-intro','1'); } catch { /* opcional */ }
    intro=document.createElement('div');
    intro.className=`intro-marca intro-${v.intro_tipo}`;
    intro.setAttribute('role','status');
    intro.innerHTML=`<div class="intro-logo">${urlSegura(config.logo) ? `<img src="${escapar(config.logo)}" alt="${escapar(config.nombre_negocio)}">` : `<strong>${escapar(config.nombre_negocio)}</strong>`}<span class="intro-linea"></span></div><button type="button" class="intro-saltar">Saltar intro ↗</button>`;
    document.body.append(intro);
    evento(intro.querySelector('button'),'click',terminarIntro);
    // Siempre se libera aunque falle la carga de GSAP o una imagen.
    timeoutIntro=setTimeout(terminarIntro,(v.intro_duracion+1.2)*1000);
  }
  limpiar.push(terminarIntro);
  if (!v.animaciones && !intro) return destruir;
  void Promise.all([import('gsap'),import('gsap/ScrollTrigger')]).then(([mod,plugin])=> {
    if(cancelado) return;
    const gsap=mod.gsap;
    gsap.registerPlugin(plugin.ScrollTrigger);
    mm=gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)',()=> {
      if (intro) {
        const panel=intro;
        const inicio = v.intro_tipo==='zoom' ? {scale:0.75} : v.intro_tipo==='slide' ? {y:50} : v.intro_tipo==='blur' ? {filter:'blur(14px)'} : v.intro_tipo==='reveal' ? {clipPath:'inset(0 100% 0 0)'} : {};
        gsap.timeline({onComplete:terminarIntro}).from(panel.querySelector('.intro-logo'),{...inicio,opacity:0,duration:v.intro_duracion*.4,ease:'power3.out'}).to(panel,{opacity:0,duration:.45,delay:v.intro_duracion*.6});
      }
      if (!v.animaciones) return;
      const desplazamiento=18+v.intensidad*40;
      const inicio = tipo=> tipo==='zoom' ? {scale:0.94} : ['slide','fade_up'].includes(tipo) ? {y:desplazamiento} : tipo==='fade_down' ? {y:-desplazamiento} : tipo==='slide_left' ? {x:-desplazamiento} : tipo==='slide_right' ? {x:desplazamiento} : tipo==='blur' ? {filter:'blur(8px)'} : tipo==='reveal' ? {clipPath:'inset(0 0 100% 0)'} : {};
      const hero=[...document.querySelectorAll('.portada-texto')].find(el=>el.getClientRects().length);
      if(hero) gsap.from([...hero.children],{...inicio(v.entrada),opacity:0,duration:v.velocidad,stagger:.08,ease:'power3.out',clearProps:'all'});
      document.querySelectorAll('[data-entrada]').forEach(elemento=> {
        if(!elemento.getClientRects().length) return;
        const tipo=elemento.dataset.entrada && elemento.dataset.entrada!=='global' ? elemento.dataset.entrada : v.bloques_efecto;
        if (tipo==='ninguno') return;
        gsap.from(elemento,{...inicio(tipo),opacity:0,duration:v.velocidad,ease:'power2.out',clearProps:'all',scrollTrigger:{trigger:elemento,start:'top 94%',once:true}});
      });
      document.querySelectorAll('[data-contador]').forEach(elemento=> {
        const final=Number(elemento.dataset.contador);
        const estado={numero:0};
        gsap.to(estado,{numero:final,duration:v.velocidad*1.5,ease:'power2.out',onUpdate:()=>{elemento.textContent=Number(estado.numero.toFixed(Number.isInteger(final)?0:1)).toLocaleString('es-CL');},scrollTrigger:{trigger:elemento,start:'top 95%',once:true}});
      });
      if (v.logo_efecto==='brillo') header?.querySelector('.marca')?.classList.add('logo-brillo');
      else if(v.logo_efecto!=='ninguno') gsap.from(header?.querySelector('.marca'),{opacity:0,scale:v.logo_efecto==='zoom'?.9:1,duration:v.velocidad,clearProps:'all'});
      if(window.matchMedia('(min-width: 1000px)').matches) document.querySelectorAll('[data-parallax]').forEach(el=>{
        if(!v.parallax&&el.dataset.entrada!=='parallax') return;
        gsap.to(el,{y:-35*v.intensidad,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:1}});
      });
      return ()=> header?.querySelector('.marca')?.classList.remove('logo-brillo');
    });
    mm.add('(prefers-reduced-motion: reduce)',terminarIntro);
  }).catch(()=>terminarIntro());
  function destruir() { cancelado=true;mm?.revert();limpiar.forEach(fn=>fn()); }
  return destruir;
}
