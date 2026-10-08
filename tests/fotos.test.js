import test from 'node:test';
import assert from 'node:assert/strict';
import { validarFoto, subirFoto, MAX_FOTO_BYTES } from '../src/fotos.js';

function archivo(name, type, bytes) {
  return new File([new Uint8Array(bytes)], name, { type });
}
const jpg = () => archivo('foto.JPEG', 'image/jpeg', [255, 216, 255, 0]);
test('acepta los formatos admitidos, incluido JPEG y MIME vacío', async () => {
  assert.equal((await validarFoto(jpg())).extension, 'jpg');
  await validarFoto(archivo('foto.jpg', '', [255, 216, 255]));
  await validarFoto(archivo('foto.png', 'image/png', [137, 80, 78, 71, 13, 10, 26, 10]));
  await validarFoto(archivo('foto.webp', 'image/webp', [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]));
});
test('rechaza archivos vacíos, grandes y formatos falsificados', async () => {
  await assert.rejects(validarFoto(archivo('foto.jpg', 'image/jpeg', [])), /vacía/);
  await assert.rejects(validarFoto({ size: MAX_FOTO_BYTES + 1 }), /5 MB/);
  await assert.rejects(validarFoto(archivo('foto.gif', 'image/gif', [71, 73, 70])), /Solo se aceptan/);
  await assert.rejects(validarFoto(archivo('foto.png', 'image/jpeg', [255, 216, 255])), /Solo se aceptan/);
  await assert.rejects(validarFoto(archivo('foto.jpg', 'image/jpeg', [60, 104, 116, 109, 108])), /contenido/);
});
function cliente({ usuario = true, admin = true, errorUpload = null } = {}) {
  const llamadas = [];
  return {
    llamadas,
    auth: { getUser: async () => ({ data: { user: usuario ? { id: 'admin-id' } : null }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: admin ? { user_id: 'admin-id' } : null, error: null }) }) }) }),
    storage: { from: bucket => ({
      upload: async (ruta, file, opciones) => { llamadas.push({ bucket, ruta, file, opciones }); return { error: errorUpload }; },
      getPublicUrl: ruta => ({ data: { publicUrl: `https://example.com/${ruta}` } }),
    }) },
  };
}
test('sesión ausente o usuario no administrador no envía archivos', async () => {
  for (const opciones of [{ usuario: false }, { admin: false }]) {
    const mock = cliente(opciones);
    await assert.rejects(subirFoto(mock, jpg()));
    assert.equal(mock.llamadas.length, 0);
  }
});
test('sube al bucket productos con nombre único, sin sobrescribir, y devuelve URL', async () => {
  const mock = cliente();
  const url = await subirFoto(mock, jpg());
  const url2 = await subirFoto(mock, jpg());
  assert.notEqual(url, url2);
  assert.equal(mock.llamadas[0].bucket, 'productos');
  assert.match(mock.llamadas[0].ruta, /^admin-id\/.+\.jpg$/);
  assert.equal(mock.llamadas[0].opciones.upsert, false);
  assert.equal(mock.llamadas[0].opciones.contentType, 'image/jpeg');
  assert.equal(url, `https://example.com/${mock.llamadas[0].ruta}`);
});
test('un fallo de Storage no devuelve una URL de éxito', async () => {
  await assert.rejects(subirFoto(cliente({ errorUpload: { message: 'denied' } }), jpg()), /No se pudo subir/);
});
