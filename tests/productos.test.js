import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarProductos, validarProducto } from '../src/productos.js';

test('L200 encuentra todos los compatibles, sin distinguir mayúsculas ni acentos', () => {
  const filas = [
    { nombre: 'Antivuelco', vehiculo: 'Mitsubishi L200', ano: '2016–2024' },
    { nombre: 'Protección', vehiculo: 'MITSUBISHI L200', ano: '2020–2025' },
    { nombre: 'Antivuelco', vehiculo: 'Toyota Hilux', ano: '2020' },
  ];
  assert.equal(buscarProductos(filas, 'l200').length, 2);
  assert.equal(buscarProductos(filas, 'proteccion L200').length, 1);
  assert.equal(buscarProductos(filas, 'inexistente').length, 0);
  assert.equal(buscarProductos(filas, '').length, 3);
});

const valido = { nombre: 'Antivuelco', vehiculo: 'Mitsubishi L200', ano: '2016–2024', precio: '250000', stock: '3', foto: '' };
test('busca por código solamente cuando se solicita búsqueda interna', () => {
  const filas = [{ ...valido, codigo: 'AV-L200-001' }, { ...valido, codigo: null }];
  assert.equal(buscarProductos(filas, 'av-l200-001', true).length, 1);
  assert.equal(buscarProductos(filas, 'av-l200-001').length, 0);
  assert.equal(buscarProductos(filas, 'L200', true).length, 2);
});
test('código opcional conserva ceros iniciales y admite productos anteriores', () => {
  assert.equal(validarProducto({ ...valido, codigo: ' 001-AV ' }).codigo, '001-AV');
  assert.equal(validarProducto(valido).codigo, null);
});
test('convierte precio y stock, conserva compatibilidad y permite foto vacía', () => {
  const resultado = validarProducto(valido);
  assert.equal(resultado.precio, 250000);
  assert.equal(resultado.stock, 3);
  assert.equal(resultado.ano, valido.ano);
  assert.equal(resultado.foto, null);
});
test('impide guardar valores incompletos, negativos, fracciones y URLs ejecutables', () => {
  for (const cambio of [{ nombre: ' ' }, { vehiculo: '' }, { ano: '' }, { precio: '' }, { precio: '-1' }, { stock: '1.5' }, { precio: 'NaN' }, { foto: 'javascript:alert(1)' }]) {
    assert.throws(() => validarProducto({ ...valido, ...cambio }));
  }
});
