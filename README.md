# Carrasco Equipa · Catálogo y administración

Aplicación sencilla con Vite y JavaScript. Los productos se leen y guardan directamente en Supabase. No incluye WhatsApp, OpenAI, productos inventados ni almacenamiento local alternativo para el catálogo.

## Constructor de páginas e identidad Carrasco

Para activar **Páginas**, **Vista previa** en tiempo real y la identidad rojo/grafito/blanco, ejecuta `supabase/paginas-carrasco.sql` después de las migraciones anteriores. Conserva los productos y las políticas existentes, copia el contenido anterior y crea borradores privados y versiones públicas independientes. Consulta [GUIA-PAGINAS.md](GUIA-PAGINAS.md) para los pasos de páginas, subpáginas, bloques, colores, menú, móvil y publicación.

Una vez activado, edita los bloques desde **Páginas**. **Archivo de bloques** conserva los originales del editor anterior. **Menú adicional** conserva los enlaces manuales; el menú principal se genera desde las páginas publicadas. Las instrucciones siguientes sobre la distribución fija de bloques corresponden al editor anterior, disponible como respaldo si todavía falta la migración.

## 1. Configurar Supabase

1. Crea un proyecto en Supabase.
2. En **SQL Editor**, abre una consulta, pega el contenido de `supabase/schema.sql` y ejecútalo. Crea `productos` y `administradores`, y sus permisos.
3. En **Authentication → Users → Add user**, crea tu usuario con correo y contraseña y confirma su correo (puedes usar Auto Confirm al crearlo desde el panel).
4. Copia el **UUID** de ese usuario. En SQL Editor ejecuta:

   ```sql
   insert into public.administradores (user_id)
   values ('PEGA-AQUI-EL-UUID-REAL')
   on conflict do nothing;
   ```

5. En la configuración del proyecto, copia la **Project URL** y la clave pública **anon** (también se admite la clave **publishable**). Nunca copies `service_role` ni una clave `secret`.
6. Desactiva el registro público de usuarios en Authentication si no lo necesitas. El panel no ofrece registro y solo los UUID autorizados pueden escribir.

El catálogo es público: cualquiera puede consultar sus datos, incluidos precio, stock y descripción. Solo los administradores autorizados pueden agregar, editar o eliminar. Estas restricciones se aplican en Supabase mediante RLS, no solo con botones ocultos.

Si ya existe una tabla `productos`, revisa que tenga las columnas y tipos del SQL antes de ejecutarlo: `create table if not exists` no convierte una tabla existente. Revisa también políticas previas: las políticas permisivas adicionales pueden otorgar acceso de escritura. Este script solo reemplaza las políticas cuyos nombres declara y no borra datos ni otras políticas.

## 2. Ejecutar en tu computador

### Inicio y catálogo completo

- **Inicio (`/`)** muestra solamente hasta ocho productos marcados como **Destacado**, primero los más recientes según el orden del catálogo. No se rellena con productos comunes cuando hay menos destacados. El botón **Ver todos los productos** abre `/productos`.
- **Catálogo (`/productos`)** muestra todos los productos y permite combinar buscador, categoría, vehículo y estado (disponible, destacado, nuevo u oferta). **Limpiar filtros** restaura el catálogo completo. Las categorías y vehículos se obtienen de los productos reales, sin opciones inventadas.
- En **`/admin → Productos → Editar`**, marca o desmarca **Destacado**, **Nuevo** y **Oferta**, y pulsa **Guardar en Supabase**. Marcado significa Sí; desmarcado significa No. Se utiliza la columna `badges` ya creada por `diseno-premium.sql`, sin duplicar datos ni añadir SQL para este cambio.
- Los bloques visuales y de contacto siguen en Inicio. Los bloques adicionales de productos destacados y por categoría se conservan en `/productos`, para que no dupliquen la sección de Inicio. Su botón de vista previa muestra la página de catálogo.
- Los enlaces antiguos `#catalogo` se presentan como `/productos`. En el editor de menú y de botones puedes usar `/productos` directamente. Vercel permite recargar esa ruta.

