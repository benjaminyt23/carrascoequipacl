import test from 'node:test';
import assert from 'node:assert/strict';
import { paginasMenuPreview } from '../src/paginas-admin.js';
import { renderHeader, renderPaginaCMS } from '../src/sitio-render.js';
import { paginasVisibles } from '../src/paginas-datos.js';

test('Preview usa publicaciones: excluye páginas antiguas, ocultas y borradores, con el mismo header público',()=>{
  const publicadas=[
    {id:'inicio',nombre:'Inicio',ruta:'/',visible:true,en_menu:true,padre_id:null,orden:0},
    {id:'oculta',nombre:'Servicios ocultos',ruta:'/servicios',visible:false,en_menu:true,padre_id:null,orden:1},
    {id:'hija',nombre:'Instalación oculta',ruta:'/servicios/instalacion',visible:true,en_menu:true,padre_id:'oculta',orden:2},
    {id:'fuera',nombre:'Promociones privadas',ruta:'/promociones',visible:true,en_menu:false,padre_id:null,orden:3}
  ];
  const antes=structuredClone(publicadas);
  const sitio={config:{nombre_negocio:'Carrasco',whatsapp:'56912345678'},menu:[],bloques:[]};
  const borrador={id:'antigua',nombre:'Productos antiguos',ruta:'/antiguos',visible:true,en_menu:true,bloques:[]};
  const preview=renderPaginaCMS(sitio,borrador,[],paginasMenuPreview(publicadas));
  const headerPublico=renderHeader(sitio.config,sitio.menu,paginasVisibles(publicadas));
  assert.ok(preview.includes('<header>'+headerPublico+'</header>'));
  assert.ok(!headerPublico.includes('Servicios ocultos'));
  assert.ok(!headerPublico.includes('Instalación oculta'));
  assert.ok(!headerPublico.includes('Promociones privadas'));
  assert.ok(!preview.includes('Productos antiguos'));
  assert.match(headerPublico,/href="\/productos">Catálogo/);
  assert.deepEqual(publicadas,antes);
});
