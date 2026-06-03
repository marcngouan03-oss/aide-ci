const jwt  = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Non autorise — token manquant' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aide_ci_secret_2024');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    if (user.statut === 'banni')    return res.status(403).json({ success: false, message: 'Compte banni' });
    if (user.statut === 'suspendu') return res.status(403).json({ success: false, message: 'Compte suspendu' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide ou expire' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: `Acces refuse — role requis: ${roles.join(', ')}` });
  next();
};
