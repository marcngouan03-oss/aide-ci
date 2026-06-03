const Mission     = require('../models/Mission');
const User        = require('../models/User');
const { Transaction, Notification } = require('../models/index');

// ── HELPERS ───────────────────────────────────────────────────
function calcDist(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); // km
}

async function notifyUser(userId, titre, corps, type, data = {}) {
  await Notification.create({ destinataire: userId, titre, corps, type, data });
}

// POST /api/missions
exports.creerMission = async (req, res) => {
  try {
    const { prestataireId, description, montant, moyenPaiement, adresseTravail } = req.body;
    if (!prestataireId || !description || !montant || !moyenPaiement)
      return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });

    const presta = await User.findById(prestataireId);
    if (!presta || presta.role !== 'prestataire')
      return res.status(404).json({ success: false, message: 'Prestataire introuvable' });

    const mission = await Mission.create({
      demandeur: req.user._id,
      prestataire: prestataireId,
      categorie: presta.categorieId,
      description,
      montant: parseFloat(montant),
      montantTotal: parseFloat(montant),
      moyenPaiement,
      adresseTravail: adresseTravail || '',
    });

    // Notifier le prestataire
    await notifyUser(prestataireId, 'Nouvelle mission', `${req.user.prenom} a cree une mission: ${description}`, 'mission', { missionId: mission._id });
    // Notifier l'admin
    const admin = await User.findOne({ role: 'admin' });
    if (admin) await notifyUser(admin._id, 'Mission creee', `Mission: ${description} — ${montant} FCFA`, 'mission', { missionId: mission._id });

    res.status(201).json({ success: true, mission });
  } catch (err) {
    console.error('creerMission:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/missions/:id/depot
// Le demandeur confirme avoir effectué le dépôt → l'argent va chez l'admin en escrow
exports.confirmerDepot = async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id)
      .populate('demandeur', 'prenom nom')
      .populate('prestataire', 'prenom nom');
    if (!mission) return res.status(404).json({ success: false, message: 'Mission introuvable' });
    if (mission.demandeur._id.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Non autorise' });

    mission.statut = 'depot_recu';
    mission.dateDepot = new Date();
    await mission.save();

    // Enregistrer la transaction
    await Transaction.create({
      mission: mission._id,
      demandeur: mission.demandeur._id,
      prestataire: mission.prestataire._id,
      montant: mission.montantTotal,
      type: 'depot',
      moyen: mission.moyenPaiement,
      statut: 'confirme',
    });

    // Notifications
    const admin = await User.findOne({ role: 'admin' });
    if (admin) await notifyUser(admin._id, 'Nouveau depot recu',
      `${mission.demandeur.prenom} a depose ${mission.montantTotal} FCFA pour: ${mission.description}`,
      'paiement', { missionId: mission._id });

    await notifyUser(mission.prestataire._id, 'Depot confirme',
      `Le paiement de ${mission.montantTotal} FCFA est securise. Rendez-vous chez le client.`,
      'paiement', { missionId: mission._id });

    res.json({ success: true, mission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/missions/:id/statut
exports.updateStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    const mission = await Mission.findById(req.params.id)
      .populate('demandeur', 'prenom nom')
      .populate('prestataire', 'prenom nom');
    if (!mission) return res.status(404).json({ success: false, message: 'Mission introuvable' });

    const uid = req.user._id.toString();
    const isDemandeur  = mission.demandeur._id.toString()  === uid;
    const isPrestataire= mission.prestataire._id.toString()=== uid;
    const isAdmin      = req.user.role === 'admin';

    // Droits
    const droits = {
      prestataire_en_route: isPrestataire,
      prestataire_arrive:   isPrestataire,
      en_cours:             isPrestataire,
      termine:              isDemandeur,
      paye:                 isAdmin,
      litige:               isDemandeur || isPrestataire,
      annule:               isDemandeur || isAdmin,
    };
    if (droits[statut] === false || droits[statut] === undefined)
      return res.status(403).json({ success: false, message: 'Non autorise pour ce statut' });

    if (statut === 'en_cours')  mission.dateDebut = new Date();
    if (statut === 'termine')   mission.dateFin = new Date();
    if (statut === 'paye') {
      mission.datePaiement = new Date();
      // Créer la transaction de libération
      await Transaction.create({
        mission: mission._id,
        demandeur: mission.demandeur._id,
        prestataire: mission.prestataire._id,
        montant: mission.montant,
        type: 'liberation',
        moyen: mission.moyenPaiement,
        statut: 'confirme',
      });
      // Incrémenter le compteur de missions du prestataire
      await User.findByIdAndUpdate(mission.prestataire._id, { $inc: { nombreMissions: 1 } });
    }

    mission.statut = statut;
    await mission.save();

    // Notifications selon le statut
    const msgs = {
      prestataire_en_route: [mission.demandeur._id, 'En route', `${mission.prestataire.prenom} est en route vers vous.`, 'mission'],
      prestataire_arrive:   [mission.demandeur._id, 'Prestataire arrive', `${mission.prestataire.prenom} est arrive. Validez le debut.`, 'mission'],
      en_cours:             [mission.demandeur._id, 'Travail commence', `${mission.prestataire.prenom} a commence le travail.`, 'mission'],
      termine:              [null, 'Mission terminee', '', 'mission'],
      paye: [mission.prestataire._id, 'Paiement libere',
        `${mission.montant} FCFA ont ete liberes. Transferez via ${mission.moyenPaiement.replace('_',' ')}.`, 'paiement'],
    };

    if (statut === 'termine') {
      const admin = await User.findOne({ role: 'admin' });
      if (admin) await notifyUser(admin._id, 'Mission terminee',
        `${mission.demandeur.prenom} a confirme la fin. Liberez ${mission.montant} FCFA.`, 'paiement', { missionId: mission._id });
      await notifyUser(mission.prestataire._id, 'Travail valide',
        `${mission.demandeur.prenom} a valide votre travail. En attente du paiement admin.`, 'paiement');
    } else if (msgs[statut] && msgs[statut][0]) {
      await notifyUser(msgs[statut][0], msgs[statut][1], msgs[statut][2], msgs[statut][3], { missionId: mission._id });
    }

    res.json({ success: true, mission });
  } catch (err) {
    console.error('updateStatut:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/missions/:id/noter
exports.noterMission = async (req, res) => {
  try {
    const { note, avis } = req.body;
    if (!note || note < 1 || note > 5)
      return res.status(400).json({ success: false, message: 'Note entre 1 et 5 requise' });

    const mission = await Mission.findById(req.params.id);
    if (!mission) return res.status(404).json({ success: false, message: 'Mission introuvable' });

    mission.notePrestataire = note;
    if (avis) mission.avisDemandeur = avis.trim();
    await mission.save();

    // Recalculer la note moyenne du prestataire
    const missions = await Mission.find({
      prestataire: mission.prestataire,
      notePrestataire: { $exists: true, $gt: 0 },
    }).select('notePrestataire');
    if (missions.length > 0) {
      const avg = missions.reduce((s, m) => s + m.notePrestataire, 0) / missions.length;
      await User.findByIdAndUpdate(mission.prestataire, {
        notemoyenne: Math.round(avg * 10) / 10,
        nombreAvis: missions.length,
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/missions/mes-missions
exports.mesMissions = async (req, res) => {
  try {
    const q = req.user.role === 'demandeur'
      ? { demandeur: req.user._id }
      : { prestataire: req.user._id };
    const missions = await Mission.find(q)
      .populate('demandeur',  'prenom nom email ville')
      .populate('prestataire','prenom nom email profession ville location disponibilite enLigne derniereConnexion')
      .populate('categorie',  'nom icone couleur')
      .sort({ createdAt: -1 });

    // Calculer la distance réelle pour chaque mission
    const result = missions.map(m => {
      const obj = m.toObject();
      const d = m.demandeur, p = m.prestataire;
      if (d && p && p.location?.coordinates?.[0] && p.location?.coordinates?.[1]) {
        // On essaie avec les coordonnées du lieu de travail si dispo
        const [pLng, pLat] = p.location.coordinates;
        if (m.locationTravail?.coordinates?.[0]) {
          const [wLng, wLat] = m.locationTravail.coordinates;
          obj.distanceKm = Math.round(calcDist(pLat, pLng, wLat, wLng) * 10) / 10;
          obj.tempsMin   = Math.max(1, Math.round(obj.distanceKm / 30 * 60));
        }
      }
      return obj;
    });

    res.json({ success: true, missions: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/missions/:id
exports.getMission = async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id)
      .populate('demandeur',  'prenom nom email ville location')
      .populate('prestataire','prenom nom email profession ville location disponibilite enLigne derniereConnexion notemoyenne nombreMissions')
      .populate('categorie',  'nom icone couleur');
    if (!mission) return res.status(404).json({ success: false, message: 'Mission introuvable' });

    const obj = mission.toObject();
    // Calculer distance réelle prestataire → lieu travail
    const p = mission.prestataire;
    if (p?.location?.coordinates?.[0] && mission.locationTravail?.coordinates?.[0]) {
      const [pLng, pLat] = p.location.coordinates;
      const [wLng, wLat] = mission.locationTravail.coordinates;
      obj.distanceKm = Math.round(calcDist(pLat, pLng, wLat, wLng) * 10) / 10;
      obj.tempsMin   = Math.max(1, Math.round(obj.distanceKm / 30 * 60));
    }

    res.json({ success: true, mission: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
