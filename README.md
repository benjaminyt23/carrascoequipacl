# Carrasco Equipa · Catálogo y administración

Aplicación sencilla con Vite y JavaScript. Los productos se leen y guardan directamente en Supabase. No incluye WhatsApp, OpenAI, productos inventados ni almacenamiento local alternativo para el catálogo.

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
- `src/style.css`: diseño adaptable a computador y celular.
- `supabase/schema.sql`: tablas y permisos de acceso.
- `supabase/storage.sql`: bucket público productos, límite de tamaño, formatos y permisos de subida.
- `.env.example`: nombres de las variables que debes configurar.
- `.gitignore`: evita subir variables locales y archivos generados.
- `tests/productos.test.js`: comprobaciones de búsqueda y datos inválidos.
- `tests/fotos.test.js`: validación de imágenes y comprobaciones de subida con un cliente simulado.
- `README.md`: esta guía paso a paso.

La carpeta inicial solo contenía `.git`: todos estos archivos son nuevos; no se modificaron funcionalidades anteriores.
