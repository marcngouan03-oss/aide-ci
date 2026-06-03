require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const { Categorie, Config } = require('./src/models/index');

const CATEGORIES = [
  { nom: 'Plombier',       icone: 'PL', couleur: '#3B82F6' },
  { nom: 'Electricien',    icone: 'EL', couleur: '#F59E0B' },
  { nom: 'Macon',          icone: 'MA', couleur: '#8B5CF6' },
  { nom: 'Coiffeur',       icone: 'CO', couleur: '#EC4899' },
  { nom: 'Chauffeur',      icone: 'CH', couleur: '#14B8A6' },
  { nom: 'Infirmier',      icone: 'IN', couleur: '#EF4444' },
  { nom: 'Peintre',        icone: 'PT', couleur: '#F97316' },
  { nom: 'Jardinier',      icone: 'JA', couleur: '#22C55E' },
  { nom: 'Mecanicien',     icone: 'MC', couleur: '#64748B' },
  { nom: 'Menuisier',      icone: 'MN', couleur: '#92400E' },
  { nom: 'Cuisinier',      icone: 'CU', couleur: '#D97706' },
  { nom: 'Couturier',      icone: 'CT', couleur: '#A855F7' },
  { nom: 'Informaticien',  icone: 'IT', couleur: '#0EA5E9' },
  { nom: 'Photographe',    icone: 'PH', couleur: '#6366F1' },
  { nom: 'Demenagement',   icone: 'DM', couleur: '#D97706' },
  { nom: 'Nettoyage',      icone: 'NT', couleur: '#10B981' },
  { nom: 'Garde enfant',   icone: 'GE', couleur: '#F43F5E' },
  { nom: 'Esthetique',     icone: 'ES', couleur: '#BE185D' },
  { nom: 'Enseignant',     icone: 'EN', couleur: '#4F46E5' },
  { nom: 'Serrurier',      icone: 'SR', couleur: '#B45309' },
  { nom: 'Climatisation',  icone: 'CL', couleur: '#06B6D4' },
  { nom: 'Securite',       icone: 'SC', couleur: '#374151' },
  { nom: 'Livreur',        icone: 'LV', couleur: '#F97316' },
  { nom: 'Comptable',      icone: 'CP', couleur: '#7C3AED' },
  { nom: 'Avocat',         icone: 'AV', couleur: '#1E40AF' },
  { nom: 'Medecin',        icone: 'MD', couleur: '#DC2626' },
  { nom: 'Carreleur',      icone: 'CR', couleur: '#9CA3AF' },
  { nom: 'Vitrier',        icone: 'VT', couleur: '#06B6D4' },
  { nom: 'Tapissier',      icone: 'TP', couleur: '#A16207' },
  { nom: 'Autre',          icone: 'AU', couleur: '#6B7280' },
];

const CONFIG = [
  { cle: 'app_nom',            valeur: 'Aide CI' },
  { cle: 'app_slogan',         valeur: "L'entraide securisee en Cote d'Ivoire" },
  { cle: 'couleur_primaire',   valeur: '#E8590A' },
  { cle: 'couleur_secondaire', valeur: '#1A6B3A' },
  { cle: 'orange_money_actif', valeur: true },
  { cle: 'moov_money_actif',   valeur: true },
  { cle: 'wave_actif',         valeur: true },
  { cle: 'frais_plateforme',   valeur: 0 },
  { cle: 'logo_url',           valeur: '' },
];

async function seed() {
  const URI = process.env.MONGODB_URI;
  if (!URI) { console.error('MONGODB_URI manquant'); process.exit(1); }

  await mongoose.connect(URI, { serverSelectionTimeoutMS: 15000 });
  console.log('MongoDB connecte');

  // Categories
  await Categorie.deleteMany({});
  await Categorie.insertMany(CATEGORIES);
  console.log(CATEGORIES.length + ' categories creees');

  // Config
  for (const c of CONFIG)
    await Config.findOneAndUpdate({ cle: c.cle }, c, { upsert: true });
  console.log('Config initialisee');

  // Activer tous les prestataires existants
  const r = await User.updateMany({ role: 'prestataire' }, { valide: true, statut: 'actif' });
  if (r.modifiedCount) console.log(r.modifiedCount + ' prestataires actives');

  // Admin
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = new User({
      prenom: 'Admin', nom: 'Aide CI',
      email: 'marcngouan03@gmail.com',
      password: 'ADMIN123',
      role: 'admin', statut: 'actif', valide: true,
    });
    await admin.save();
    console.log('Admin cree: marcngouan03@gmail.com / ADMIN123');
  } else {
    admin.email    = 'marcngouan03@gmail.com';
    admin.password = 'ADMIN123';
    await admin.save();
    console.log('Admin mis a jour: marcngouan03@gmail.com / ADMIN123');
  }

  await mongoose.disconnect();
  console.log('Seed termine.');
}

seed().catch(err => { console.error('SEED ERROR:', err.message); process.exit(1); });