Para probar: marca entre cuatro y ocho productos como Destacado, recarga Inicio y verifica la selección. Luego abre `/productos`, comprueba que todos siguen presentes, combina búsqueda/filtros y prueba **Limpiar filtros**. Desmarca un destacado y confirma que desaparece de Inicio pero sigue en el catálogo. No se cambian las políticas RLS ni los datos que usará el futuro bot.

### Diseño premium, animaciones y fichas de producto

**SQL nuevo:** ejecuta TODO `supabase/diseno-premium.sql` en **SQL Editor → New query → Run**, después de haber ejecutado `sitio-editable.sql`. No vuelvas a ejecutar scripts antiguos si sus funcionalidades ya funcionan. Esta migración:

- Añade `visual` (JSON) a `configuracion_sitio` para hero, intro, fondos, fuentes y efectos.
- Añade `opciones` (JSON) a `bloques_sitio` y amplía su restricción de tipos para los nuevos formatos.
- Añade `slug`, `categoria`, `galeria` y `badges` a `productos`, sin modificar sus campos ni valores actuales.
- Crea una función de reordenación atómica para bloques, con comprobación de administrador y `SECURITY INVOKER`, respetando RLS.

No cambia las políticas RLS actuales, autenticación, usuarios ni buckets. Si falta la migración, el catálogo aún puede leer los campos antiguos, pero debes ejecutar el SQL antes de guardar las nuevas opciones desde el panel.

**Qué puedes editar sin tocar código**

- **Configuración del sitio:** sigue controlando nombre, textos, logo, portada, catálogo y pie.
- **Hero / portada:** subtítulo y descripción adicionales, dos botones, enlaces, logo, imagen de fondo, color, overlay y URL de video. Si el enlace secundario queda vacío, usa el número de WhatsApp de Contacto y ubicación. Si no hay número, el botón no aparece. El header puede quedar fijo.
- **Animaciones e intro:** activar/desactivar intro, siete estilos, duración y modo una vez por sesión. Animaciones generales, duración de entradas, intensidad, efecto de logo, bloques, tarjetas, botones e imágenes. Parallax optativo solo para escritorio. La intro puede saltarse y nunca bloquea permanentemente el sitio; también funciona si falla una imagen o la librería.
- **Apariencia:** mantiene tus ocho colores; añade fondo sólido, degradado, imagen, video o textura, glassmorphism, blur, sombra, bordes, redondeado, fuentes de títulos/texto, tamaños, peso y espaciado. Las fuentes disponibles son Manrope, DM Sans, Arial y Georgia. El tamaño de títulos se adapta al celular, no es un tamaño fijo en todos los dispositivos.
- **Productos:** añade categoría, enlace opcional (`antivuelco-l200`), etiquetas Nuevo/Oferta/Destacado y galería adicional por URL o subida múltiple. Disponible se calcula exclusivamente desde stock. El enlace debe ser único; si lo dejas vacío, se genera con nombre + UUID. Cambiar un enlace personalizado cambia su URL pública.
- **Bloques:** mantiene los anteriores y añade Hero, Texto + imagen, Video, Carrusel, Antes/después, Testimonios, Estadísticas, Marcas compatibles, Logos, Preguntas frecuentes, Mapa, WhatsApp, Fondo con imagen/video, Parallax, Sección animada, Tarjetas con iconos y Productos por categoría. Cada bloque tiene estilo y animación de entrada. Los botones ↑/↓ funcionan también en celular; en computador puedes arrastrar las filas. Se guarda todo el orden en una operación.

**Contenido de bloques avanzados (sin JSON manual)**

El campo Contenido indica el formato según el bloque, una fila por línea:

```text
Testimonios: Nombre | Testimonio real autorizado
Estadísticas: 25 | Descripción de la cifra real
Preguntas frecuentes: Pregunta | Respuesta
Tarjetas con iconos: ↗ | Título | Descripción
Marcas: Una marca compatible real por línea
Galería / carrusel / logos: Un título por línea, en el orden de las fotos
```

