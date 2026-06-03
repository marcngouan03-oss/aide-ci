const mongoose = require('mongoose');

// ── CATEGORIE ─────────────────────────────────────────────────
const categorieSchema = new mongoose.Schema({
  nom:         { type: String, required: true, trim: true },
  icone:       { type: String, default: '' },
  couleur:     { type: String, default: '#E8590A' },
  active:      { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

// ── MESSAGE ───────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  conversation:  { type: String, required: true, index: true },
  expediteur:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destinataire:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contenu:       { type: String, required: true },
  type:          { type: String, enum: ['texte','systeme','offre'], default: 'texte' },
  lu:            { type: Boolean, default: false },
  createdAt:     { type: Date, default: Date.now },
});

// ── MISSION ───────────────────────────────────────────────────
const missionSchema = new mongoose.Schema({
  demandeur:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prestataire:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categorie:    { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie' },
  description:  { type: String, required: true },
  montant:      { type: Number, required: true, min: 0 },
  montantTotal: { type: Number, required: true },
  moyenPaiement:{ type: String, enum: ['orange_money','moov_money','wave'], required: true },
  adresseTravail: { type: String, default: '' },
  locationTravail: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  statut: {
    type: String,
    enum: [
      'en_attente_depot',      // accord chat, dépôt pas encore fait
      'depot_recu',            // admin a reçu le paiement
      'prestataire_en_route',  // prestataire se déplace
      'prestataire_arrive',    // prestataire sur place
      'en_cours',              // travail en cours
      'termine',               // demandeur a validé
      'paye',                  // admin a libéré le paiement
      'litige',
      'annule',
    ],
    default: 'en_attente_depot',
  },
  notePrestataire: { type: Number, min: 1, max: 5 },
  avisDemandeur:   { type: String },
  dateDepot:       { type: Date },
  dateDebut:       { type: Date },
  dateFin:         { type: Date },
  datePaiement:    { type: Date },
  noteAdmin:       { type: String },
  createdAt:       { type: Date, default: Date.now },
});
missionSchema.index({ locationTravail: '2dsphere' });

// ── TRANSACTION ───────────────────────────────────────────────
const transactionSchema = new mongoose.Schema({
  mission:     { type: mongoose.Schema.Types.ObjectId, ref: 'Mission', required: true },
  demandeur:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prestataire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  montant:     { type: Number, required: true },
  type:        { type: String, enum: ['depot','liberation','remboursement'], required: true },
  moyen:       { type: String, enum: ['orange_money','moov_money','wave'] },
  statut:      { type: String, enum: ['en_attente','confirme','echoue'], default: 'en_attente' },
  reference:   { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
});

// ── CONFIG ────────────────────────────────────────────────────
const configSchema = new mongoose.Schema({
  cle:       { type: String, required: true, unique: true },
  valeur:    { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now },
});

// ── NOTIFICATION ──────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  destinataire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  titre:        { type: String, required: true },
  corps:        { type: String, required: true },
  type:         { type: String, enum: ['paiement','message','mission','compte','systeme'], default: 'systeme' },
  lu:           { type: Boolean, default: false },
  data:         { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt:    { type: Date, default: Date.now },
});

module.exports = {
  Categorie:    mongoose.model('Categorie',    categorieSchema),
  Message:      mongoose.model('Message',      messageSchema),
  Mission:      mongoose.model('Mission',      missionSchema),
  Transaction:  mongoose.model('Transaction',  transactionSchema),
  Config:       mongoose.model('Config',       configSchema),
  Notification: mongoose.model('Notification', notificationSchema),
};
