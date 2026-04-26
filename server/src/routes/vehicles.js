const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/vehicles?clientId=&search=
router.get('/', async (req, res) => {
  const { clientId, search = '', page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    active: true,
    ...(clientId ? { clientId: parseInt(clientId) } : {}),
    ...(search ? {
      OR: [
        { plate: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { chassisNumber: { contains: search, mode: 'insensitive' } },
        { client: { OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ]}},
      ],
    } : {}),
  };

  const [total, vehicles] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { updatedAt: 'desc' },
      include: { client: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    }),
  ]);

  res.json({ data: vehicles, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/vehicles/:id
router.get('/:id', async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      client: true,
      jobs: { orderBy: { date: 'desc' }, include: { items: true, attachments: true } },
      quotes: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehículo no encontrado' });
  res.json(vehicle);
});

// POST /api/vehicles
router.post('/', async (req, res) => {
  const { clientId, brand, model, year, plate, mileage, chassisNumber, engineNumber, color, notes } = req.body;
  if (!clientId || !brand || !model) {
    return res.status(400).json({ error: 'Cliente, marca y modelo son requeridos' });
  }
  if (plate) {
    const exists = await prisma.vehicle.findUnique({ where: { plate } });
    if (exists) return res.status(409).json({ error: `Ya existe un vehículo con patente ${plate}` });
  }
  const vehicle = await prisma.vehicle.create({
    data: { clientId: parseInt(clientId), brand, model, year: year ? parseInt(year) : null, plate, mileage: mileage ? parseInt(mileage) : null, chassisNumber, engineNumber, color, notes },
    include: { client: { select: { id: true, firstName: true, lastName: true } } },
  });
  res.status(201).json(vehicle);
});

// PUT /api/vehicles/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { brand, model, year, plate, mileage, chassisNumber, engineNumber, color, notes } = req.body;
  if (plate) {
    const exists = await prisma.vehicle.findFirst({ where: { plate, NOT: { id } } });
    if (exists) return res.status(409).json({ error: `Ya existe un vehículo con patente ${plate}` });
  }
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { brand, model, year: year ? parseInt(year) : undefined, plate, mileage: mileage ? parseInt(mileage) : undefined, chassisNumber, engineNumber, color, notes },
    include: { client: { select: { id: true, firstName: true, lastName: true } } },
  });
  res.json(vehicle);
});

// DELETE /api/vehicles/:id (soft delete)
router.delete('/:id', async (req, res) => {
  await prisma.vehicle.update({ where: { id: parseInt(req.params.id) }, data: { active: false } });
  res.json({ message: 'Vehículo eliminado' });
});

module.exports = router;
