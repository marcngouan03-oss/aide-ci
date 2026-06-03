'use strict';
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');

const PORT    = parseInt(process.env.PORT || '5000', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

// ── MONGODB URI ───────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('FATAL: MONGODB_URI manquant dans .env');
  process.exit(1);
}

// ── CORS ─────────────────────────────────────────────────────
const ALLOWED = (process.env.CLIENT_URL || '')
  .split(',').map(s => s.trim()).filter(Boolean)
  .concat([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:4173',
  ]);

const originOK = (origin) => {
  if (!origin) return true;
  if (ALLOWED.some(a => origin.startsWith(a))) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/\.netlify\.app$/.test(origin))  return true;
  if (/\.railway\.app$/.test(origin))  return true;
  if (/\.up\.railway\.app$/.test(origin)) return true;
  return false;
};

// ── APP ──────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: (o, cb) => originOK(o) ? cb(null, true) : cb(new Error('CORS: ' + o)), credentials: true },
  pingTimeout:  60000,
  pingInterval: 25000,
});

app.use(cors({ origin: (o, cb) => originOK(o) ? cb(null, true) : cb(new Error('CORS: ' + o)), credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check — disponible AVANT la connexion DB
app.get('/health', (_, res) => res.json({
  ok:   true,
  db:   mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  env:  process.env.NODE_ENV || 'development',
  time: new Date().toISOString(),
}));

// ── MONGODB avec retry ───────────────────────────────────────
async function connectDB(attempt = 1) {
  const MAX = 8;
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS:          45000,
      connectTimeoutMS:         15000,
      maxPoolSize:              10,
    });
    console.log('MongoDB connecte');
  } catch (err) {
    console.error(`MongoDB tentative ${attempt}/${MAX}: ${err.message}`);
    if (attempt >= MAX) { console.error('FATAL: MongoDB inaccessible'); process.exit(1); }
    await new Promise(r => setTimeout(r, Math.min(attempt * 2000, 12000)));
    return connectDB(attempt + 1);
  }
}

mongoose.connection.on('disconnected', () => console.warn('MongoDB deconnecte — reconnexion auto...'));
mongoose.connection.on('reconnected',  () => console.log('MongoDB reconnecte'));

// ── ROUTES & SOCKET (charges APRES DB) ───────────────────────
function loadApp() {
  app.use('/api', require('./src/routes/index'));
  require('./src/socket/index')(io);
  app.use((req, res) => res.status(404).json({ success: false, message: 'Route introuvable' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error('Express error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  });
}

// ── DEMARRAGE ─────────────────────────────────────────────────
async function start() {
  await connectDB();
  loadApp();
  server.listen(PORT, '0.0.0.0', () =>
    console.log(`Aide CI API sur port ${PORT} [${IS_PROD ? 'prod' : 'dev'}]`)
  );
  server.on('error', err => {
    if (err.code === 'EADDRINUSE')
      console.error(`ERREUR: port ${PORT} deja utilise. Arretez le processus puis relancez.`);
    else console.error('Erreur serveur:', err.message);
    process.exit(1);
  });
}

// ── ARRET PROPRE ──────────────────────────────────────────────
const shutdown = (sig) => {
  console.log(`\n${sig} — arret propre...`);
  server.close(async () => { await mongoose.connection.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  e => { console.error('uncaughtException:',  e); process.exit(1); });
process.on('unhandledRejection', e => { console.error('unhandledRejection:', e); process.exit(1); });

start();