Los valores numéricos simples de Estadísticas se animan como contadores. Los productos destacados se seleccionan del catálogo; Productos por categoría usa la categoría exacta escrita en el producto. Los relacionados muestran coincidencias de categoría o vehículo, sin inferir compatibilidades nuevas. Ningún bloque crea productos, precios, testimonios ni cifras automáticamente.

Para Antes/después, la imagen principal es Antes y el campo Imagen después es Después; el visitante mueve un control accesible para compararlas. El carrusel se desliza con mouse, touch o teclado. FAQ usa desplegables accesibles.

**Medios y ubicación**

Las fotos, logos y fondos se pueden subir al bucket `productos` con las restricciones actuales de 5 MB. No se copian a Git. Los videos usan URL pública directa de archivo **MP4 o WEBM**, no enlaces de YouTube, Drive ni fragmentos de HTML. No se ha creado un bucket para videos ni se suben desde el panel; puedes alojarlos en un servicio propio y pegar su URL. Usa videos cortos y comprimidos y una imagen de fondo como alternativa. El video de fondo es silencioso, se pausa fuera de pantalla o con movimiento reducido y no bloquea la lectura.

El mapa acepta un enlace de ubicación; si pegas una URL oficial de Google Maps Embed, se muestra incrustado. Si completas una dirección, se puede mostrar un mapa de esa dirección, con carga diferida. También se conserva el enlace para abrir la ubicación. No admite HTML arbitrario ni iframes de dominios desconocidos.

El arte de vehículo que aparece cuando no hay portada es una ilustración decorativa SVG, no una fotografía ni un producto del catálogo. Para la identidad final, sube tu logo y una fotografía real de vehículo/equipamiento. Las tarjetas sin fotografía se identifican como tales.

**Vista previa y publicación**

La vista previa ahora utiliza la misma página, CSS y GSAP, con modos **Escritorio, Tablet (768 px) y Celular (390 px)**. Incluye borradores del formulario abierto y de configuración. Permite probar el menú, FAQ y comparador sin abrir enlaces externos ni escribir en Supabase. La página auxiliar `vista-previa.html` no contiene autenticación, claves ni operaciones de escritura; recibe el borrador exclusivamente de su ventana padre del mismo origen.

El navegador respeta `prefers-reduced-motion`: elimina intro, parallax y animaciones decorativas, y pausa fondos de video. GSAP y ScrollTrigger se cargan por separado bajo demanda, sin cargar las animaciones en el panel hasta abrir la vista previa. Los scroll listeners y animaciones anteriores se limpian al volver a renderizar. Las imágenes secundarias y los mapas usan lazy loading; la portada principal se carga con prioridad.

**Pruebas antes de publicar**

1. Ejecuta el SQL nuevo y arranca `npm run dev`. Verifica que tus productos y fotos siguen presentes.
2. En `/admin`, cambia un título, fuente o efecto; revisa la vista previa sin guardar en sus tres tamaños. Guarda solo cuando estés conforme.
3. Activa una intro, prueba las opciones y luego desactívala. Para volver a ver una intro una vez por sesión, abre una sesión privada o desmarca esa opción. En la vista previa se permite repetirla.
4. Crea FAQ, galería o comparador de prueba; revisa visibilidad y orden con flechas y arrastre. Los borradores sin guardar siguen siendo temporales.
5. Edita un producto, añade fotos y un enlace como `antivuelco-l200`. Abre `/producto/antivuelco-l200`, verifica precio, stock, descripción, instalación, galería y relacionados.
6. Completa WhatsApp en Contacto y ubicación para que aparezcan los botones Consultar. Son enlaces `wa.me`, no automatización ni bot.
7. Revisa menú móvil, cierre con Escape, scroll y la web con movimiento reducido habilitado en el sistema.
8. Cierra sesión y verifica que el editor desaparece. Conserva la prueba de acceso con usuarios no administradores; la función de ordenar también exige autorización.

