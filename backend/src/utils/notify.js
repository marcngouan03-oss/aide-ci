const { Notification } = require('../models/index');

// Créer une notification en DB et l'envoyer via Socket si l'utilisateur est connecté
async function notify(io, connectedUsers, userId, { titre, corps, type = 'systeme', data = {} }) {
  try {
    const notif = await Notification.create({
      destinataire: userId,
      titre, corps, type, data,
    });

    // Envoyer en temps réel si l'utilisateur est connecté
    const socketId = connectedUsers.get(userId.toString());
    if (socketId && io) {
      io.to(socketId).emit('notification', {
        _id:       notif._id,
        titre:     notif.titre,
        corps:     notif.corps,
        type:      notif.type,
        data:      notif.data,
        lu:        false,
        createdAt: notif.createdAt,
      });
    }

    return notif;
  } catch (err) {
    console.error('notify error:', err.message);
  }
}

module.exports = notify;
