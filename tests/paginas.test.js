import test from 'node:test';
import assert from 'node:assert/strict';
import { validarPagina, rutaPagina, paginasVisibles, validarBloquePagina, validarDiseno, resolverPaginaPublica } from '../src/paginas-datos.js';
import { renderBloquesPagina, renderMenuPaginas, renderPaginaCMS, renderHeader } from '../src/sitio-render.js';
const padre={id:'00000000-0000-4000-8000-000000000101',nombre:'Productos',slug:'productos',sistema:'productos',padre_id:null,visible:true,en_menu:true,orden:0,ruta:'/productos'};
const hija={id:'00000000-0000-4000-8000-000000000103',nombre:'Multimedia',slug:'multimedia',sistema:'personalizada',padre_id:padre.id,visible:true,en_menu:true,orden:0,ruta:'/productos/multimedia'};
const config={nombre_negocio:'Carrasco',titulo_catalogo:'Catálogo',visual:{}};
test('Eliminar la página visual Productos conserva la ruta del catálogo y sus enlaces',()=>{
  const pagina=resolverPaginaPublica([], '/productos',config);
  assert.equal(pagina.sistema,'productos');
  assert.match(renderBloquesPagina(config,pagina,[]),/data-catalogo-pagina/);
  assert.equal(resolverPaginaPublica([], '/productos/multimedia',config),undefined);
  assert.equal(resolverPaginaPublica([padre],'/productos',config),padre);
  for(const ruta of ['/productos/','/catalogo','/catalogo/']) assert.match(renderBloquesPagina(config,resolverPaginaPublica([],ruta,config),[]),/data-catalogo-pagina/);
  const recreada={...padre,sistema:'personalizada',bloques:[]};
  assert.match(renderBloquesPagina(config,resolverPaginaPublica([recreada],'/productos',config),[]),/data-catalogo-pagina/);
  assert.match(renderHeader(config,[],[]),/href="\/productos">Catálogo/);
  assert.match(renderBloquesPagina(config,{sistema:'inicio',bloques:[{tipo:'destacados_auto',ancla:'destacados',titulo:'Productos destacados',boton_texto:'Ver todos los productos',boton_enlace:'/productos',visible:true,orden:0}]},[]),/href="\/productos"/);
});
test('Rutas jerárquicas, ciclos, colisiones y URLs reservadas',()=>{
  assert.equal(rutaPagina(hija,[padre,hija]),'/productos/multimedia');
  assert.equal(validarPagina(hija,[padre,hija]).slug,'multimedia');
  assert.throws(()=>validarPagina({...hija,slug:'admin'},[padre,hija]));
  assert.throws(()=>validarPagina({...hija,padre_id:hija.id},[padre,hija]));
  assert.throws(()=>validarPagina({...hija,id:crypto.randomUUID()},[padre,hija]),/Ya existe/);
  assert.throws(()=>validarPagina({...hija,slug:'../admin'},[padre,hija]));
});
test('Página padre oculta retira descendientes del menú y ciclos no bloquean el renderer',()=>{
  assert.equal(paginasVisibles([{...padre,visible:false},hija]).length,0);
  assert.match(renderMenuPaginas([padre,hija]),/menu-dropdown/);
  assert.match(renderMenuPaginas([padre,hija]),/\/productos\/multimedia/);
  assert.ok(!renderMenuPaginas([{...padre,visible:false},hija]).includes('Multimedia'));
  assert.equal(renderMenuPaginas([{...padre,padre_id:hija.id},hija]),'');
});
test('Estilos acotados, tipos nuevos y contenido escapado sin CSS ni enlaces ejecutables',()=>{
  assert.throws(()=>validarDiseno({padding:-1}));assert.throws(()=>validarDiseno({color:'red;display:none'}));
  const b=validarBloquePagina({tipo:'imagen',ancla:'foto-prueba',titulo:'<script>mal</script>',visible:true,orden:0,galeria:[],productos_ids:[],opciones:{items:[],animacion:'slide_left'},diseno:{padding:32,color:'#ffffff'}});
  const html=renderBloquesPagina(config,{sistema:'personalizada',bloques:[b]},[]);
  assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/data-entrada="slide_left"/);assert.match(html,/--bloque-padding:32px/);
});
test('Inicio usa destacados reales y categoría se deriva del catálogo; Productos conserva su catálogo',()=>{
  const productos=[{id:'p1',nombre:'Destacado real',precio:123,stock:1,badges:['destacado'],categoria:'Multimedia'},{id:'p2',nombre:'Común real',precio:456,stock:2,badges:[],categoria:'Seguridad'}];
  const bloques=[{tipo:'destacados_auto',ancla:'seleccion',titulo:'Selección',orden:0,visible:true},{tipo:'categorias',ancla:'categorias-prueba',titulo:'Categorías',orden:1,visible:true}];
  const html=renderBloquesPagina(config,{sistema:'inicio',bloques},productos);
  assert.ok(html.includes('Destacado real'));assert.ok(!html.includes('Común real'));assert.match(html,/productos\?categoria=Multimedia/);
  assert.match(renderBloquesPagina(config,{sistema:'productos',bloques:[]},productos),/data-catalogo-pagina/);
  assert.ok(!renderPaginaCMS({config,menu:[]},{sistema:'inicio',bloques},productos,[]).includes('codigo'));
});
