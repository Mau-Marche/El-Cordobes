const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/catalog?q=texto
// Devuelve descripciones únicas de ítems de reparación para autocompletar
router.get('/', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const q_trim = q.trim();

    // Busca en job_items descripciones únicas que coincidan con el texto
    // Prioriza ítems de jobs SPC-GE históricos (el catálogo importado)
    const items = await prisma.jobItem.findMany({
      where: q_trim.length > 0
        ? { description: { contains: q_trim, mode: 'insensitive' } }
        : {},
      select: { description: true },
      orderBy: { description: 'asc' },
      take: 50,
      distinct: ['description'],
    });

    const descriptions = items.map(i => i.description);
    res.json(descriptions);
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
