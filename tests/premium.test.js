import test from 'node:test';
import assert from 'node:assert/strict';
import { validarVisual, visualConfig, slugProducto, enlaceWhatsApp } from '../src/visual.js';
import { validarProducto } from '../src/productos.js';
import { validarBloque } from '../src/sitio-datos.js';
import { renderProducto, renderTarjeta, renderBloques, renderPagina } from '../src/sitio-render.js';
const p={id:'00000000-0000-4000-8000-000000000016',nombre:'Antivuelco L200',codigo:'NO-PUBLICAR',vehiculo:'Mitsubishi L200',ano:'2024',precio:250000,stock:2,descripcion:'Descripción real',instalacion:'Incluida',foto:'https://example.com/a.jpg'};
const config={nombre_negocio:'Carrasco',whatsapp:'+56 9 1234 5678',titulo_catalogo:'Productos',color_principal:'#20352d',visual:{}};
test('opciones visuales acotadas y reducidas a fuentes/efectos permitidos',()=>{
  assert.throws(()=>validarVisual({velocidad:10}));
  assert.throws(()=>validarVisual({intensidad:-1}));
  assert.throws(()=>validarVisual({fuente_principal:'Arial;display:none'}));
  assert.throws(()=>validarVisual({intro_tipo:'script'}));
  assert.throws(()=>validarVisual({intro_activa:'false'}));
  assert.throws(()=>validarVisual({hero_video:'javascript:alert(1)'}));
  assert.throws(()=>validarVisual({hero_video:'#catalogo'}));
  assert.equal(validarVisual({hero_enlace:'#catalogo'}).hero_enlace,'#catalogo');
  assert.equal(visualConfig({visual:{radio:-50}}).radio,18);
  assert.equal(visualConfig({visual:{intro_activa:false}}).intro_activa,false);
});
test('enlaces de producto únicos y SKU excluido incluso del texto de WhatsApp',()=>{
  assert.notEqual(slugProducto(p),slugProducto({...p,id:'otro-id'}));
  assert.equal(slugProducto({...p,slug:'antivuelco-l200'}),'antivuelco-l200');
  assert.ok(!decodeURIComponent(enlaceWhatsApp(config,p)).includes('NO-PUBLICAR'));
  const html=renderTarjeta(p,config)+renderProducto({...p,galeria:['https://example.com/b.png']},config,[p]);
  assert.ok(!html.includes('NO-PUBLICAR'));
  assert.ok(html.includes('250.000'));
  assert.ok(html.includes('data-foto-producto'));
  assert.ok(html.includes('Disponible'));
  assert.ok(!html.includes('badge-oferta'));
});
test('validación de producto conserva galería y etiquetas explícitas',()=>{
  const datos={...p,slug:'antivuelco-l200',categoria:'Protección',galeria:'https://example.com/a.jpg\nhttps://example.com/b.webp',badges:['destacado']};
  assert.equal(validarProducto(datos).galeria.length,2);
  assert.equal(validarProducto(datos).badges[0],'destacado');
  assert.throws(()=>validarProducto({...datos,slug:'Nombre / inválido'}));
  assert.throws(()=>validarProducto({...datos,badges:['oferta-inventada']}));
  assert.throws(()=>validarProducto({...datos,galeria:'javascript:alert(1)'}));
});
test('formatos avanzados usan datos configurados y no fabrican testimonios o categorías',()=>{
  const tipos=['hero','texto_imagen','video','carrusel','antes_despues','testimonios','estadisticas','marcas','logos','faq','mapa','whatsapp','fondo_imagen','fondo_video','parallax','animada','iconos','categoria'];
  const bloques=tipos.map((tipo,n)=>validarBloque({id:String(n),tipo,titulo:'Sección',ancla:`seccion-${n}`,orden:n,visible:true,galeria:[],productos_ids:[],opciones:{items:[],categoria:'No existe'}}));
  const html=renderBloques(config,bloques,[p]);
  tipos.forEach(tipo=>assert.ok(html.includes(`bloque-${tipo}`)));
  assert.ok(!html.includes('<blockquote>'));
  assert.ok(!html.includes('Antivuelco L200'));
  assert.throws(()=>validarBloque({...bloques[0],opciones:{items:[],video_url:'javascript:alert(1)'}}));
});
test('todos los textos de contenido se escapan en formatos avanzados',()=>{
  const b={id:'a',tipo:'faq',titulo:'<script>alert(1)</script>',ancla:'preguntas',orden:0,visible:true,opciones:{items:['<img onerror=x> | <script>mal</script>']}};
  const html=renderPagina({config,bloques:[b],menu:[]},[p]);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
