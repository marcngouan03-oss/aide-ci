const User    = require('../models/User');
const Mission = require('../models/Mission');
const { Categorie, Config, Transaction, Notification } = require('../models/index');

exports.getDashboard = async (req, res) => {
  try {
    const [totalUsers, totalPrestataires, missionsActives, missionsMois, txns, newUsers7d] =
      await Promise.all([
        User.countDocuments({ role: { $ne: 'admin' } }),
        User.countDocuments({ role: 'prestataire', valide: true, statut: 'actif' }),
        Mission.countDocuments({ statut: { $in: ['depot_recu','prestataire_en_route','prestataire_arrive','en_cours'] } }),
        Mission.countDocuments({ createdAt: { $gte: new Date(new Date().setDate(1)) } }),
        Transaction.find({ createdAt: { $gte: new Date(new Date().setDate(1)) }, type: 'depot', statut: 'confirme' }),
        User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7*24*3600*1000) }, role: { $ne: 'admin' } }),
      ]);
    const escrowTotal = txns.reduce((s, t) => s + t.montant, 0);
    res.json({ success: true, stats: { totalUsers, totalPrestataires, missionsActives, missionsMois, escrowTotal, newUsers7d } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getUsers = async (req, res) => {
  try {
    const { role, statut, page = 1, limit = 50 } = req.query;
    const q = { role: { $ne: 'admin' } };
    if (role)   q.role   = role;
    if (statut) q.statut = statut;
    const users = await User.find(q).select('-password').populate('categorieId','nom icone')
      .skip((page-1)*limit).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await User.countDocuments(q);
    res.json({ success: true, users, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { statut, valide, categorieId } = req.body;
    const update = {};
    if (statut !== undefined) {
      update.statut = statut;
      if (statut === 'banni' || statut === 'suspendu') update.valide = false;
      if (statut === 'actif') update.valide = true;
    }
    if (valide !== undefined) update.valide = valide;
    if (categorieId) update.categorieId = categorieId;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMissions = async (req, res) => {
  try {
    const { statut, page = 1, limit = 50 } = req.query;
    const q = statut ? { statut } : {};
    const missions = await Mission.find(q)
      .populate('demandeur','prenom nom email')
      .populate('prestataire','prenom nom email profession')
      .populate('categorie','nom icone')
      .skip((page-1)*limit).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await Mission.countDocuments(q);
    res.json({ success: true, missions, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const q = type ? { type } : {};
    const txns = await Transaction.find(q)
      .populate('demandeur','prenom nom').populate('prestataire','prenom nom')
      .skip((page-1)*limit).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await Transaction.countDocuments(q);
    res.json({ success: true, transactions: txns, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getCategories = async (req, res) => {
  const cats = await Categorie.find().sort({ nom: 1 });
  res.json({ success: true, categories: cats });
};
exports.createCategorie = async (req, res) => {
  try { const c = await Categorie.create(req.body); res.status(201).json({ success: true, categorie: c }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateCategorie = async (req, res) => {
  const c = await Categorie.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, categorie: c });
};
exports.deleteCategorie = async (req, res) => {
  await Categorie.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

exports.getConfig = async (req, res) => {
  const cfgs = await Config.find();
  const obj = {}; cfgs.forEach(c => obj[c.cle] = c.valeur);
  res.json({ success: true, config: obj });
};
exports.updateConfig = async (req, res) => {
  try {
    for (const [cle, valeur] of Object.entries(req.body))
      await Config.findOneAndUpdate({ cle }, { cle, valeur, updatedAt: new Date() }, { upsert: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAdminNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({ destinataire: req.user._id })
      .sort({ createdAt: -1 }).limit(100);
    const unread = await Notification.countDocuments({ destinataire: req.user._id, lu: false });
    res.json({ success: true, notifications: notifs, unread });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
