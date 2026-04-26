const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticate, requireAdmin } = require('../middleware/auth');

const SETTINGS_FILE = path.resolve(__dirname, '../../data/settings.json');

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      const defaults = {
        workshopName: 'El Cordobés',
        workshopAddress: '',
        workshopPhone: '',
        workshopEmail: '',
        workshopCuit: '',
      };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaults, null, 2), 'utf8');
      return defaults;
    }
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeSettings(data) {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/settings — cualquier usuario autenticado puede leer
router.get('/', authenticate, (req, res) => {
  res.json(readSettings());
});

// PUT /api/settings — solo admin
router.put('/', authenticate, requireAdmin, (req, res) => {
  try {
    const allowed = ['workshopName', 'workshopAddress', 'workshopPhone', 'workshopEmail', 'workshopCuit'];
    const current = readSettings();
    const updated = { ...current };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updated[key] = req.body[key];
    }
    writeSettings(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar configuración: ' + err.message });
  }
});

module.exports = router;
module.exports.readSettings = readSettings;
