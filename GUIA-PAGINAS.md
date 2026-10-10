# Carrasco · Páginas, identidad visual y vista previa

## 1. Activar el sistema en Supabase

Abre el mismo proyecto de Supabase donde están tus productos. En Visual Studio Code abre `supabase/paginas-carrasco.sql`, copia **todo** y pégalo en **Supabase → SQL Editor → New query → Run**.

Antes deben existir las tablas de `sitio-editable.sql` y los campos de `diseno-premium.sql`. Si ya ejecutaste esos dos archivos correctamente, no los repitas. `Success. No rows returned` es normal.

La migración crea:

| Tabla | Función | Acceso público |
| --- | --- | --- |
| `paginas` | Nombre, URL, padre, orden, menú y estado del borrador | No |
| `bloques_pagina` | Bloques y su configuración de diseño en borrador | No |
| `paginas_publicadas` | Última versión publicada de cada página, con bloques visibles | Solo páginas visibles y con todos sus padres visibles |

Solo los usuarios de `administradores` pueden guardar, publicar, duplicar, ocultar o eliminar páginas. Las operaciones de guardar y publicar son transacciones: un fallo no deja media página guardada. La revisión del borrador evita sobrescribir cambios de otra sesión sin avisar.

No cambia productos, administradores, fotos, autenticación ni sus políticas RLS. No elimina `bloques_sitio` ni `menu_sitio`. Copia los bloques anteriores a las páginas nuevas y conserva sus originales en **Archivo de bloques**. La copia inicial ocurre una sola vez.

La paleta inicial cambia a rojo, grafito y blanco como pediste. Sus ocho colores anteriores quedan respaldados en `configuracion_sitio.visual.paleta_anterior`. Repetir la migración no vuelve a cambiar los colores ni duplica el contenido inicial.

## 2. Probar en tu computador

```bash
npm install
npm run dev
```

Abre la dirección indicada por Vite y entra manualmente a `/admin`. Inicia sesión con tu administrador habitual. El público sigue sin enlaces hacia administración.

## 3. Crear una página

1. En **Páginas**, pulsa **Crear página**.
2. Completa el nombre, por ejemplo **Instalaciones**.
3. En URL escribe `instalaciones`. El panel mostrará `/instalaciones`.
4. Elige **Sin página padre** para una página principal.
5. Define el orden, si aparece en el menú, el nombre visible, un icono opcional y si abre en otra pestaña.
6. Añade bloques y pulsa **Guardar borrador**.
7. Revisa la vista previa y pulsa **Guardar y publicar** cuando esté lista.

**Guardar borrador** no cambia el sitio público. **Guardar y publicar** guarda primero y luego publica la página. Si publicar falla, se conserva el borrador y se muestra el motivo. La página pública se actualiza al recargar, sin otro despliegue.

Inicio conserva `/` y no tiene botón Eliminar: es la página de entrada del sistema. Con la actualización `eliminar-paginas.sql`, la página visual Productos sí tiene botón Eliminar; el catálogo independiente conserva `/productos`. Consulta `GUIA-ELIMINAR-PAGINAS.md`. Puedes editar nombres, menú, diseño y bloques. Productos conserva un catálogo completo aunque quites accidentalmente su bloque de catálogo. Inicio nunca rellena destacados con productos comunes.

## 4. Crear una subpágina

Ejemplo: **Multimedia** dentro de **Productos**.

1. Crea una página llamada **Multimedia**.
2. En URL escribe solamente `multimedia`.
3. En **Página padre**, selecciona **Productos**.
4. La vista previa de URL mostrará `/productos/multimedia`.
5. Añade tus bloques, guarda y publica.

Publica primero el padre. Si cambias la URL o padre de una página, publica esos cambios antes de publicar sus hijos. Las subpáginas ya publicadas ajustan sus rutas cuando publicas un cambio de URL del padre. Los enlaces anteriores no tienen redirecciones automáticas.

No se permiten ciclos ni URLs que interfieran con `/admin`, las fichas `/producto/…` o archivos del sistema. Hay un máximo de seis niveles de subpáginas.

