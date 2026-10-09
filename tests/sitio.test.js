import test from 'node:test';
import assert from 'node:assert/strict';
import { validarConfiguracion, validarBloque, validarMenu, urlSegura, visiblesOrdenados, cargarSitio } from '../src/sitio-datos.js';
import { renderBloques, renderPagina, variablesColores } from '../src/sitio-render.js';

const bloque = { id:'a', tipo:'texto', titulo:'Quiénes somos', ancla:'quienes-somos', orden:0, visible:true, galeria:[], productos_ids:[] };
const config = { nombre_negocio:'Mi negocio', texto_principal:'Portada', texto_secundario:'Descripción', color_principal:'#123456', titulo_catalogo:'Catálogo', texto_catalogo_vacio:'Sin productos', texto_pie:'Pie', mostrar_contacto:true, telefono:'+56 9 1234 5678' };

test('URLs y colores no permiten ejecutar código ni insertar CSS', () => {
  for (const url of ['javascript:alert(1)','data:text/html,algo','//example.com']) assert.equal(urlSegura(url,true),'');
  assert.equal(urlSegura('#contacto',true),'#contacto');
  assert.equal(urlSegura('https://example.com'),'https://example.com');
  assert.throws(() => validarConfiguracion({ color_fondo:'#fff;display:none' }));
  assert.throws(() => validarConfiguracion({ logo:'javascript:alert(1)' }));
  assert.throws(() => validarConfiguracion({ correo:'correo inválido' }));
  assert.equal(variablesColores({ color_principal:'#123456', color_fondo:'red;display:none' }), '--color-principal:#123456');
});
test('bloques validan anclas, pares de botones y galería', () => {
  assert.equal(validarBloque({ ...bloque, galeria:'https://example.com/a.jpg\nhttps://example.com/b.png' }).galeria.length,2);
  assert.throws(() => validarBloque({ ...bloque, ancla:'catalogo' }));
  assert.throws(() => validarBloque({ ...bloque, tipo:'script' }));
  assert.throws(() => validarBloque({ ...bloque, boton_texto:'Ir', boton_enlace:'' }));
  assert.throws(() => validarBloque({ ...bloque, galeria:'javascript:alert(1)' }));
  assert.throws(() => validarBloque({ ...bloque, productos_ids:['inventado'] }));
});
test('menú valida enlaces y conserva opciones ocultas solo en administración', () => {
  assert.equal(validarMenu({ nombre:'Contacto', enlace:'#contacto', orden:'3', visible:false }).visible,false);
  assert.throws(() => validarMenu({ nombre:'Ir', enlace:'javascript:alert(1)', orden:0 }));
  assert.deepEqual(visiblesOrdenados([{ id:'c', orden:2, visible:true }, { id:'a', orden:0, visible:false }, { id:'b', orden:1, visible:true }]).map(f=>f.id),['b','c']);
});
test('contenido escapado, bloques ocultos excluidos y productos destacados usan datos reales', () => {
  const productos = [{ id:'p1', nombre:'Antivuelco', codigo:'SKU-PRIVADO', precio:250000, stock:2, vehiculo:'L200', ano:'2024' }];
  const html = renderBloques(config,[
    { ...bloque, titulo:'<script>alert(1)</script>', descripcion:'<img onerror=alert(1)>' },
    { ...bloque, id:'b', ancla:'oculto', visible:false, titulo:'SECRETO' },
    { ...bloque, id:'c', tipo:'destacados', ancla:'destacados', productos_ids:['p1','no-existe'] },
  ], productos);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('SECRETO'));
  assert.ok(!html.includes('SKU-PRIVADO'));
  assert.ok(html.includes('Antivuelco'));
  assert.ok(html.includes('250.000'));
});
test('los nueve tipos se renderizan y el borrador no cambia los datos originales', () => {
  const tipos = ['texto','imagen_texto','banner','accion','contacto','ubicacion','galeria','destacados','personalizada'];
  const sitio = { config, bloques:tipos.map((tipo,i)=>({ ...bloque, id:String(i), tipo, ancla:`seccion-${i}`, orden:i })), menu:[{ id:'m', nombre:'Inicio', enlace:'#inicio', orden:0, visible:true }] };
  const antes = structuredClone(sitio);
  const html = renderPagina(sitio,[]);
  const bloquesHtml=renderBloques(config,sitio.bloques,[]);
  tipos.forEach(tipo => assert.ok(bloquesHtml.includes(`bloque-${tipo}`)));
  assert.ok(!html.includes('bloque-destacados'));
  assert.ok(renderPagina(sitio,[],{catalogo:true}).includes('bloque-destacados'));
  assert.ok(html.includes('https://wa.me/') === false);
  assert.ok(html.includes('tel:+56912345678'));
  assert.deepEqual(sitio,antes);
});
test('un fallo de Supabase al cargar configuración se propaga, sin fabricar contenido', async () => {
  const cliente = { from: tabla => tabla === 'configuracion_sitio'
    ? { select:()=>({ eq:()=>({ single:async()=>({ data:null, error:new Error('SQL pendiente') }) }) }) }
    : { select:()=>({ order:()=>({ order:()=>({ range:async()=>({ data:[],error:null }) }) }) }) } };
  await assert.rejects(cargarSitio(cliente),/SQL pendiente/);
});
