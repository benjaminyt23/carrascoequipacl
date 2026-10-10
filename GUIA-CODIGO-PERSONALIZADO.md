# Código personalizado / embeds

No necesitas SQL nuevo si ya funciona el editor de páginas. No cambia productos ni políticas RLS. La nueva dependencia es `sanitize-html` (2.18.0), usada con una lista limitada de etiquetas y atributos y limpieza antes de renderizar. [Documentación de la librería](https://github.com/apostrophecms/apostrophe/blob/main/packages/sanitize-html/README.md).

## Insertar un mapa

1. En Google Maps busca tu negocio y abre **Compartir → Insertar un mapa → Copiar HTML**.
2. En `/admin → Páginas`, edita la página y pulsa **Agregar bloque**.
3. En Tipo de bloque selecciona **Código personalizado**.
4. Pega el iframe en **Código HTML / Embed**. Usa el código que empieza con `<iframe`, no el enlace corto `maps.app.goo.gl`.
5. El ancho 0 utiliza todo el ancho disponible. El alto predeterminado es 450 px. Puedes indicar otro alto entre 120 y 1200 px.
6. Ajusta alineación, ancho de bloque, fondo, margen, padding, borde y bordes redondeados en **Diseño y animación**.
7. Comprueba Escritorio, Tablet y Celular en la vista previa del formulario.
8. Pulsa **Aplicar al borrador**, después **Guardar borrador** o **Guardar y publicar**.

La vista previa carga el contenido externo, pero no guarda ni publica la página. Los datos inválidos muestran un aviso y conservan la última vista válida.

## Qué admite

HTML básico: div, párrafos, spans, imágenes HTTPS, enlaces, listas, títulos h2/h3/h4, texto destacado, figuras y separadores. El HTML mal cerrado se normaliza cuando es recuperable.

Iframes HTTPS de Google Maps, YouTube/YouTube sin cookies, Vimeo, Google Forms, Microsoft Forms, Typeform, Jotform y Tally, usando sus URLs para insertar. Hay un máximo de ocho iframes por bloque y 50.000 caracteres de código. Para otro proveedor, se debe revisar y ampliar la lista permitida en `src/codigo-personalizado.js`.

Scripts, estilos pegados, onclick/onload y otros eventos, srcdoc, objetos, SVG, protocolos javascript/data y atributos no autorizados se eliminan o rechazan. No se admiten widgets que necesiten pegar un `<script>`. Si el proveedor tiene una versión iframe permitida, utiliza esa.

Los servicios externos pueden ejecutar sus propios scripts dentro de su iframe aislado. No pueden acceder al DOM de Carrasco, abrir ventanas automáticamente ni navegar la página principal con los permisos establecidos. No se habilitan cámara, micrófono ni geolocalización. Un proveedor puede impedir que su contenido se inserte mediante sus propias políticas; el editor no evita esas restricciones. Evita introducir información real en formularios durante la prueba.

## Dónde se guarda

El código limpio y sus dimensiones se guardan en `bloques_pagina.datos.opciones`: `codigo_html`, `embed_ancho` y `embed_alto`. Los demás ajustes quedan en `datos.diseno`, como los otros bloques. Al publicar se copian a `paginas_publicadas.bloques`. Solo los administradores pueden escribir; el público recibe solamente la versión publicada. No se usa la tabla `productos`.

## Prueba rápida

Pega `<div><p><strong>Vista previa de prueba</strong></p></div>` y comprueba los tres tamaños. Luego prueba tu mapa real. Guarda como borrador: aún no debe aparecer en la web pública. Publica y recarga su URL.

Si agregas un script o un evento a un párrafo de prueba, deben desaparecer del código guardado. Un iframe con una URL de un proveedor no permitido muestra un error. Las pruebas automáticas comprueban estos casos y que un bloque inválido no rompa el resto de la página.

## Archivos

Nuevos: `src/codigo-personalizado.js`, `tests/codigo-personalizado.test.js` y esta guía.

Modificados: `src/paginas-admin.js` (campo y controles), `src/paginas-datos.js` (tipo y validación), `src/sitio-render.js` (renderizado seguro), `src/identidad.css` (responsivo), `package.json` y `pnpm-lock.yaml` (dependencia).
