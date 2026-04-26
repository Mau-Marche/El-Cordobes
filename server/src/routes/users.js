const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// GET /api/users
router.get('/', requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, fullName: true, role: true, active: true, createdAt: true },
    orderBy: { fullName: 'asc' },
  });
  res.json(users);
});

// POST /api/users
router.post('/', requireAdmin, async (req, res) => {
  const { username, password, fullName, role } = req.body;
  if (!username || !password || !fullName) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return res.status(409).json({ error: 'El usuario ya existe' });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, password: hashed, fullName, role: role || 'OPERATOR' },
    select: { id: true, username: true, fullName: true, role: true },
  });
  res.status(201).json(user);
});

// PUT /api/users/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { fullName, role, active, password } = req.body;
  const data = {};
  if (fullName) data.fullName = fullName;
  if (role) data.role = role;
  if (active !== undefined) data.active = active;
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
    data.password = await bcrypt.hash(password, 12);
  }
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, fullName: true, role: true, active: true },
  });
  res.json(user);
});

// DELETE /api/users/:id — no puede eliminarse a sí mismo ni al último admin
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });
    }
    // Asegurarse de que quede al menos un admin
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'No podés eliminar el único administrador del sistema' });
      }
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar usuario: ' + err.message });
  }
});

module.exports = router;
