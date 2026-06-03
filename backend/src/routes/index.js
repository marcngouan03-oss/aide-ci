const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');

const auth   = require('../controllers/authController');
const presta = require('../controllers/prestataireController');
const mission= require('../controllers/missionController');
const admin  = require('../controllers/adminController');
const { Categorie } = require('../models/index');

// ── AUTH ──────────────────────────────────────────────────────
router.post('/auth/register',  auth.register);
router.post('/auth/login',     auth.login);
router.get ('/auth/me',        protect, auth.getMe);
router.put ('/auth/logout',    protect, auth.logout);
router.put ('/auth/location',  protect, auth.updateLocation);
router.put ('/auth/disponibilite', protect, authorize('prestataire'), auth.updateDisponibilite);
router.get ('/auth/notifications',      protect, auth.getNotifications);
router.put ('/auth/notifications/read', protect, auth.markNotificationsRead);

// ── CATEGORIES (public) ───────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const cats = await Categorie.find({ active: true }).sort({ nom: 1 });
    res.json({ success: true, categories: cats });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PRESTATAIRES ──────────────────────────────────────────────
router.get('/prestataires/carte', protect, presta.prestatairesCarte);
router.get('/prestataires',       protect, presta.searchPrestataires);
router.get('/prestataires/:id',   protect, presta.getPrestataire);

// ── MESSAGES ─────────────────────────────────────────────────
router.get ('/messages/:userId', protect, presta.getMessages);
router.post('/messages',         protect, presta.sendMessage);

// ── MISSIONS ─────────────────────────────────────────────────
router.post('/missions',                  protect, authorize('demandeur'), mission.creerMission);
router.get ('/missions/mes-missions',     protect, mission.mesMissions);
router.get ('/missions/:id',              protect, mission.getMission);
router.put ('/missions/:id/depot',        protect, mission.confirmerDepot);
router.put ('/missions/:id/statut',       protect, mission.updateStatut);
router.post('/missions/:id/noter',        protect, mission.noterMission);

// ── ADMIN ────────────────────────────────────────────────────
const A = [protect, authorize('admin')];
router.get ('/admin/dashboard',       ...A, admin.getDashboard);
router.get ('/admin/users',           ...A, admin.getUsers);
router.put ('/admin/users/:id',       ...A, admin.updateUser);
router.get ('/admin/missions',        ...A, admin.getMissions);
router.get ('/admin/transactions',    ...A, admin.getTransactions);
router.get ('/admin/categories',      ...A, admin.getCategories);
router.post('/admin/categories',      ...A, admin.createCategorie);
router.put ('/admin/categories/:id',  ...A, admin.updateCategorie);
router.delete('/admin/categories/:id',...A, admin.deleteCategorie);
router.get ('/admin/config',          ...A, admin.getConfig);
router.put ('/admin/config',          ...A, admin.updateConfig);
router.get ('/admin/notifications',   ...A, admin.getAdminNotifications);

module.exports = router;
