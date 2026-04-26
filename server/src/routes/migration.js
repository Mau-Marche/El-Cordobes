const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const prisma = require('../config/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

const upload = multer({
  dest: 'uploads/migration-temp/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.txt', '.tsv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos CSV, TXT o TSV para migración'));
    }
  },
});

// GET /api/migration/logs
router.get('/logs', async (req, res) => {
  const logs = await prisma.migrationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(logs);
});

// POST /api/migration/preview — previsualiza el CSV antes de importar
router.post('/preview', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

  try {
    const content = fs.readFileSync(req.file.path, { encoding: 'latin1' });
    const delimiter = detectDelimiter(content);

    const records = parse(content, {
      delimiter,
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    fs.unlinkSync(req.file.path);

    const preview = records.slice(0, 5);
    const columns = records.length > 0 ? Object.keys(records[0]) : [];

    res.json({
      totalRows: records.length,
      columns,
      preview,
      detectedDelimiter: delimiter,
    });
  } catch (err) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: `Error al leer el archivo: ${err.message}` });
  }
});

// POST /api/migration/import — importa clientes desde CSV
router.post('/import/clients', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

  // Mapeo de columnas: qué columna del CSV va a qué campo
  const mapping = JSON.parse(req.body.mapping || '{}');
  // mapping = { firstName: "NOMBRE", lastName: "APELLIDO", dni: "DNI", phone: "TELEFONO", ... }

  const results = { imported: 0, skipped: 0, errors: 0, details: [] };

  try {
    const content = fs.readFileSync(req.file.path, { encoding: 'latin1' });
    const delimiter = detectDelimiter(content);

    const records = parse(content, {
      delimiter,
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    fs.unlinkSync(req.file.path);

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;

      try {
        const firstName = getValue(row, mapping.firstName);
        const lastName = getValue(row, mapping.lastName);

        if (!firstName && !lastName) {
          results.skipped++;
          results.details.push({ row: rowNum, status: 'skipped', reason: 'Sin nombre ni apellido' });
          continue;
        }

        const dni = cleanDNI(getValue(row, mapping.dni));
        const phone = cleanPhone(getValue(row, mapping.phone));
        const email = getValue(row, mapping.email);
        const address = getValue(row, mapping.address);
        const notes = getValue(row, mapping.notes);

        // Verificar duplicado por DNI
        if (dni) {
          const exists = await prisma.client.findUnique({ where: { dni } });
          if (exists) {
            results.skipped++;
            results.details.push({ row: rowNum, status: 'skipped', reason: `DNI ${dni} ya existe`, data: { firstName, lastName } });
            continue;
          }
        }

        await prisma.client.create({
          data: {
            firstName: capitalize(firstName || ''),
            lastName: capitalize(lastName || ''),
            dni: dni || null,
            phone: phone || null,
            email: email || null,
            address: address || null,
            notes: notes || null,
          },
        });

        results.imported++;
        results.details.push({ row: rowNum, status: 'imported', data: { firstName, lastName, dni } });
      } catch (err) {
        results.errors++;
        results.details.push({ row: rowNum, status: 'error', reason: err.message });
      }
    }

    // Guardar log
    await prisma.migrationLog.create({
      data: {
        filename: req.file.originalname || 'clientes.csv',
        status: results.errors > 0 ? 'PARTIAL' : 'SUCCESS',
        totalRows: records.length,
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors,
        details: results.details.slice(0, 200),
      },
    });

    res.json(results);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/migration/import/vehicles — importa vehículos
router.post('/import/vehicles', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

  const mapping = JSON.parse(req.body.mapping || '{}');
  const results = { imported: 0, skipped: 0, errors: 0, details: [] };

  try {
    const content = fs.readFileSync(req.file.path, { encoding: 'latin1' });
    const delimiter = detectDelimiter(content);
    const records = parse(content, { delimiter, columns: true, skip_empty_lines: true, trim: true, relax_quotes: true });

    fs.unlinkSync(req.file.path);

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;
      try {
        const plate = cleanPlate(getValue(row, mapping.plate));
        const brand = getValue(row, mapping.brand);
        const model = getValue(row, mapping.model);
        const clientDni = cleanDNI(getValue(row, mapping.clientDni));

        if (!brand || !model) {
          results.skipped++;
          results.details.push({ row: rowNum, status: 'skipped', reason: 'Sin marca o modelo' });
          continue;
        }

        // Buscar cliente por DNI
        let clientId = null;
        if (clientDni) {
          const client = await prisma.client.findUnique({ where: { dni: clientDni } });
          if (client) clientId = client.id;
        }

        if (!clientId) {
          // Buscar o crear cliente genérico si hay nombre en el CSV
          const firstName = getValue(row, mapping.clientFirstName);
          const lastName = getValue(row, mapping.clientLastName);
          if (firstName || lastName) {
            const client = await prisma.client.create({
              data: { firstName: capitalize(firstName || 'Sin'), lastName: capitalize(lastName || 'Nombre') },
            });
            clientId = client.id;
          } else {
            results.skipped++;
            results.details.push({ row: rowNum, status: 'skipped', reason: 'No se pudo identificar el cliente' });
            continue;
          }
        }

        // Verificar duplicado por patente
        if (plate) {
          const exists = await prisma.vehicle.findUnique({ where: { plate } });
          if (exists) {
            results.skipped++;
            results.details.push({ row: rowNum, status: 'skipped', reason: `Patente ${plate} ya existe` });
            continue;
          }
        }

        const year = parseInt(getValue(row, mapping.year));
        await prisma.vehicle.create({
          data: {
            clientId,
            brand: capitalize(brand),
            model: capitalize(model),
            year: isNaN(year) ? null : year,
            plate: plate || null,
            mileage: parseInt(getValue(row, mapping.mileage)) || null,
            chassisNumber: getValue(row, mapping.chassisNumber) || null,
            color: getValue(row, mapping.color) || null,
          },
        });

        results.imported++;
        results.details.push({ row: rowNum, status: 'imported', data: { plate, brand, model } });
      } catch (err) {
        results.errors++;
        results.details.push({ row: rowNum, status: 'error', reason: err.message });
      }
    }

    await prisma.migrationLog.create({
      data: {
        filename: req.file.originalname || 'vehiculos.csv',
        status: results.errors > 0 ? 'PARTIAL' : 'SUCCESS',
        totalRows: records.length,
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors,
        details: results.details.slice(0, 200),
      },
    });

    res.json(results);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: err.message });
  }
});

// Helpers
function detectDelimiter(content) {
  const firstLine = content.split('\n')[0];
  const counts = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  for (const char of firstLine) {
    if (counts[char] !== undefined) counts[char]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function getValue(row, column) {
  if (!column) return '';
  return (row[column] || '').trim();
}

function cleanDNI(value) {
  if (!value) return null;
  const cleaned = value.replace(/[.\-\s]/g, '').trim();
  return cleaned.length >= 7 ? cleaned : null;
}

function cleanPhone(value) {
  if (!value) return null;
  return value.replace(/[^\d\+\-\s\(\)]/g, '').trim() || null;
}

function cleanPlate(value) {
  if (!value) return null;
  return value.replace(/\s/g, '').toUpperCase().trim() || null;
}

function capitalize(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

module.exports = router;
