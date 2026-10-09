import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  build: { rollupOptions: { input: {
    principal:fileURLToPath(new URL('./index.html',import.meta.url)),
    preview:fileURLToPath(new URL('./vista-previa.html',import.meta.url)),
  } } },
});
