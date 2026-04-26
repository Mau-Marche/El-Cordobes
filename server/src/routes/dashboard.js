const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const [
      totalClients,
      pendingJobs,
      inProgressJobs,
      approvedQuotes,
      recentJobs,
      recentQuotes,
      monthlyJobs,
    ] = await Promise.all([
      prisma.client.count({ where: { active: true } }),
      prisma.job.count({ where: { status: 'PENDING' } }),
      prisma.job.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.quote.count({ where: { status: 'APPROVED' } }),
      prisma.job.findMany({
        take: 8,
        orderBy: { date: 'desc' },
        include: {
          vehicle: {
            include: { client: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      prisma.quote.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { status: { in: ['DRAFT', 'SENT', 'APPROVED'] } },
        include: {
          client: { select: { firstName: true, lastName: true } },
          vehicle: { select: { plate: true } },
        },
      }),
      // Trabajos del mes actual
      prisma.job.count({
        where: {
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.json({
      stats: {
        totalClients,
        pendingJobs,
        inProgressJobs,
        approvedQuotes,
        monthlyJobs,
      },
      recentJobs,
      recentQuotes,
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Error al cargar el dashboard' });
  }
});

// GET /api/dashboard/search?q=
router.get('/search', async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (q.length < 2) return res.json({ clients: [], vehicles: [] });

    const [clients, vehicles] = await Promise.all([
      prisma.client.findMany({
        where: {
          active: true,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { dni: { contains: q } },
          ],
        },
        take: 5,
        include: { vehicles: { where: { active: true }, select: { plate: true, brand: true, model: true } } },
      }),
      prisma.vehicle.findMany({
        where: {
          active: true,
          plate: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        include: { client: { select: { firstName: true, lastName: true, phone: true } } },
      }),
    ]);

    res.json({ clients, vehicles });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
});

module.exports = router;
