# Eliminar páginas visuales

## Activar

Abre `supabase/eliminar-paginas.sql` en Visual Studio Code. Copia todo el archivo y ejecútalo en **Supabase → SQL Editor → New query → Run**. Requiere haber ejecutado `paginas-carrasco.sql`. `Success. No rows returned` es normal.

El SQL añade una función de eliminación y un trigger de protección/limpieza. No crea tablas, no modifica las políticas RLS existentes, no elimina páginas al ejecutarse y no modifica la tabla `productos`.

## Qué se puede eliminar

En **/admin → Páginas** aparecen Editar, Duplicar, Ocultar (si está publicada) y **Eliminar**. Las páginas creadas por el administrador y la página visual Productos pueden eliminarse. **Inicio** muestra **Página del sistema**: se conserva porque es la entrada principal del sitio. Esta protección también se comprueba en Supabase.

Eliminar pide confirmación con el nombre de la página y advierte que no puede deshacerse. Si cancelas, no se envía ninguna eliminación. Si tiene subpáginas, debes eliminarlas o moverlas a otro padre y publicar esos cambios antes de borrar el padre. También se comprueban las relaciones de la última versión publicada.

Se eliminan la página, sus bloques y su versión publicada en una sola transacción. La opción desaparece del menú automático y se limpian las referencias internas a su URL en Menú adicional. No se eliminan archivos de Storage: pueden estar compartidos por otras páginas o productos.

## Caso Productos

Puedes eliminar **Productos /productos** como página visual. El catálogo de la aplicación conserva la ruta **/productos**, con buscador, filtros, fotos y todos los productos de Supabase. Por ello los botones **Ver todos los productos**, **Catálogo**, **Volver al catálogo** y los enlaces de categorías siguen funcionando en esa misma dirección. No es necesario cambiarlos ni crear una redirección.

Se elimina la entrada de la página visual en el menú automático; el botón Catálogo del encabezado sigue disponible. Si tenías enlaces manuales a secciones exclusivas de los bloques borrados, revisa los botones de tus otras páginas y elimina o cambia esos anclajes: el catálogo conserva su ancla `#catalogo-carrasco`.

## Cómo probar

1. Ejecuta el nuevo SQL y abre el proyecto actualizado localmente con `npm run dev`.
2. En `/admin → Páginas`, crea una página de prueba, añade un bloque y publícala.
3. Pulsa Eliminar y cancela: la página debe mantenerse. Repite y confirma: desaparece de la lista y del menú.
4. Crea un padre y una subpágina. El panel debe impedir borrar el padre y explicar cómo mover/eliminar el hijo.
5. Verifica que Inicio tiene el aviso Página del sistema y no tiene botón Eliminar.
6. Si deseas eliminar Productos, mueve/elimina primero sus subpáginas y confirma la eliminación. Recarga `/productos`: deben seguir funcionando el catálogo y sus filtros. Comprueba que los productos siguen en **/admin → Productos**.
7. Prueba con sesión cerrada y con una cuenta fuera de `administradores`: no deben poder eliminar páginas.

No ejecutes otra vez la migración inicial `paginas-carrasco.sql` para hacer esta actualización: su semilla podría volver a crear una página Productos que hayas eliminado. Usa únicamente `eliminar-paginas.sql`.
