const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  prenom:          { type: String, required: true, trim: true },
  nom:             { type: String, required: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:        { type: String, required: true, minlength: 6 },
  role:            { type: String, enum: ['demandeur','prestataire','admin'], required: true },
  ville:           { type: String, default: '' },
  profession:      { type: String, default: '' },
  categorieId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', default: null },
  statut:          { type: String, enum: ['actif','suspendu','banni'], default: 'actif' },
  valide:          { type: Boolean, default: true },
  disponibilite:   { type: String, enum: ['libre','occupe'], default: 'libre' },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  notemoyenne:     { type: Number, default: 0, min: 0, max: 5 },
  nombreMissions:  { type: Number, default: 0 },
  nombreAvis:      { type: Number, default: 0 },
  enLigne:         { type: Boolean, default: false },
  derniereConnexion: { type: Date, default: null },
  pushToken:       { type: String, default: null }, // pour notifications futures
  createdAt:       { type: Date, default: Date.now },
});

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, statut: 1, valide: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