Para Vercel siguen vigentes las mismas variables y `npm run build` / `dist`. El build incluye `index.html` y `vista-previa.html`; `vercel.json` permite abrir y recargar las fichas `/producto/:slug` directamente. No cambies la salida a otra carpeta. Publica los archivos nuevos junto con las modificaciones y el lockfile. En una instalación con npm, ejecuta `npm install` para obtener GSAP.

La librería instalada es **GSAP 3.15** con ScrollTrigger. El diseño no cambia la fuente de verdad del futuro bot: precios, stock, compatibilidad y código siguen en `productos`, y el código solo se comunica cuando lo pidan expresamente. No hay integración con OpenAI ni automatización de WhatsApp.

### Web editable desde /admin

**Configuración necesaria en Supabase**

1. Abre tu proyecto habitual de Supabase, el mismo donde está `productos`.
2. Entra a **SQL Editor → New query**.
3. Copia todo el contenido de **`supabase/sitio-editable.sql`** y pulsa **Run**. `Success. No rows returned` es normal.
4. En **Table Editor**, comprueba que existan `configuracion_sitio`, `bloques_sitio` y `menu_sitio`. La primera debe tener una fila con `id = 1`.
5. Conserva tu usuario actual en `administradores`. No cambies las políticas anteriores de productos ni de autenticación.
6. Para subir logo, portada o imágenes de bloques, usa el bucket `productos` ya configurado con `supabase/storage.sql`. Si ya funciona la subida de fotos de productos, no necesitas crear otro bucket ni ejecutar ese SQL nuevamente.
7. Ejecuta también `supabase/diseno-premium.sql`, explicado arriba, para las opciones visuales avanzadas. Publica los cambios en Vercel con las mismas variables de entorno; GSAP está incluido en las dependencias del proyecto.

El SQL nuevo solo crea/configura esas tres tablas y sus propias políticas. No cambia productos, administradores, Storage ni sus políticas actuales. Las opciones de menú iniciales se agregan sin sobrescribir ediciones. Las escrituras requieren un usuario de `administradores`. El público puede leer la configuración y los bloques y opciones de menú visibles. Los datos de contacto son públicos: ingresa solo información del negocio destinada a clientes.

**Cómo usar el panel**

- **Productos**: mantiene el catálogo actual, código interno, búsqueda y subida de fotos.
- **Configuración del sitio**: nombre, portada, textos, logo, título del catálogo, mensaje de catálogo vacío y pie de página. Puedes usar URL o subir imágenes directamente. Las imágenes se conservan en Storage al reemplazarlas.
- **Apariencia**: ocho selectores de color. Cada sección tiene su propio botón Guardar; una modificación de colores no sobrescribe los datos de contacto.
- **Bloques**: crea, edita, elimina, oculta y ordena secciones. Se muestran después del catálogo. Se conservan los nueve tipos originales y se agregan los tipos avanzados explicados arriba. Galería admite varias URL o subidas; destacados permite seleccionar productos actuales sin copiar ni inventar sus precios o stock.
- **Menú**: agrega, edita, ordena, oculta o elimina opciones. Enlaces admitidos: URL http/https o anclas como `#inicio`, `#catalogo`, `#contacto`, `#ubicacion`, `#horarios` y `#redes`. Las cuatro últimas requieren datos de contacto y su casilla de visibilidad activada. El número más bajo aparece primero; evita empates si quieres un orden específico.
- **Contacto y ubicación**: teléfono, WhatsApp con código de país, correo, dirección, horario, redes, URL del mapa, títulos y casillas para mostrar u ocultar cada sección. WhatsApp es un enlace de contacto. El mapa admite Google Maps Embed o la dirección configurada y conserva el enlace externo de ubicación.

Para crear **Quiénes somos**, crea un bloque de texto o imagen + texto, escribe el título y descripción, usa el identificador `quienes-somos` y guarda. En Menú agrega una opción con enlace `#quienes-somos`. Un identificador debe ser único, en minúsculas y con guiones. Las secciones personalizadas usan el mismo mecanismo.

**Vista previa y guardado**

