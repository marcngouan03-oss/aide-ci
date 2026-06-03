'use strict';
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');

const PORT    = parseInt(process.env.PORT || '5000', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

// ─────────────────────────────────────────────
// 1. EXPRESS + HTTP SERVER DÉMARRÉS IMMÉDIATEMENT
// ─────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: "*", credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middlewares
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// 2. HEALTHCHECK — DISPONIBLE IMMÉDIATEMENT
// ─────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// 3. LE SERVEUR ÉCOUTE AVANT LA DB
// ─────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Aide CI API démarrée sur port ${PORT} [${IS_PROD ? 'prod' : 'dev'}]`);
});

// Gestion erreurs serveur
server.on('error', err => {
  console.error("Erreur serveur:", err.message);
  process.exit(1);
});

// ─────────────────────────────────────────────
// 4. CONNEXION MONGODB EN ARRIÈRE‑PLAN (RETRY)
// ─────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("FATAL: MONGODB_URI manquant");
  process.exit(1);
}

async function connectDB(attempt = 1) {
  const MAX = 20;

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log("MongoDB connecté");
    loadApp(); // Charger routes + sockets une fois DB OK

  } catch (err) {
    console.error(`MongoDB tentative ${attempt}/${MAX}: ${err.message}`);

    if (attempt >= MAX) {
      console.error("FATAL: MongoDB inaccessible après plusieurs tentatives");
      return;
    }

    setTimeout(() => connectDB(attempt + 1), 3000);
  }
}

connectDB();

// ─────────────────────────────────────────────
// 5. ROUTES + SOCKET.IO (APRÈS DB)
// ─────────────────────────────────────────────
function loadApp() {
  console.log("Chargement des routes et sockets…");

  app.use('/api', require('./src/routes/index'));
  require('./src/socket/index')(io);

  app.use((req, res) => res.status(404).json({ success: false, message: "Route introuvable" }));

  app.use((err, req, res, _next) => {
    console.error("Express error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  });
}

// ─────────────────────────────────────────────
// 6. SHUTDOWN PROPRE
// ─────────────────────────────────────────────
const shutdown = (sig) => {
  console.log(`${sig} — arrêt propre…`);
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  e => { console.error('uncaughtException:',  e); process.exit(1); });
process.on('unhandledRejection', e => { console.error('unhandledRejection:', e); process.exit(1); });
