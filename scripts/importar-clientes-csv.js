/**
 * importar-clientes-csv.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Importa clientes y vehículos desde un CSV a la base de datos de El Cordobés.
 *
 * USO:
 *   node scripts/importar-clientes-csv.js                   (usa clientes-template.csv)
 *   node scripts/importar-clientes-csv.js mi-archivo.csv    (nombre personalizado)
 *
 * FORMATO DEL CSV (separador: coma, primera fila = cabecera):
 *
 *   patente,marca,modelo,año,color,apellido,nombre,telefono
 *   ABC123,Toyota,Corolla,2019,Blanco,García,Juan,3511234567
 *
 * COLUMNAS (todas opcionales salvo marca y modelo):
 *   patente   → Patente del vehículo (ej: ABC123, AA123BB)
 *   marca     → Marca (requerido)
 *   modelo    → Modelo (requerido)
 *   año       → Año (número)
 *   color     → Color del vehículo
 *   apellido  → Apellido del cliente
 *   nombre    → Nombre del cliente
 *   telefono  → Teléfono del cliente
 *
 * NOTA: Si la patente ya existe en la BD, esa fila se omite.
 *       Si el cliente (mismo apellido+nombre) ya existe, se reutiliza.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs   = require('fs');

// Apuntar al entorno del servidor
const SERVER_PATH = path.resolve(__dirname, '../server');
require(path.join(SERVER_PATH, 'node_modules/dotenv')).config({
  path: path.join(SERVER_PATH, '.env'),
});
const { PrismaClient } = require(
  path.join(SERVER_PATH, 'node_modules/@prisma/client')
);
const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseCSV(filePath) {
  const raw   = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, ''); // quitar BOM
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('El CSV está vacío o no tiene datos.');

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-záéíóúüñ0-9_]/gi, ''));

  return lines.slice(1).map((line, idx) => {
    // Manejar campos con comillas que contienen comas
    const cols = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());

    const obj = { _line: idx + 2 };
    header.forEach((h, i) => { obj[h] = (cols[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  });
}

function cap(str) {
  if (!str) return '';
  return str.trim().split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function norm(str) {
  return (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvFile = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, 'clientes-template.csv');

  console.log('═'.repeat(60));
  console.log('  Importador CSV → El Cordobés');
  console.log('═'.repeat(60));
  console.log(`  Archivo: ${csvFile}`);
  console.log('');

  if (!fs.existsSync(csvFile)) {
    console.error(`❌ No se encontró el archivo: ${csvFile}`);
    console.error('   Indicá la ruta como primer argumento:');
    console.error('   node scripts/importar-clientes-csv.js C:\\ruta\\archivo.csv');
    process.exit(1);
  }

  const rows = parseCSV(csvFile);
  console.log(`  Filas encontradas: ${rows.length}`);
  console.log('');

  let createdClients  = 0;
  let reusedClients   = 0;
  let createdVehicles = 0;
  let skippedVehicles = 0;
  let errors          = 0;

  for (const row of rows) {
    const apellido = cap(row.apellido || row.apellidos || '');
    const nombre   = cap(row.nombre   || row.nombres   || '');
    const telefono = (row.telefono || row.tel || row.phone || '').replace(/\D/g, '').slice(0, 20);
    const patente  = (row.patente || row.plate || '').toUpperCase().replace(/\s/g, '');
    const marca    = cap(row.marca  || row.brand  || '');
    const modelo   = cap(row.modelo || row.model  || '');
    const anio     = parseInt(row.año || row.anio || row.year || '') || null;
    const color    = cap(row.color || '');

    if (!marca || !modelo) {
      console.warn(`  ⚠️  Línea ${row._line}: sin marca/modelo — omitida`);
      errors++;
      continue;
    }

    // ── 1. Buscar o crear cliente ──────────────────────────────────────────
    let cliente = null;

    if (apellido || nombre || telefono) {
      // Buscar por apellido + nombre (case-insensitive)
      if (apellido || nombre) {
        cliente = await prisma.client.findFirst({
          where: {
            AND: [
              apellido ? { lastName:  { equals: apellido, mode: 'insensitive' } } : {},
              nombre   ? { firstName: { equals: nombre,   mode: 'insensitive' } } : {},
            ],
          },
        });
      }

      // Si no lo encontró por nombre, buscar por teléfono
      if (!cliente && telefono) {
        cliente = await prisma.client.findFirst({
          where: { phone: { contains: telefono.slice(-8) } }, // últimos 8 dígitos
        });
      }

      // Si no existe, crear
      if (!cliente) {
        cliente = await prisma.client.create({
          data: {
            firstName: nombre   || 'Sin nombre',
            lastName:  apellido || 'Sin apellido',
            phone:     telefono || null,
          },
        });
        createdClients++;
        console.log(`  ✅ Cliente creado:   ${apellido}, ${nombre} (ID ${cliente.id})`);
      } else {
        reusedClients++;
        console.log(`  ♻️  Cliente existente: ${cliente.lastName}, ${cliente.firstName} (ID ${cliente.id})`);
      }
    }

    // Si no hay datos de cliente, usar un cliente genérico
    if (!cliente) {
      cliente = await prisma.client.findFirst({ where: { lastName: 'Sin cliente' } });
      if (!cliente) {
        cliente = await prisma.client.create({
          data: { firstName: 'Importado', lastName: 'Sin cliente' },
        });
        createdClients++;
      }
    }

    // ── 2. Buscar o crear vehículo ─────────────────────────────────────────

    // Si tiene patente, verificar duplicado
    if (patente) {
      const existe = await prisma.vehicle.findUnique({ where: { plate: patente } });
      if (existe) {
        console.log(`  ⏭️  Vehículo ${patente} ya existe — omitido`);
        skippedVehicles++;
        continue;
      }
    }

    await prisma.vehicle.create({
      data: {
        clientId: cliente.id,
        brand:    marca,
        model:    modelo,
        year:     anio,
        plate:    patente || null,
        color:    color   || null,
      },
    });
    createdVehicles++;
    const label = patente ? `${patente} — ` : '';
    console.log(`  🚗 Vehículo creado:  ${label}${marca} ${modelo} → ${cliente.lastName}, ${cliente.firstName}`);
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log('  RESUMEN');
  console.log('═'.repeat(60));
  console.log(`  Clientes creados:    ${createdClients}`);
  console.log(`  Clientes reutilizados: ${reusedClients}`);
  console.log(`  Vehículos creados:   ${createdVehicles}`);
  console.log(`  Vehículos omitidos:  ${skippedVehicles} (ya existían)`);
  if (errors) console.log(`  Filas con errores:   ${errors}`);
  console.log('');
  console.log('  ✅ Importación finalizada.');
  console.log('');
}

main()
  .catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