## 5. Bloques y orden

Entra en **Páginas → Editar → Agregar bloque**. Selecciona el tipo y completa los campos que aparecen. Hay texto, imagen, hero, imagen/texto, video, galería, carrusel, categorías, destacados, catálogo, FAQ, comparación, testimonios, estadísticas, logos, contacto, mapa, separador, espaciador y otros formatos anteriores.

- **Hero principal del negocio** utiliza textos, portada, logo y botones de Configuración y Hero / portada. Se puede mover dentro de la página.
- **Hero** permite contenido independiente para otra página.
- **Destacados de Inicio** lee los productos marcados Destacado, con un máximo de ocho. Sus precios y stock salen de Supabase.
- **Categorías** genera tarjetas desde las categorías reales de los productos; cada tarjeta abre el catálogo con esa categoría seleccionada.
- **Productos por categoría** muestra coincidencias exactas con la categoría configurada.
- **Catálogo completo** conserva búsqueda y filtros públicos. En Inicio se presenta como destacados para conservar la separación de páginas.

Cada bloque tiene un identificador de sección único. Puedes cambiar visibilidad, alineación, ancho, espacio interior/exterior, altura, redondeado, colores, degradado, sombra y animación. Las columnas se adaptan a tablet y celular. Los controles específicos de imágenes, video, galería o productos aparecen según el tipo.

**Aplicar al borrador** incorpora el bloque a la página local, sin publicarlo. Arrastra las filas para ordenar o usa ↑/↓ en celular. Puedes duplicar o quitar bloques. Guarda el borrador de la página para conservar estos cambios en Supabase; después publica para mostrarlos al público.

La intro es una superposición inicial, independiente del orden de bloques. Se configura en **Animaciones e intro**. El encabezado y footer son elementos compartidos; el footer permanece al final de las páginas.

## 6. Vista previa de escritorio, tablet y celular

En **Vista previa** elige la página y pulsa **Escritorio**, **Tablet** o **Celular**. El celular se muestra en un marco de teléfono con un viewport de 390 px. La vista de escritorio es de 1200 px y tablet de 768 px; se reducen visualmente para caber en el panel, conservando el ancho real de la página simulada.

También hay una vista previa junto al editor y dentro del formulario de bloque. Los textos, imágenes por URL, estilos, menú y orden se actualizan después de una breve pausa al editar. Un dato inválido muestra un aviso y conserva la última vista válida.

Para evitar reiniciar animaciones en cada letra que escribes, las actualizaciones normales muestran el contenido quieto. Pulsa **Probar animaciones** para reproducirlas. Dentro del editor de un bloque, la vista se desplaza hacia ese bloque.

La vista usa el mismo renderizado y CSS del sitio público. No publica ni escribe en Supabase. Sus enlaces externos y formularios no envían información. El catálogo en vista previa muestra las tarjetas; los filtros se prueban en la página pública `/productos`.

## 7. Colores, imágenes y contacto

En **Apariencia** cambia los selectores de color o pulsa **Aplicar paleta Carrasco**. Revisa en Vista previa y pulsa **Guardar cambios**. Los colores, configuración general y contacto son compartidos y se guardan con sus botones independientes: estos guardados se aplican al sitio público, sin necesitar publicar nuevamente todas las páginas.

Sube tu logo y fotografías reales para completar la identidad. Las imágenes continúan en Storage `productos`, con JPG/JPEG/PNG/WEBP y máximo 5 MB. Se suben inmediatamente, pero solo se muestran en una página pública cuando publicas su borrador. Cancelar un bloque no elimina el archivo subido.

Los videos usan una URL pública directa MP4 o WEBM; este editor no sube videos. El formulario de contacto prepara un correo en la aplicación del visitante, para que él lo envíe. No tiene un servidor de envío automático ni muestra confirmaciones falsas de entrega. Requiere el correo del negocio en Contacto y ubicación.

## 8. Menú, ocultar y eliminar

