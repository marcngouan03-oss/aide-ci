const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { Categorie, Notification } = require('../models/index');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'aide_ci_secret_2024', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

const sendToken = (user, code, res) => {
  const u = user.toObject();
  delete u.password;
  res.status(code).json({ success: true, token: signToken(user._id), user: u });
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { prenom, nom, email, password, role, ville, profession } = req.body;

    // Validation
    if (!prenom?.trim()) return res.status(400).json({ success: false, message: 'Prenom obligatoire' });
    if (!nom?.trim())    return res.status(400).json({ success: false, message: 'Nom obligatoire' });
    if (!email?.trim())  return res.status(400).json({ success: false, message: 'Email obligatoire' });
    if (!email.includes('@')) return res.status(400).json({ success: false, message: 'Email invalide' });
    if (!password || password.length < 6)
      return res.status(400).json({ success: false, message: 'Mot de passe minimum 6 caracteres' });
    if (!['demandeur','prestataire'].includes(role))
      return res.status(400).json({ success: false, message: 'Role invalide' });
    if (role === 'prestataire' && !profession?.trim())
      return res.status(400).json({ success: false, message: 'Profession obligatoire' });

    if (await User.findOne({ email: email.toLowerCase().trim() }))
      return res.status(400).json({ success: false, message: 'Un compte existe deja avec cet email' });

    const data = {
      prenom: prenom.trim(), nom: nom.trim(),
      email: email.toLowerCase().trim(),
      password, role,
      ville: ville?.trim() || '',
      statut: 'actif', valide: true,
      enLigne: true, derniereConnexion: new Date(),
    };

    if (role === 'prestataire') {
      data.profession = profession.trim();
      data.disponibilite = 'libre';
      const cat = await Categorie.findOne({ nom: { $regex: new RegExp(profession.trim(), 'i') } });
      if (cat) data.categorieId = cat._id;
    }

    const user = await User.create(data);

    // Notifier l'admin de la création de compte
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      await Notification.create({
        destinataire: admin._id,
        titre: 'Nouveau compte',
        corps: `${user.prenom} ${user.nom} (${user.role}) vient de s'inscrire.`,
        type: 'compte',
        data: { userId: user._id },
      });
    }

    // Notification de bienvenue pour l'utilisateur
    await Notification.create({
      destinataire: user._id,
      titre: 'Bienvenue sur Aide CI',
      corps: `Bonjour ${user.prenom}, votre compte est actif. ${role === 'prestataire' ? 'Vous etes maintenant visible sur la carte.' : 'Trouvez un prestataire pres de vous.'}`,
      type: 'systeme',
    });

    sendToken(user, 201, res);
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Un compte existe deja avec cet email' });
    console.error('REGISTER ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur: ' + err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim()) return res.status(400).json({ success: false, message: 'Email obligatoire' });
    if (!password)      return res.status(400).json({ success: false, message: 'Mot de passe obligatoire' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ success: false, message: 'Aucun compte avec cet email' });
    if (!(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    if (user.statut !== 'actif')
      return res.status(403).json({ success: false, message: 'Compte ' + user.statut });

    user.enLigne = true;
    user.derniereConnexion = new Date();
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    console.error('LOGIN ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur: ' + err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('categorieId');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/auth/logout
exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { enLigne: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/auth/location
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat et lng requis' });
    await User.findByIdAndUpdate(req.user._id, {
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/auth/disponibilite
exports.updateDisponibilite = async (req, res) => {
  try {
    const { disponibilite } = req.body;
    if (!['libre','occupe'].includes(disponibilite))
      return res.status(400).json({ success: false, message: 'Valeur invalide' });
    await User.findByIdAndUpdate(req.user._id, { disponibilite });
    res.json({ success: true, disponibilite });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({ destinataire: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    const unread = await Notification.countDocuments({ destinataire: req.user._id, lu: false });
    res.json({ success: true, notifications: notifs, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/auth/notifications/read
exports.markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ destinataire: req.user._id, lu: false }, { lu: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