Pulsa **Vista previa sin guardar** para ver los formularios de configuración, apariencia, animaciones y contacto juntos. Si estás creando o editando un bloque u opción de menú, su botón Vista previa incluye ese borrador. Puedes elegir Escritorio, Tablet (768 px) o Celular (390 px). Las anclas permiten recorrer la vista; los enlaces externos no se abren. Esta vista no escribe en Supabase. Si un dato es inválido, corrígelo antes de previsualizar o guardar.

El botón Guardar de cada sección publica únicamente esa sección. Los cambios sin guardar de otras secciones se conservan mientras estés en el panel; se pierden al recargar o salir de la página. **Actualizar configuración** vuelve a leer Supabase y permite descartar borradores. Una imagen se sube inmediatamente a Storage, pero su URL solo se publica al guardar la configuración o bloque. Cancelar no borra el archivo subido.

La web pública lee los cambios al abrir o recargar. No hace falta volver a desplegar por cada edición de contenido. Si las tablas nuevas todavía no existen o falla su lectura, el catálogo sigue funcionando con su presentación anterior. Un error de productos no se convierte en productos de ejemplo.

**Comprobación paso a paso**

1. Verifica que siguen presentes tus productos en Supabase y en el catálogo público.
2. En `/admin`, inicia sesión y cambia un texto del sitio. Previsualiza sin guardar: en otra pestaña pública todavía debe verse el texto anterior.
3. Guarda, recarga la página pública y verifica el texto nuevo. Comprueba la fila de `configuracion_sitio`.
4. Cambia colores, guarda y revisa el catálogo en computador, tablet y celular.
5. Crea dos bloques con órdenes diferentes, edítalos, oculta uno y confirma que solo aparece el visible. Elimina un bloque de prueba y comprueba que su fila desaparece.
6. Crea una galería y un bloque de destacados. Selecciona productos reales; cambia un precio en Productos y confirma que también cambia en Destacados al recargar.
7. Agrega una opción de menú hacia un bloque visible y verifica el desplazamiento a la sección. Edita su orden, ocúltala y comprueba la navegación pública.
8. Completa contacto, dirección, horario y redes. Verifica los enlaces, luego desactiva una casilla y comprueba que se oculta su sección. Si ocultas una sección, oculta también el enlace del menú que apunta a ella.
9. Cierra sesión: los controles del editor deben desaparecer. Una cuenta no incluida en `administradores` no debe poder guardar configuraciones, bloques ni menú; verifica RLS desde esa cuenta si necesitas auditar las escrituras.

El futuro bot seguirá leyendo principalmente `productos` (`codigo`, `nombre`, `vehiculo`, `ano`, `precio`, `stock`, `descripcion`, `instalacion`, `foto`). Nunca debe extraer precios o compatibilidad del HTML o del diseño. Las tres tablas nuevas son contenido visual independiente; no se ha conectado WhatsApp ni OpenAI. La regla de no comunicar códigos internos salvo consulta explícita sigue vigente.

### Código interno de productos

Para una base ya configurada, ejecuta todo el archivo `supabase/agregar-codigo.sql` en **SQL Editor → New query → Run**, antes de publicar la nueva web. Añade `codigo` de tipo texto, opcional. Los productos existentes conservan sus datos y tienen código nulo hasta que lo completes en `/admin`. No se cambian las políticas RLS.

En `/admin` puedes agregar o editar el **Código / SKU interno** y buscar por él. El código conserva ceros iniciales. No se muestra ni se utiliza como campo de búsqueda en el catálogo público; sus consultas tampoco solicitan esta columna. Esto es una regla de presentación, no una garantía de confidencialidad: se mantienen los permisos públicos actuales de la tabla.

Regla para el futuro bot de WhatsApp: `codigo` es una referencia interna y no debe incluirse automáticamente en respuestas, fichas ni mensajes de productos. Solo comunicar el valor real de Supabase cuando el cliente pregunte explícitamente por el código o SKU. Si no está registrado, informar que no hay código registrado, sin inventarlo. El bot aún no está implementado.

### Fotografías en Supabase Storage

Si ya configuraste las tablas y el usuario administrador, solo necesitas este paso adicional:

