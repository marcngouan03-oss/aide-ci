const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { Message, Notification } = require('../models/index');

// Map globale userId → socketId (partagée pour les notifications depuis les controllers)
const connectedUsers = new Map();
module.exports.connectedUsers = connectedUsers;

module.exports = function(io) {
  // Auth socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token manquant'));
    try {
      const d = jwt.verify(token, process.env.JWT_SECRET || 'aide_ci_secret_2024');
      socket.userId = d.id;
      next();
    } catch { next(new Error('Token invalide')); }
  });

  io.on('connection', async (socket) => {
    const uid = socket.userId;
    connectedUsers.set(uid, socket.id);
    socket.join(`user_${uid}`);

    // Marquer en ligne + diffuser
    try {
      const user = await User.findByIdAndUpdate(uid,
        { enLigne: true, derniereConnexion: new Date() },
        { new: true }
      ).select('prenom nom role profession disponibilite');

      if (user) {
        io.emit('user_status', {
          userId: uid,
          enLigne: true,
          derniereConnexion: new Date(),
          role: user.role,
        });

        // Envoyer les notifications non lues à la connexion
        const unread = await Notification.find({ destinataire: uid, lu: false })
          .sort({ createdAt: -1 }).limit(20);
        if (unread.length > 0) socket.emit('notifications_init', unread);
      }
    } catch(e) { console.error('socket connect:', e.message); }

    // ── GÉOLOC ───────────────────────────────────────────────
    socket.on('update_location', async ({ lat, lng }) => {
      try {
        await User.findByIdAndUpdate(uid, {
          location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        });
        // Diffuser à tous (carte live)
        io.emit('prestataire_location', { userId: uid, lat: parseFloat(lat), lng: parseFloat(lng) });
      } catch(e) { console.error('update_location:', e.message); }
    });

    // ── DISPONIBILITÉ ─────────────────────────────────────────
    socket.on('update_disponibilite', async ({ disponibilite }) => {
      try {
        await User.findByIdAndUpdate(uid, { disponibilite });
        io.emit('prestataire_disponibilite', { userId: uid, disponibilite });
      } catch(e) { console.error('update_dispo:', e.message); }
    });

    // ── CHAT ─────────────────────────────────────────────────
    socket.on('send_message', async ({ destinataireId, contenu, type }) => {
      try {
        const convId = [uid, destinataireId].sort().join('_');
        const msg = await Message.create({
          conversation: convId, expediteur: uid,
          destinataire: destinataireId,
          contenu: contenu?.trim(), type: type || 'texte',
        });
        const pop = await Message.findById(msg._id).populate('expediteur','prenom nom');

        // Envoyer au destinataire
        const destSock = connectedUsers.get(destinataireId);
        if (destSock) {
          io.to(destSock).emit('new_message', pop);
          // Déclencher son/vibration côté client
          io.to(destSock).emit('play_sound', { type: 'message' });
        }
        socket.emit('message_sent', pop);

        // Créer notification si destinataire hors ligne
        if (!destSock) {
          const sender = await User.findById(uid).select('prenom nom');
          await Notification.create({
            destinataire: destinataireId,
            titre: `Message de ${sender.prenom}`,
            corps: contenu.substring(0, 80),
            type: 'message',
            data: { senderId: uid, convId },
          });
        }
      } catch(e) { socket.emit('error', { message: e.message }); }
    });

    // ── MISSION ROOM ─────────────────────────────────────────
    socket.on('rejoindre_mission', (missionId) => socket.join(`mission_${missionId}`));

    socket.on('mission_update', ({ missionId, statut, data }) => {
      io.to(`mission_${missionId}`).emit('mission_updated', { statut, data });
    });

    // ── POSITION LIVE pendant une mission ────────────────────
    socket.on('mission_location', ({ missionId, lat, lng }) => {
      socket.to(`mission_${missionId}`).emit('mission_location_update', {
        userId: uid, lat, lng,
        timestamp: Date.now(),
      });
    });

    // ── DÉCONNEXION ───────────────────────────────────────────
    socket.on('disconnect', async () => {
      connectedUsers.delete(uid);
      try {
        await User.findByIdAndUpdate(uid, { enLigne: false, derniereConnexion: new Date() });
        io.emit('user_status', { userId: uid, enLigne: false, derniereConnexion: new Date() });
      } catch(e) { console.error('disconnect:', e.message); }
    });
  });
};
