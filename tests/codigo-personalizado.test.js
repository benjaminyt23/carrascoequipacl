import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizarCodigo, validarOpcionesCodigo } from '../src/codigo-personalizado.js';
import { validarBloquePagina } from '../src/paginas-datos.js';
import { renderBloquesPagina } from '../src/sitio-render.js';
const mapa='<iframe src="https://www.google.com/maps/embed?pb=ejemplo" width="600" height="450" style="border:0" onload="alert(1)" allowfullscreen></iframe>';
const config={titulo_catalogo:'Catálogo',visual:{}};
test('Mapas y videos: URLs de embed, sandbox impuesto, tamaño responsive y limpieza idempotente',()=>{
  const html=sanitizarCodigo(mapa);
  assert.match(html,/maps\/embed/);assert.match(html,/sandbox="allow-scripts allow-same-origin allow-forms"/);
  assert.ok(!/onload|style=|width=|height=/.test(html));
  assert.equal(sanitizarCodigo(html),html);
  assert.match(sanitizarCodigo('<iframe src="https://www.youtube-nocookie.com/embed/video"></iframe>'),/youtube-nocookie/);
  assert.match(sanitizarCodigo('<iframe src="https://docs.google.com/forms/d/e/id/viewform?embedded=true"></iframe>'),/docs.google.com/);
});
test('No ejecuta scripts, handlers, CSS, srcdoc, SVG ni enlaces javascript incluso con entidades',()=>{
  const html=sanitizarCodigo('<div id="app" style="position:fixed" onclick="mal()"><script>alert(1)</script><p>Texto real</p><a href="java&#x73;cript:alert(1)">Enlace</a><img src="https://example.com/foto.png" onerror="mal()"><svg onload="mal()"><script>mal()</script></svg></div>');
  assert.match(html,/Texto real/);
  assert.ok(!/script|onclick|onerror|onload|style=|id=|<svg|alert|mal\(/.test(html));
  const iframe=sanitizarCodigo('<iframe src="https://www.youtube.com/embed/video" srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;" sandbox="allow-top-navigation" allow="camera; microphone"></iframe>');
  assert.ok(!/srcdoc|allow-top-navigation|camera|microphone/.test(iframe));
});
test('Rechaza iframes arbitrarios, URLs relativas, dominios falsos y contenido vacío',()=>{
  for(const src of ['javascript:alert(1)','data:text/html,prueba','//www.youtube.com/embed/video','/admin','https://example.com/widget','https://www.youtube.com.evil.com/embed/video','https://evil@www.youtube.com/embed/video','https://www.google.com/search?q=prueba']) assert.throws(()=>sanitizarCodigo(`<iframe src="${src}"></iframe>`),/Iframe no permitido/);
  for(const html of ['','<script>alert(1)</script>','<style>body{display:none}</style>','<div></div>']) assert.throws(()=>sanitizarCodigo(html));
  assert.throws(()=>sanitizarCodigo('x'.repeat(50001)),/50.000/);
});
test('Se guarda código limpio separado de productos y se valida el tamaño',()=>{
  const b=validarBloquePagina({tipo:'codigo_personalizado',ancla:'mapa-externo',visible:true,orden:0,opciones:{codigo_html:mapa,embed_ancho:800,embed_alto:500,items:[]},diseno:{padding:20,radio:12}});
  assert.match(b.opciones.codigo_html,/iframe/);assert.equal(b.opciones.embed_alto,500);
  const html=renderBloquesPagina(config,{sistema:'personalizada',bloques:[b]},[]);
  assert.match(html,/--embed-ancho:800px;--embed-alto:500px/);assert.ok(!html.includes('onload'));
  assert.throws(()=>validarOpcionesCodigo({codigo_html:mapa,embed_alto:-1}));
});
test('Contenido inseguro escrito directamente en Supabase se limpia o falla sin romper otros bloques',()=>{
  const b={tipo:'codigo_personalizado',ancla:'embed',visible:true,orden:0,opciones:{codigo_html:'<script>mal()</script><p>Seguro</p>'}};
  assert.match(renderBloquesPagina(config,{sistema:'personalizada',bloques:[b]},[]),/Seguro/);
  const html=renderBloquesPagina(config,{sistema:'personalizada',bloques:[{...b,opciones:{codigo_html:'<iframe src="javascript:alert(1)"></iframe>'}},{tipo:'texto',ancla:'otro',titulo:'Bloque conservado',visible:true,orden:1}]},[]);
  assert.match(html,/contenido externo no está disponible/);assert.match(html,/Bloque conservado/);assert.ok(!html.includes('javascript:'));
});
