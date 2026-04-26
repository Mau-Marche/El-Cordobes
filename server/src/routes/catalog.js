const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

router.use(authenticate);

// Carga el catálogo desde el JSON persistido
function loadCatalogJson() {
  try {
    const file = path.join(__dirname, '../../data/catalog.json');
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { /* ignorar */ }
  return [];
}

// GET /api/catalog?q=texto
// Busca en el catálogo JSON persistido + job_items de trabajos actuales
router.get('/', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const q_trim = q.trim().toLowerCase();

    // 1. Buscar en el catálogo JSON persistido
    const catalogJson = loadCatalogJson();
    const fromJson = q_trim.length > 0
      ? catalogJson.filter(d => d.toLowerCase().includes(q_trim))
      : catalogJson;

    // 2. Buscar en job_items actuales (trabajos reales, no SPC-GE)
    const fromDb = await prisma.jobItem.findMany({
      where: q_trim.length > 0
        ? {
            description: { contains: q_trim, mode: 'insensitive' },
            job: { description: { not: { contains: 'SPC-GE' } } },
          }
        : { job: { description: { not: { contains: 'SPC-GE' } } } },
      select: { description: true },
      orderBy: { description: 'asc' },
      take: 100,
      distinct: ['description'],
    });

    // Merge sin duplicados, ordenado
    const all = [...new Set([
      ...fromJson.slice(0, 50),
      ...fromDb.map(i => i.description),
    ])].sort((a, b) => a.localeCompare(b, 'es')).slice(0, 50);

    res.json(all);
  } catch (err) {
    console.error('Catalog error:', err.message);
    res.status(500).json({ error: 'Error al buscar catálogo' });
  }
});

// DELETE /api/catalog/spcge — limpia los jobs históricos del SPC-GE (solo admin)
router.delete('/spcge', authenticate, async (req, res) => {
  try {
    // Encontrar todos los jobs SPC-GE
    const jobs = await prisma.job.findMany({
      where: { description: { contains: 'SPC-GE #' } },
      select: { id: true },
    });
    const ids = jobs.map(j => j.id);

    if (ids.length === 0) {
      return res.json({ deleted: 0, message: 'No hay jobs SPC-GE para eliminar' });
    }

    // Eliminar items y jobs en cascada
    await prisma.jobItem.deleteMany({ where: { jobId: { in: ids } } });
    await prisma.job.deleteMany({ where: { id: { in: ids } } });

    // También eliminar el cliente y vehículo placeholder si no tienen otros jobs
    const placeholderClient = await prisma.client.findFirst({
      where: { firstName: 'Historial', lastName: 'SPC-GE' },
    });
    if (placeholderClient) {
      const remainingJobs = await prisma.job.count({
        where: { vehicle: { clientId: placeholderClient.id } },
      });
      if (remainingJobs === 0) {
        await prisma.vehicle.deleteMany({ where: { clientId: placeholderClient.id } });
        await prisma.client.delete({ where: { id: placeholderClient.id } });
      }
    }

    res.json({ deleted: ids.length, message: `${ids.length} servicios históricos SPC-GE eliminados` });
  } catch (err) {
    console.error('Cleanup error:', err.message);
    res.status(500).json({ error: 'Error al limpiar: ' + err.message });
  }
});

module.exports = router;
