// Funciones puras: validan el formulario y buscan sin inventar información.
export function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function buscarProductos(productos, consulta, incluirCodigo = false) {
  const palabras = normalizar(consulta).trim().split(/\s+/).filter(Boolean);
  return productos.filter(producto => {
    const texto = normalizar([producto.nombre, producto.vehiculo, producto.ano, producto.descripcion, incluirCodigo ? producto.codigo : ''].join(' '));
    return palabras.every(palabra => texto.includes(palabra));
  });
}

export function productosDestacados(productos, limite = 8) {
  return productos.filter(p => p.badges?.includes('destacado')).slice(0, limite);
}

export function filtrarCatalogo(productos, { consulta = '', categoria = '', vehiculo = '', estado = '' } = {}) {
  return buscarProductos(productos, consulta).filter(p =>
    (!categoria || p.categoria === categoria) && (!vehiculo || p.vehiculo === vehiculo) &&
    (!estado || (estado === 'disponible' ? p.stock > 0 : p.badges?.includes(estado))));
}

export function validarProducto(datos) {
  const producto = {};
  for (const campo of ['nombre', 'codigo', 'vehiculo', 'ano', 'descripcion', 'instalacion', 'foto']) {
    producto[campo] = String(datos[campo] ?? '').trim();
  }
  for (const campo of ['nombre', 'vehiculo', 'ano']) {
    if (!producto[campo]) throw new Error('Completa nombre, vehículo y años compatibles.');
  }
  for (const campo of ['precio', 'stock']) {
    if (String(datos[campo] ?? '').trim() === '') throw new Error('Completa el precio y el stock.');
    producto[campo] = Number(datos[campo]);
    if (!Number.isSafeInteger(producto[campo]) || producto[campo] < 0) {
      throw new Error('Precio y stock deben ser números enteros mayores o iguales a cero.');
    }
  }
  if (producto.foto) {
    let url;
    try { url = new URL(producto.foto); } catch { throw new Error('La foto debe tener una URL válida.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('La URL de fotografía debe comenzar con https:// o http://.');
  }
  producto.foto ||= null;
  producto.codigo ||= null;
  if ('slug' in datos) {
    producto.slug = String(datos.slug ?? '').trim() || null;
    if (producto.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(producto.slug)) throw new Error('El enlace del producto debe usar letras minúsculas, números y guiones.');
  }
  if ('categoria' in datos) producto.categoria = String(datos.categoria ?? '').trim();
  if ('galeria' in datos) {
    producto.galeria = Array.isArray(datos.galeria) ? datos.galeria : String(datos.galeria ?? '').split('\n').map(url=>url.trim()).filter(Boolean);
    for (const url of producto.galeria) {
      let valida = false;
      try { valida = ['https:','http:'].includes(new URL(url).protocol); } catch { /* inválida */ }
      if (!valida) throw new Error('Revisa las URLs de la galería del producto.');
    }
  }
  if ('badges' in datos) {
    if (!Array.isArray(datos.badges) || datos.badges.some(b=>!['nuevo','oferta','destacado'].includes(b))) throw new Error('Etiquetas de producto inválidas.');
    producto.badges = datos.badges;
  }
  return producto;
}
