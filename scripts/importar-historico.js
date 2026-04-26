/**
 * importar-historico.js
 * Importa el historial de servicios extraído del SPC-GE a la base de datos
 * de El Cordobés.
 *
 * Uso: node importar-historico.js
 *
 * Crea:
 *  - 1 cliente "Historial SPC-GE" (placeholder para los servicios sin cliente)
 *  - 1 vehículo genérico asociado a ese cliente
 *  - 1 Job por cada NUMSERV, con sus trabajos como JobItems
 */

// Apuntar a los módulos instalados en el servidor
const path = require('path');
const SERVER_PATH = path.resolve(__dirname, '../server');
require(path.join(SERVER_PATH, 'node_modules/dotenv')).config({ path: path.join(SERVER_PATH, '.env') });
const fs = require('fs');
const { PrismaClient } = require(path.join(SERVER_PATH, 'node_modules/@prisma/client'));

const prisma    = new PrismaClient();
const CSV_RPS   = path.resolve(__dirname, '../../exportados/RepuestosPorServicio_v2.csv');
const CSV_CAT   = path.resolve(__dirname, '../../exportados/CatalogoReparaciones.csv');

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseCSV(filePath) {
  const raw  = fs.readFileSync(filePath, 'utf8');
  const lines = raw.replace(/^﻿/, '').split('\n').filter(l => l.trim());
  const header = lines[0].split(';').map(h => h.replace(/"/g, '').trim());
  return lines.slice(1).map(line => {
    const cols = line.split(';').map(c => c.replace(/"/g, '').trim());
    const obj  = {};
    header.forEach((h, i) => { obj[h] = cols[i] || ''; });
    return obj;
  });
}

function capitalize(str) {
  return str.trim().split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('  Importador histórico SPC-GE → El Cordobés');
  console.log('═'.repeat(60));

  // ── 1. Verificar archivos ─────────────────────────────────────────────────
  if (!fs.existsSync(CSV_RPS)) {
    console.error(`\n❌ No se encuentra: ${CSV_RPS}`);
    console.error('   Ejecutá primero: node scripts/extraer-ger-v2.js');
    process.exit(1);
  }

  // ── 2. Leer CSV de trabajos por servicio ──────────────────────────────────
  console.log('\n📂 Leyendo RepuestosPorServicio_v2.csv...');
  const rpsRows = parseCSV(CSV_RPS).filter(r => r.numserv && r.descripcion);
  console.log(`   ${rpsRows.length} filas leídas`);

  // Agrupar por NUMSERV
  const byNumserv = new Map();
  for (const r of rpsRows) {
    const ns = parseInt(r.numserv);
    if (isNaN(ns) || ns < 1) continue;
    if (!byNumserv.has(ns)) byNumserv.set(ns, []);
    byNumserv.get(ns).push(capitalize(r.descripcion));
  }
  console.log(`   ${byNumserv.size} servicios únicos`);

  // ── 3. Crear cliente placeholder ──────────────────────────────────────────
  console.log('\n👤 Creando cliente histórico...');
  let legacyClient = await prisma.client.findFirst({
    where: { firstName: 'Historial', lastName: 'SPC-GE' },
  });
  if (!legacyClient) {
    legacyClient = await prisma.client.create({
      data: {
        firstName: 'Historial',
        lastName:  'SPC-GE',
        notes:     'Cliente genérico para servicios importados del sistema anterior (SPC-GE). ' +
                   'Estos registros se pueden reasignar a clientes reales desde la lista de trabajos.',
      },
    });
    console.log(`   ✅ Cliente creado (ID ${legacyClient.id})`);
  } else {
    console.log(`   ℹ️  Cliente ya existe (ID ${legacyClient.id})`);
  }

  // ── 4. Crear vehículo placeholder ─────────────────────────────────────────
  let legacyVehicle = await prisma.vehicle.findFirst({
    where: { clientId: legacyClient.id, brand: 'SPC-GE' },
  });
  if (!legacyVehicle) {
    legacyVehicle = await prisma.vehicle.create({
      data: {
        clientId: legacyClient.id,
        brand:    'SPC-GE',
        model:    'Vehículo Histórico',
        notes:    'Vehículo genérico para servicios sin patente en el sistema anterior.',
      },
    });
    console.log(`   ✅ Vehículo placeholder creado (ID ${legacyVehicle.id})`);
  } else {
    console.log(`   ℹ️  Vehículo ya existe (ID ${legacyVehicle.id})`);
  }

  // ── 5. Importar jobs ──────────────────────────────────────────────────────
  console.log('\n🔧 Importando servicios históricos...');

  const numservList = [...byNumserv.keys()].sort((a, b) => a - b);
  let created = 0, skipped = 0, errored = 0;

  for (const numserv of numservList) {
    // Verificar si ya existe un job con esa referencia
    const exists = await prisma.job.findFirst({
      where: { description: { contains: `SPC-GE #${numserv}` } },
    });
    if (exists) {
      skipped++;
      continue;
    }

    const items = byNumserv.get(numserv);

    try {
      await prisma.job.create({
        data: {
          vehicleId:   legacyVehicle.id,
          description: `Servicio SPC-GE #${numserv}`,
          status:      'DELIVERED',
          laborCost:   0,
          totalCost:   0,
          notes:       `Importado del sistema anterior (SPC-GE). Servicio N° ${numserv}.\n` +
                       `Trabajos registrados: ${items.join(', ')}`,
          items: {
            create: items.map(desc => ({
              description: desc,
              quantity:    1,
              unitPrice:   0,
              subtotal:    0,
            })),
          },
        },
      });
      created++;
      if (created % 100 === 0) {
        process.stdout.write(`\r   Importados: ${created} / ${numservList.length}...`);
      }
    } catch (err) {
      errored++;
      if (errored <= 5) console.error(`\n   ⚠️  Error en NUMSERV ${numserv}: ${err.message}`);
    }
  }

  console.log(`\r   ✅ ${created} servicios importados, ${skipped} ya existían, ${errored} errores`);

  // ── 6. Resumen final ──────────────────────────────────────────────────────
  const totalJobs  = await prisma.job.count();
  const totalItems = await prisma.jobItem.count();

  console.log('\n' + '═'.repeat(60));
  console.log('  IMPORTACIÓN COMPLETADA');
  console.log('═'.repeat(60));
  console.log(`  Servicios históricos importados : ${created}`);
  console.log(`  Total trabajos (job items)      : ${totalItems}`);
  console.log(`  Total órdenes en sistema        : ${totalJobs}`);
  console.log(`
  ℹ️  Los servicios importados aparecen en "Trabajos" como
     estado "Entregado" vinculados al cliente "Historial SPC-GE".
     Podés buscarlos por "SPC-GE #NNN" o por descripción.
  `);

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error('\n❌ Error fatal:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