El menú automático utiliza las páginas publicadas con **Mostrar en el menú** activado. Ordena con el campo **Orden de página** y publica. Un padre con hijos muestra un dropdown accesible; el menú móvil utiliza hamburguesa. Si un padre visible se retira solo del menú, los hijos seleccionados se muestran como opciones principales.

**Menú adicional** conserva los enlaces anteriores a secciones y sitios externos. Los enlaces de Inicio y Productos se obtienen de las páginas, para no duplicarlos.

**Ocultar** retira inmediatamente una página de la web y del menú. Sus subpáginas también dejan de ser públicas. Los borradores se conservan. Para volver a mostrarla, abre el editor y publica. Para eliminar una página con hijos, mueve y publica los hijos primero. Duplicar copia sus bloques como un borrador nuevo; no duplica automáticamente las subpáginas.

## 9. Publicar el código y verificar

Después de ejecutar el SQL y revisar localmente:

```bash
npm test
npm run build
git add .
git commit -m "Agregar constructor de paginas e identidad Carrasco"
git push
```

Vercel mantiene `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y la salida `dist`. No hacen falta claves nuevas. Las rutas de páginas y subpáginas tienen fallback a la aplicación, sin interceptar los assets ni `vista-previa.html`.

Prueba Inicio, `/productos`, una ficha de producto y una subpágina publicada entrando directamente por su URL y recargando. Guarda un cambio como borrador y confirma en otra pestaña pública que aún se ve el anterior. Publica y confirma el cambio. Oculta un padre y comprueba que tampoco se abre su hijo. Prueba con sesión cerrada y con una cuenta fuera de `administradores`.

PGlite se añadió como dependencia de **desarrollo** para comprobar la migración y RLS en PostgreSQL local, sin tocar Supabase. No forma parte de la web publicada. GSAP sigue siendo la librería de animaciones; no se instaló otro motor de animación.

Los productos y los campos del futuro bot permanecen separados del constructor. No se conectó WhatsApp ni OpenAI; los enlaces de contacto existentes siguen siendo enlaces normales.

## 10. Archivos de esta actualización

### Nuevos

| Archivo | Para qué sirve |
| --- | --- |
| `src/identidad.css` | Identidad rojo/grafito/blanco, menú, bloques y editor adaptable |
| `src/paginas-admin.js` | Editor de páginas, subpáginas, bloques, borradores y vista previa |
| `src/paginas-datos.js` | Validaciones, rutas jerárquicas y lectura de páginas publicadas |
| `supabase/paginas-carrasco.sql` | Nuevas tablas, RLS, publicación y migración inicial conservando datos |
| `tests/paginas.test.js` | Comprueba rutas, estilos, contenido seguro y catálogo |
| `tests/paginas-sql.test.js` | Comprueba la migración, permisos y publicación en PostgreSQL local |
| `GUIA-PAGINAS.md` | Esta guía paso a paso |

### Modificados

| Archivo | Cambio |
| --- | --- |
| `src/main.js` | Rutas públicas del constructor y carga del editor solo en administración |
| `src/sitio-admin.js` | Integra Páginas, Vista previa y paleta Carrasco |
| `src/sitio-render.js` | Renderiza páginas, bloques y menú jerárquico conservando catálogo y fichas |
| `src/sitio-datos.js` | Admite enlaces internos seguros para las nuevas páginas |
| `src/visual.js` | Valida enlaces internos de los botones del hero |
| `src/experiencia.js` | Animaciones por bloque, dropdowns y formulario de contacto |
| `src/vista-previa.js` | Vista previa con el mismo diseño y renderizado público |
| `vercel.json` | Permite abrir páginas y subpáginas directamente |
| `package.json`, `pnpm-lock.yaml` | Dependencia de desarrollo PGlite para pruebas SQL |
| `README.md` | Enlace a esta guía y aclaración del editor anterior |

Los demás archivos que ya estaban pendientes en Git pertenecen a las mejoras anteriores. No se hizo commit, push ni despliegue en esta actualización.
