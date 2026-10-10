import test from 'node:test';
import assert from 'node:assert/strict';
import { productosDestacados, filtrarCatalogo } from '../src/productos.js';
import { renderPagina, renderHeader, renderProducto, renderPaginaCMS, renderMenuPaginas } from '../src/sitio-render.js';
import { validarMenu, urlSegura } from '../src/sitio-datos.js';

const productos=Array.from({length:12},(_,n)=>({id:`id-${n}`,nombre:`Pieza ${n}`,vehiculo:n%2 ? 'Mitsubishi L200' : 'Toyota Hilux',ano:'2024',categoria:n%2 ? 'Protección' : 'Iluminación',precio:1000,stock:n%2,badges:n<10 ? ['destacado',...(n%2 ? ['nuevo'] : ['oferta'])] : []}));
test('Inicio incluye solo destacados, limita a ocho y no completa con productos comunes',()=>{
  assert.equal(productosDestacados(productos).length,8);
  assert.deepEqual(productosDestacados(productos.slice(9)).map(p=>p.id),['id-9']);
  const html=renderPagina({config:{nombre_negocio:'Carrasco'},bloques:[],menu:[]},productos);
  assert.match(html,/Productos destacados/);
  assert.match(html,/href="\/productos">Ver todos los productos/);
  assert.ok(!html.includes('Pieza 8'));
  assert.ok(!html.includes('Pieza 11'));
  assert.equal(productos.length,12);
});
test('Catálogo mantiene todos por defecto y combina consulta, categoría, vehículo y estado',()=>{
  assert.equal(filtrarCatalogo(productos).length,12);
  assert.deepEqual(filtrarCatalogo(productos,{consulta:'l200',categoria:'Protección',vehiculo:'Mitsubishi L200',estado:'nuevo'}).map(p=>p.id),['id-1','id-3','id-5','id-7','id-9']);
  assert.equal(filtrarCatalogo(productos,{categoria:'Iluminación',estado:'disponible'}).length,0);
  assert.equal(filtrarCatalogo(productos,{consulta:'inexistente'}).length,0);
});
test('Navegación y enlaces antiguos de catálogo apuntan a la nueva ruta pública',()=>{
  assert.match(renderHeader({nombre_negocio:'Carrasco'},[{visible:true,orden:0,nombre:'Productos',enlace:'#catalogo'}]),/href="\/productos">Catálogo/);
  assert.match(renderProducto(productos[0],{},productos),/href="\/productos">← Volver al catálogo/);
  assert.equal(validarMenu({nombre:'Productos',enlace:'/productos',orden:0,visible:true}).enlace,'/productos');
  assert.equal(urlSegura('//evil.test',true),'');
  assert.equal(urlSegura('/productos',false),'');
});

test('Web y vista previa omiten Productos de páginas y menú manual conservando Catálogo y subpáginas',()=>{
  const paginas=[{id:'inicio',nombre:'Inicio',ruta:'/',sistema:'inicio',padre_id:null,en_menu:true,visible:true,orden:0},
    {id:'productos',nombre:'Productos',ruta:'/productos',sistema:'productos',padre_id:null,en_menu:true,visible:true,orden:1},
    {id:'accesorios',nombre:'Accesorios',ruta:'/productos/accesorios',sistema:'personalizada',padre_id:'productos',en_menu:true,visible:true,orden:2}];
  const antes=structuredClone(paginas);
  const sitio={config:{nombre_negocio:'Carrasco'},bloques:[],menu:[{nombre:'Productos',enlace:'/equipamiento',visible:true,orden:1},{nombre:'Listado',enlace:'/catalogo/',visible:true,orden:2}]};
  const publico=renderHeader(sitio.config,sitio.menu,paginas);
  const preview=renderPaginaCMS(sitio,{...paginas[0],bloques:[]},[],paginas);
  assert.ok(preview.includes('<header>'+publico+'</header>'));
  assert.ok(!publico.includes('>Productos</'));
  assert.ok(!publico.includes('>Listado</'));
  assert.equal((publico.match(/href="\/productos"/g)||[]).length,1);
  assert.match(publico,/href="\/productos">Catálogo/);
  assert.match(renderMenuPaginas(paginas),/href="\/productos\/accesorios"/);
  assert.deepEqual(paginas,antes);
});
