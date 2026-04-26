const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

async function getNextQuoteNumber() {
  const last = await prisma.quote.findFirst({ orderBy: { id: 'desc' } });
  const next = last ? parseInt(last.number.replace(/\D/g, '')) + 1 : 1;
  return `PRES-${String(next).padStart(5, '0')}`;
}

// GET /api/quotes
router.get('/', async (req, res) => {
  try {
    const { status, clientId, page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(status ? { status } : {}),
      ...(clientId ? { clientId: parseInt(clientId) } : {}),
      ...(search ? {
        OR: [
          { number: { contains: search, mode: 'insensitive' } },
          { client: { lastName: { contains: search, mode: 'insensitive' } } },
          { vehicle: { plate: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    };

    const [total, quotes] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, phone: true } },
          vehicle: { select: { id: true, brand: true, model: true, plate: true, year: true } },
          items: true,
        },
      }),
    ]);

    res.json({ data: quotes, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Error listing quotes:', err.message);
    res.status(500).json({ error: 'Error al obtener presupuestos: ' + err.message });
  }
});

// GET /api/quotes/:id
router.get('/:id', async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        client: true,
        vehicle: { include: { client: true } },
        items: true,
      },
    });
    if (!quote) return res.status(404).json({ error: 'Presupuesto no encontrado' });
    res.json(quote);
  } catch (err) {
    console.error('Error getting quote:', err.message);
    res.status(500).json({ error: 'Error al obtener presupuesto: ' + err.message });
  }
});

// POST /api/quotes
router.post('/', async (req, res) => {
  try {
    const { clientId, vehicleId, validUntil, notes, laborCost, status, items } = req.body;
    if (!clientId || !vehicleId) {
      return res.status(400).json({ error: 'Cliente y vehículo requeridos' });
    }

    const number = await getNextQuoteNumber();
    const parsedItems = (items || []).filter(i => i.description && i.description.trim());
    const totalItems = parsedItems.reduce((acc, i) => acc + (parseFloat(i.subtotal) || 0), 0);
    const total = totalItems + (parseFloat(laborCost) || 0);

    const quote = await prisma.quote.create({
      data: {
        number,
        clientId: parseInt(clientId),
        vehicleId: parseInt(vehicleId),
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        laborCost: parseFloat(laborCost) || 0,
        total,
        status: status || 'DRAFT',
        items: {
          create: parsedItems.map(i => ({
            description: i.description.trim(),
            quantity:  parseFloat(i.quantity)  || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
            subtotal:  parseFloat(i.subtotal)  || 0,
          })),
        },
      },
      include: { items: true, client: true, vehicle: true },
    });

    res.status(201).json(quote);
  } catch (err) {
    console.error('Error creating quote:', err.message);
    res.status(500).json({ error: 'Error al crear presupuesto: ' + err.message });
  }
});

// PUT /api/quotes/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { validUntil, notes, laborCost, status, items } = req.body;

    const parsedItems = (items || []).filter(i => i.description && i.description.trim());
    const totalItems = parsedItems.reduce((acc, i) => acc + (parseFloat(i.subtotal) || 0), 0);
    const total = totalItems + (parseFloat(laborCost) || 0);

    // Borrar ítems anteriores y crear los nuevos
    await prisma.quoteItem.deleteMany({ where: { quoteId: id } });

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        laborCost: parseFloat(laborCost) || 0,
        total,
        status,
        items: {
          create: parsedItems.map(i => ({
            description: i.description.trim(),
            quantity:  parseFloat(i.quantity)  || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
            subtotal:  parseFloat(i.subtotal)  || 0,
          })),
        },
      },
      include: { items: true, client: true, vehicle: true },
    });

    res.json(quote);
  } catch (err) {
    console.error('Error updating quote:', err.message);
    res.status(500).json({ error: 'Error al actualizar presupuesto: ' + err.message });
  }
});

// POST /api/quotes/:id/convert — convierte presupuesto aprobado a trabajo
router.post('/:id/convert', async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: true },
    });
    if (!quote) return res.status(404).json({ error: 'Presupuesto no encontrado' });
    if (quote.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Solo se pueden convertir presupuestos aprobados' });
    }

    const job = await prisma.job.create({
      data: {
        vehicleId: quote.vehicleId,
        quoteId: quote.id,
        description: `Trabajo desde presupuesto ${quote.number}`,
        laborCost: quote.laborCost,
        totalCost: quote.total,
        status: 'PENDING',
        notes: quote.notes,
        items: {
          create: quote.items.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })),
        },
      },
      include: { items: true, vehicle: { include: { client: true } } },
    });

    res.status(201).json(job);
  } catch (err) {
    console.error('Error converting quote:', err.message);
    res.status(500).json({ error: 'Error al convertir presupuesto: ' + err.message });
  }
});

// DELETE /api/quotes/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.quote.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Presupuesto eliminado' });
  } catch (err) {
    console.error('Error deleting quote:', err.message);
    res.status(500).json({ error: 'Error al eliminar presupuesto: ' + err.message });
  }
});

module.exports = router;
