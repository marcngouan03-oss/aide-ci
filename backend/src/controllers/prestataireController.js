const User    = require('../models/User');
const { Message } = require('../models/index');

function calcDist(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// GET /api/prestataires — tous les prestataires actifs avec distances réelles
exports.searchPrestataires = async (req, res) => {
  try {
    const { categorie, lat, lng, disponibilite } = req.query;
    const query = { role: 'prestataire', valide: true, statut: 'actif' };
    if (categorie)     query.categorieId = categorie;
    if (disponibilite) query.disponibilite = disponibilite;

    const list = await User.find(query)
      .select('-password')
      .populate('categorieId', 'nom icone couleur')
      .sort({ notemoyenne: -1 })
      .limit(200);

    const result = list.map(p => {
      const obj = p.toObject();
      if (lat && lng && p.location?.coordinates?.[0]) {
        const [pLng, pLat] = p.location.coordinates;
        const dist = calcDist(parseFloat(lat), parseFloat(lng), pLat, pLng);
        obj.distanceKm  = Math.round(dist * 10) / 10;
        obj.tempsArrivee = Math.max(1, Math.round(dist / 30 * 60)); // ~30 km/h en ville
      }
      return obj;
    });

    // Trier par distance si position fournie
    if (lat && lng) result.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

    res.json({ success: true, prestataires: result, total: result.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/prestataires/carte — pour la carte live
exports.prestatairesCarte = async (req, res) => {
  try {
    const list = await User.find({ role: 'prestataire', valide: true, statut: 'actif' })
      .select('prenom nom profession disponibilite enLigne derniereConnexion location notemoyenne nombreMissions categorieId ville')
      .populate('categorieId', 'nom icone couleur')
      .limit(500);
    res.json({ success: true, prestataires: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/prestataires/:id
exports.getPrestataire = async (req, res) => {
  try {
    const p = await User.findOne({ _id: req.params.id, role: 'prestataire' })
      .select('-password')
      .populate('categorieId', 'nom icone couleur');
    if (!p) return res.status(404).json({ success: false, message: 'Prestataire introuvable' });

    const obj = p.toObject();
    // Distance depuis la position du demandeur si fournie
    const { lat, lng } = req.query;
    if (lat && lng && p.location?.coordinates?.[0]) {
      const [pLng, pLat] = p.location.coordinates;
      const dist = calcDist(parseFloat(lat), parseFloat(lng), pLat, pLng);
      obj.distanceKm  = Math.round(dist * 10) / 10;
      obj.tempsArrivee = Math.max(1, Math.round(dist / 30 * 60));
    }

    res.json({ success: true, prestataire: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/messages/:userId
exports.getMessages = async (req, res) => {
  try {
    const convId = [req.user._id.toString(), req.params.userId].sort().join('_');
    const messages = await Message.find({ conversation: convId })
      .populate('expediteur', 'prenom nom')
      .sort({ createdAt: 1 });
    // Marquer comme lus
    await Message.updateMany({ conversation: convId, destinataire: req.user._id, lu: false }, { lu: true });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/messages
exports.sendMessage = async (req, res) => {
  try {
    const { destinataireId, contenu, type } = req.body;
    if (!contenu?.trim()) return res.status(400).json({ success: false, message: 'Contenu requis' });
    const convId = [req.user._id.toString(), destinataireId].sort().join('_');
    const msg = await Message.create({
      conversation: convId, expediteur: req.user._id,
      destinataire: destinataireId, contenu: contenu.trim(), type: type || 'texte',
    });
    const populated = await Message.findById(msg._id).populate('expediteur', 'prenom nom');
    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