1. Abre **SQL Editor → New query** en el mismo proyecto Supabase.
2. Copia **todo** el contenido de `supabase/storage.sql` y pulsa **Run**. No necesitas volver a ejecutar `schema.sql` ni cambiar sus políticas.
3. Comprueba en **Storage** que exista el bucket **productos**, marcado como **Public**, con límite de **5 MB (5242880 bytes)** y tipos `image/jpeg`, `image/png`, `image/webp`. El límite global de Storage debe permitir al menos 5 MB.
4. Mantén tu usuario autorizado en `public.administradores`. Las nuevas políticas de Storage comprueban esta tabla; tener sesión por sí solo no permite subir imágenes.
5. Vuelve a desplegar la web en Vercel. Usa las mismas dos variables de entorno; no hay claves adicionales.

En `/admin`, al crear o editar un producto, pulsa **Subir foto** y elige una imagen del computador o celular. Se valida tamaño, extensión, MIME y cabecera. La imagen se sube inmediatamente a Supabase, aparece una vista previa y se completa la URL. Pulsa **Guardar en Supabase** para guardar esa URL en `productos.foto`. El catálogo público utiliza esta misma columna y mostrará la imagen sin iniciar sesión. También puedes seguir pegando URLs externas.

Si la subida falla, se conserva la URL anterior y se muestra un error. Si falla el guardado del producto, la URL subida permanece en el formulario para reintentarlo. Cancelar después de una subida deja el archivo en Storage, pero no cambia el producto. Reemplazar una foto o eliminar un producto no borra archivos de Storage: podrían estar compartidos. Puedes revisar y eliminar fotos que ya no se usan desde el panel de Supabase; no borres imágenes usadas por otros productos.

Las imágenes no se copian al proyecto ni a GitHub. El bucket público sirve las imágenes por URL, pero la escritura sigue restringida mediante RLS. El SQL añade una política restrictiva para este bucket para que otras políticas permisivas no habiliten escritura a usuarios no administradores; no modifica las políticas de `productos` o `administradores` ni el acceso a otros buckets. No otorga nuevos permisos de sobrescritura ni borrado.

Prueba una foto de cada formato, una mayor de 5 MB y un formato no admitido. Guarda, recarga y verifica `productos.foto` y el catálogo sin sesión. Con un usuario que no figure en `administradores`, no debe permitirse subir una foto.

Necesitas Node.js 22.12 o posterior con npm (Node 24 también sirve).

```sh
npm install
```

Copia `.env.example` a un archivo llamado `.env` en la raíz y reemplaza ambos valores:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica
```

```sh
npm run dev
```

Abre la dirección que indique Vite. Reinicia el servidor después de cambiar `.env`. Este archivo se excluye de Git. Las variables `VITE_` son públicas en el navegador: el acceso se protege con las políticas de Supabase, nunca con una clave privada.

## 3. Cómo probar

1. Sin iniciar sesión, abre el catálogo. En una base nueva aparecerá vacío.
2. Entra manualmente a `/admin` (por ejemplo, `http://localhost:5173/admin`) e inicia sesión con tu usuario autorizado. No hay enlaces de administración en el catálogo público.
3. Agrega un producto real: nombre, vehículo (por ejemplo Mitsubishi L200), años, precio en CLP, stock, descripción, instalación y URL de foto opcional. Indica en instalación si el precio incluye ese servicio.
4. Comprueba la nueva fila en **Table Editor → productos** de Supabase.
5. Busca `L200`: deben aparecer todos los productos cuyo vehículo u otros campos coincidan. La búsqueda ignora mayúsculas y acentos y combina todas las palabras escritas.
6. Edita precio y stock. Recarga la página y verifica los valores en Supabase.
7. Elimina un producto de prueba, confirma y revisa que su fila desaparezca en Supabase.
8. Cierra sesión: el catálogo permanece visible y desaparecen los controles de edición. Un usuario que no esté en `administradores` no obtiene acceso de escritura.
9. Prueba desde el celular o con una ventana estrecha. Si se pierde la conexión, aparece un error; no se muestra un catálogo falso. Usa **Actualizar** para volver a consultar la base.

