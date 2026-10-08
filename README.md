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
- `src/main.js`: catálogo, sesión de administración y operaciones CRUD en Supabase.
- `src/style.css`: diseño adaptable a computador y celular.
- `supabase/schema.sql`: tablas y permisos de acceso.
- `.env.example`: nombres de las variables que debes configurar.
- `.gitignore`: evita subir variables locales y archivos generados.
- `tests/productos.test.js`: comprobaciones de búsqueda y datos inválidos.
- `README.md`: esta guía paso a paso.

La carpeta inicial solo contenía `.git`: todos estos archivos son nuevos; no se modificaron funcionalidades anteriores.
