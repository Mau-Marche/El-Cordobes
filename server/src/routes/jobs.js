const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(process.env.UPLOADS_PATH || './uploads', 'documents');
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Tipo de archivo no permitido'));
  },
});

// Actualiza vehicle.mileage con el km del trabajo más reciente (por fecha).
// Prioriza mileageOut sobre mileageIn dentro del mismo trabajo.
async function syncVehicleMileage(vehicleId) {
  try {
    const latest = await prisma.job.findFirst({
      where: {
        vehicleId,
        OR: [{ mileageOut: { not: null } }, { mileageIn: { not: null } }],
      },
      orderBy: { date: 'desc' },
      select: { mileageIn: true, mileageOut: true },
    });
    if (!latest) return;
    const currentKm = latest.mileageOut ?? latest.mileageIn;
    if (currentKm) {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { mileage: currentKm } });
    }
  } catch { /* no bloquear la respuesta si falla */ }
}

// GET /api/jobs?vehicleId=&status=&page=1&limit=20
router.get('/', async (req, res) => {
  const { vehicleId, status, page = 1, limit = 20, search = '' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(vehicleId ? { vehicleId: parseInt(vehicleId) } : {}),
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { vehicle: { plate: { contains: search, mode: 'insensitive' } } },
        { vehicle: { client: { lastName: { contains: search, mode: 'insensitive' } } } },
      ],
    } : {}),
  };

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { date: 'desc' },
      include: {
        items: true,
        vehicle: { include: { client: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        attachments: true,
      },
    }),
  ]);

  res.json({ data: jobs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      items: true,
      attachments: true,
      vehicle: { include: { client: true } },
    },
  });
  if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });
  res.json(job);
});

// POST /api/jobs
router.post('/', async (req, res) => {
  const { vehicleId, quoteId, date, description, mileageIn, mileageOut, laborCost, status, notes, items } = req.body;
  if (!vehicleId || !description) {
    return res.status(400).json({ error: 'Vehículo y descripción requeridos' });
  }

  const parsedItems = items || [];
  const totalItems = parsedItems.reduce((acc, i) => acc + parseFloat(i.subtotal || 0), 0);
  const total = totalItems + parseFloat(laborCost || 0);

  const vid = parseInt(vehicleId);
  const job = await prisma.job.create({
    data: {
      vehicleId: vid,
      quoteId: quoteId ? parseInt(quoteId) : null,
      date: date ? new Date(date) : new Date(),
      description,
      mileageIn: mileageIn ? parseInt(mileageIn) : null,
      mileageOut: mileageOut ? parseInt(mileageOut) : null,
      laborCost: parseFloat(laborCost || 0),
      totalCost: total,
      status: status || 'PENDING',
      notes,
      items: {
        create: parsedItems.map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          subtotal: parseFloat(i.subtotal),
        })),
      },
    },
    include: { items: true, vehicle: { include: { client: true } } },
  });

  // Mantener vehicle.mileage actualizado al mayor km registrado
  await syncVehicleMileage(vid);

  res.status(201).json(job);
});

// PUT /api/jobs/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { description, mileageIn, mileageOut, laborCost, status, notes, items } = req.body;

  const parsedItems = items || [];
  const totalItems = parsedItems.reduce((acc, i) => acc + parseFloat(i.subtotal || 0), 0);
  const total = totalItems + parseFloat(laborCost || 0);

  await prisma.jobItem.deleteMany({ where: { jobId: id } });

  const job = await prisma.job.update({
    where: { id },
    data: {
      description,
      mileageIn: mileageIn ? parseInt(mileageIn) : null,
      mileageOut: mileageOut ? parseInt(mileageOut) : null,
      laborCost: parseFloat(laborCost || 0),
      totalCost: total,
      status,
      notes,
      items: {
        create: parsedItems.map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          subtotal: parseFloat(i.subtotal),
        })),
      },
    },
    include: { items: true, vehicle: { include: { client: true } }, attachments: true },
  });

  // Mantener vehicle.mileage actualizado al mayor km registrado
  await syncVehicleMileage(job.vehicleId);

  res.json(job);
});

// POST /api/jobs/:id/to-quote — genera un comprobante/presupuesto desde el trabajo
router.post('/:id/to-quote', async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        items: true,
        vehicle: { include: { client: true } },
      },
    });
    if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });

    // Número correlativo usando el mismo pool de presupuestos
    const last = await prisma.quote.findFirst({ orderBy: { id: 'desc' } });
    const next = last ? parseInt(last.number.replace(/\D/g, '')) + 1 : 1;
    const number = `COMP-${String(next).padStart(5, '0')}`;

    // Convertir líneas de descripción del trabajo en ítems del presupuesto
    // Formato típico: "- Cambio de aceite\n- Filtro de aire"
    const descItems = job.description
      ? job.description
          .split('\n')
          .map(l => l.replace(/^[-•]\s*/, '').trim())
          .filter(l => l.length > 0)
          .map(l => ({ description: l, quantity: 1, unitPrice: 0, subtotal: 0 }))
      : [];

    // Ítems del trabajo con precios + líneas de descripción sin precio
    const allItems = [
      ...job.items.map(i => ({
        description: i.description,
        quantity:    i.quantity,
        unitPrice:   i.unitPrice,
        subtotal:    i.subtotal,
      })),
      ...descItems,
    ];

    const quote = await prisma.quote.create({
      data: {
        number,
        clientId: job.vehicle.clientId,
        vehicleId: job.vehicleId,
        date: job.date,
        notes: job.notes || null,   // solo las notas internas
        laborCost: job.laborCost,
        total: job.totalCost,
        status: 'APPROVED',
        items: { create: allItems },
      },
      include: {
        items: true,
        client: true,
        vehicle: true,
      },
    });

    // Adjuntar mileageIn del trabajo para que el frontend lo muestre en el comprobante
    res.status(201).json({ ...quote, _jobMileageIn: job.mileageIn });
  } catch (err) {
    console.error('Error generating comprobante:', err.message);
    res.status(500).json({ error: 'Error al generar comprobante: ' + err.message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', async (req, res) => {
  await prisma.job.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: 'Trabajo eliminado' });
});

// POST /api/jobs/:id/attachments
router.post('/:id/attachments', upload.array('files', 10), async (req, res) => {
  const jobId = parseInt(req.params.id);
  const attachments = await Promise.all(
    req.files.map(f =>
      prisma.attachment.create({
        data: {
          jobId,
          filename: f.filename,
          originalName: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
          path: `/uploads/documents/${f.filename}`,
        },
      })
    )
  );
  res.status(201).json(attachments);
});

// DELETE /api/jobs/:id/attachments/:attachId
router.delete('/:id/attachments/:attachId', async (req, res) => {
  const att = await prisma.attachment.findUnique({ where: { id: parseInt(req.params.attachId) } });
  if (att) {
    const fullPath = path.resolve(process.env.UPLOADS_PATH || './uploads', 'documents', att.filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    await prisma.attachment.delete({ where: { id: att.id } });
  }
  res.json({ message: 'Adjunto eliminado' });
});

module.exports = router;
