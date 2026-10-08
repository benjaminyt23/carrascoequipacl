export const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const formatos = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// Valida extensión, MIME, tamaño y cabecera antes de enviar el archivo.
export async function validarFoto(archivo) {
  if (!archivo || archivo.size === 0) throw new Error('Selecciona una imagen que no esté vacía.');
  if (archivo.size > MAX_FOTO_BYTES) throw new Error('La fotografía no debe superar 5 MB.');
  const extension = archivo.name.split('.').pop().toLowerCase();
  const tipo = formatos[extension];
  if (!tipo || (archivo.type && archivo.type !== tipo)) throw new Error('Solo se aceptan JPG, JPEG, PNG y WEBP.');
  const bytes = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
  const coincide = (valores, inicio = 0) => valores.every((valor, i) => bytes[inicio + i] === valor);
  const valida = tipo === 'image/jpeg' ? coincide([255, 216, 255])
    : tipo === 'image/png' ? coincide([137, 80, 78, 71, 13, 10, 26, 10])
    : coincide([82, 73, 70, 70]) && coincide([87, 69, 66, 80], 8);
  if (!valida) throw new Error('El contenido del archivo no corresponde al formato de imagen seleccionado.');
  return { extension: extension === 'jpeg' ? 'jpg' : extension, tipo };
}

export async function subirFoto(cliente, archivo) {
  const { extension, tipo } = await validarFoto(archivo);
  const { data: { user }, error: authError } = await cliente.auth.getUser();
  if (authError || !user) throw new Error('Tu sesión expiró. Inicia sesión para subir fotografías.');
  const { data: permiso, error: permisoError } = await cliente.from('administradores').select('user_id').eq('user_id', user.id).maybeSingle();
  if (permisoError || !permiso) throw new Error('Solo los administradores autorizados pueden subir fotografías.');
  // UUID evita colisiones y no sobrescribe imágenes de otros productos.
  const ruta = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const bucket = cliente.storage.from('productos');
  const { error } = await bucket.upload(ruta, archivo, { contentType: tipo, upsert: false, cacheControl: '3600' });
  if (error) throw new Error(`No se pudo subir la fotografía: ${error.message}. Revisa el bucket productos y sus políticas de Storage.`);
  return bucket.getPublicUrl(ruta).data.publicUrl;
}
