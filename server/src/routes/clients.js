const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/clients?search=&page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search
      ? {
          active: true,
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { dni: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { vehicles: { some: { plate: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : { active: true };

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: { vehicles: { where: { active: true }, select: { id: true, plate: true, brand: true, model: true, year: true } } },
      }),
    ]);

    res.json({ data: clients, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Error listing clients:', err.message);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      vehicles: {
        where: { active: true },
        include: { jobs: { orderBy: { date: 'desc' }, take: 5 } },
      },
      quotes: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(client);
});

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, dni, phone, phone2, email, address, notes } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Nombre y apellido requeridos' });
    }
    if (dni) {
      const exists = await prisma.client.findUnique({ where: { dni } });
      if (exists) return res.status(409).json({ error: `Ya existe un cliente con DNI ${dni}` });
    }
    const client = await prisma.client.create({
      data: { firstName, lastName, dni: dni || null, phone: phone || null, phone2: phone2 || null, email: email || null, address: address || null, notes: notes || null },
    });
    res.status(201).json(client);
  } catch (err) {
    console.error('Error creating client:', err.message);
    res.status(500).json({ error: 'Error al crear el cliente: ' + err.message });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { firstName, lastName, dni, phone, phone2, email, address, notes } = req.body;
  if (dni) {
    const exists = await prisma.client.findFirst({ where: { dni, NOT: { id } } });
    if (exists) return res.status(409).json({ error: `Ya existe un cliente con DNI ${dni}` });
  }
  const client = await prisma.client.update({
    where: { id },
    data: { firstName, lastName, dni, phone, phone2, email, address, notes },
  });
  res.json(client);
});

// DELETE /api/clients/:id (soft delete)
router.delete('/:id', async (req, res) => {
  await prisma.client.update({ where: { id: parseInt(req.params.id) }, data: { active: false } });
  res.json({ message: 'Cliente eliminado' });
});

module.exports = router;
