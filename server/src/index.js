require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const vehicleRoutes = require('./routes/vehicles');
const jobRoutes = require('./routes/jobs');
const quoteRoutes = require('./routes/quotes');
const dashboardRoutes = require('./routes/dashboard');
const migrationRoutes = require('./routes/migration');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const catalogRoutes = require('./routes/catalog');

const app = express();
const PORT = process.env.PORT || 3000;

// Crear directorios de storage si no existen
const dirs = [
  process.env.UPLOADS_PATH || './uploads',
  process.env.PDFS_PATH || './uploads/pdfs',
  './uploads/images',
  './uploads/documents',
  process.env.BACKUP_PATH || './backups',
];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Seguridad base
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS — permite toda la red local
app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sin origin (apps locales, curl) y cualquier IP local
    if (!origin) return callback(null, true);
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(origin);
    callback(null, isLocal);
  },
  credentials: true,
}));

// Rate limiting — protege el login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Espere 15 minutos.' },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Archivos estáticos (uploads)
app.use('/uploads', express.static(path.resolve(process.env.UPLOADS_PATH || './uploads')));

// Rutas
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/catalog', catalogRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// En producción: servir el frontend compilado (npm run build en /client)
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// Error handler global
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Servidor El Cordobés corriendo en http://0.0.0.0:${PORT}`);
  logger.info(`Accesible en la red local en http://<IP-DE-ESTE-PC>:${PORT}`);
});