Los años se guardan como texto en `ano`, lo que permite rangos (`2016–2024`) o listas (`2018, 2020, 2022`). En esta etapa la búsqueda es textual: no interpreta automáticamente si un año está dentro de un rango. Precio y stock son enteros no negativos. `id` y `created_at` los genera Supabase.

```sh
npm test
npm run build
```

Estas comprobaciones validan búsqueda, formulario y compilación. La prueba de conexión y CRUD real requiere que configures tu propio proyecto Supabase.

## 4. Configurar Vercel

Importa el repositorio como proyecto de **Vite**. Usa:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`
- Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, con los mismos valores de `.env`.

Agrega las variables en **Settings → Environment Variables** para Production y para Preview si lo usarás. Vuelve a desplegar después de cambiarlas. No se requieren claves de WhatsApp, OpenAI ni service_role. La raíz `/` muestra únicamente el catálogo público. La administración está en `/admin`; `vercel.json` permite abrir y recargar esa ruta directamente.

## Archivos y su propósito

- `package.json`: dependencias y comandos para ejecutar, probar y compilar.
- `pnpm-lock.yaml`: versiones exactas de las dependencias instaladas con pnpm en este entorno. Puedes usar pnpm o npm; evita mantener dos archivos de bloqueo a la vez.
- `pnpm-workspace.yaml`: autoriza el script de instalación de esbuild, que Vite necesita para compilar al usar pnpm.
- `index.html`: página base en español.
- `vercel.json`: sirve la aplicación cuando se entra directamente a `/admin`.
- `src/supabase.js`: crea la conexión usando variables de entorno.
- `src/productos.js`: búsqueda y validación del formulario.
- `src/fotos.js`: validación y subida de fotografías a Supabase Storage.
- `src/main.js`: catálogo, sesión de administración y operaciones CRUD en Supabase.
- `src/sitio-datos.js`: lectura de las tres tablas visuales y validación de sus formularios.
- `src/sitio-render.js`: presentación pública y vista previa con el mismo renderizador.
- `src/sitio-admin.js`: secciones del editor, formularios, bloques, menú y vista previa.
- `src/sitio.css`: diseño adaptable del editor y colores configurables de la página pública.
- `src/premium.css`: identidad automotriz, hero, tarjetas, fichas y nuevos bloques responsive.
- `src/visual.js`: opciones visuales permitidas, valores iniciales y enlaces de producto/WhatsApp.
- `src/experiencia.js`: intro, GSAP, ScrollTrigger, menú móvil y controles interactivos.
- `src/vista-previa.js` y `vista-previa.html`: vista previa independiente sin escrituras en Supabase.
- `vite.config.js`: compila tanto la web como la vista previa.
- `src/style.css`: diseño adaptable a computador y celular.
- `supabase/schema.sql`: tablas y permisos de acceso.
- `supabase/agregar-codigo.sql`: añade el código interno sin modificar los productos existentes.
- `supabase/sitio-editable.sql`: las tres tablas visuales y sus nuevas políticas RLS, sin cambiar las existentes.
- `supabase/diseno-premium.sql`: opciones premium, galería y enlaces de productos y reordenación atómica.
- `supabase/storage.sql`: bucket público productos, límite de tamaño, formatos y permisos de subida.
- `.env.example`: nombres de las variables que debes configurar.
- `.gitignore`: evita subir variables locales y archivos generados.
- `tests/productos.test.js`: comprobaciones de búsqueda y datos inválidos.
- `tests/fotos.test.js`: validación de imágenes y comprobaciones de subida con un cliente simulado.
- `tests/sitio.test.js`: validación, seguridad de enlaces, visibilidad, renderizado y separación del código interno.
- `tests/premium.test.js`: formatos avanzados, enlaces, opciones visuales y exclusión de SKU de las respuestas públicas.
- `README.md`: esta guía paso a paso.

La carpeta inicial solo contenía `.git`: todos estos archivos son nuevos; no se modificaron funcionalidades anteriores.
