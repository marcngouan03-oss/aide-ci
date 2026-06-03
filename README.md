# Aide CI — Guide complet de deploiement

---

## IMPORTANT — Securite
Votre URI MongoDB contient votre mot de passe. Ne la partagez plus jamais dans un chat.
Changez votre mot de passe Atlas sur : https://cloud.mongodb.com -> Database Access

---

## Identifiants admin
Email    : marcngouan03@gmail.com
Mot de passe : ADMIN123

---

## Etape 1 — Corriger MongoDB Atlas (OBLIGATOIRE)

Le probleme de connexion vient du Network Access Atlas.

1. Allez sur https://cloud.mongodb.com
2. Votre projet -> Security -> Network Access
3. Cliquez "Add IP Address"
4. Selectionnez "Allow Access from Anywhere" (0.0.0.0/0)
5. Confirmez

Sans ca, Railway et Netlify ne pourront jamais se connecter.

L'URI a utiliser dans Railway est :
```
MONGODB_URI=mongodb+srv://marcngouan03_db_user:0799633983@cluster0.xieq8m7.mongodb.net/aide-ci?retryWrites=true&w=majority&appName=Cluster0
```

---

## Etape 2 — GitHub (compte marcngouan03-oss)

```bash
cd aide-ci-final
git init
git add .
git commit -m "Aide CI v1 - ready for deployment"
git remote add origin https://github.com/marcngouan03/aide-ci.git
git push -u origin main
```

---

## Etape 3 — Railway (Backend)
Compte : marcngouan03@gmail.com

1. https://railway.app -> New Project -> Deploy from GitHub
2. Selectionner le repo -> Root Directory : backend
3. Variables d'environnement a ajouter :

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://marcngouan03_db_user:0799633983@cluster0.xieq8m7.mongodb.net/aide-ci?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=aide_ci_jwt_prod_secret_longue_chaine_aleatoire_64_chars_minimum
JWT_EXPIRE=30d
CLIENT_URL=https://VOTRE-SITE.netlify.app
```

4. Railway deploy automatiquement
5. Recuperer l'URL backend : https://aide-ci-backend-xxxx.up.railway.app
6. Tester : https://aide-ci-backend-xxxx.up.railway.app/health
   Reponse attendue : {"ok":true,"db":"connected"}
7. Lancer le seed (une seule fois) dans le terminal Railway :
   npm run seed

---

## Etape 4 — Netlify (Frontend)
Compte : marcngouan03@gmail.com

1. https://netlify.com -> Add new site -> Import from Git
2. Connecter GitHub -> selectionner aide-ci
3. Parametres de build :
   - Base directory  : frontend
   - Build command   : npm install && npm run build
   - Publish directory : frontend/dist
4. Variables d'environnement :
   VITE_API_URL    = https://aide-ci-backend-xxxx.up.railway.app/api
   VITE_SOCKET_URL = https://aide-ci-backend-xxxx.up.railway.app
5. Deploy site
6. Recuperer l'URL : https://aide-ci-xxxx.netlify.app

---

## Etape 5 — Mettre a jour le CORS
Dans Railway backend, modifier la variable :
CLIENT_URL = https://aide-ci-xxxx.netlify.app
Puis redeploy le backend.

---

## Demarrage local

```bash
# Backend
cd backend
# Creer le fichier .env avec le contenu ci-dessous
npm install
npm run seed   # une seule fois
npm run dev    # port 5000

# Frontend (autre terminal)
cd frontend
npm install
npm run dev    # port 5173
```

Contenu de backend/.env pour le developpement local :
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://marcngouan03_db_user:0799633983@cluster0.xieq8m7.mongodb.net/aide-ci?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=aide_ci_dev_secret_2024_longue_chaine_min_32_chars
JWT_EXPIRE=30d
CLIENT_URL=
```

---

## API Paiement Mobile Money (Orange Money, Moov, Wave)

### Situation actuelle
L'application gere l'escrow de facon manuelle :
- Le demandeur declare avoir effectue le depot
- L'admin confirme et libere vers le prestataire

C'est la seule approche possible en Cote d'Ivoire sans partenariat officiel.

### Pour integrer les vraies API (futur)

#### Orange Money CI
- Programme : Orange Money API Partner
- Contact   : https://developer.orange.com/apis/orange-money-webpay-ci/overview
- Process   : Demande de partenariat -> validation -> credentials API
- Endpoint  : POST /orange/v1/webpayment
- Note      : Necessite un compte marchand Orange CI enregistre

#### Moov Money CI
- Programme : Moov Africa API
- Contact   : https://moovafricaci.com / partenariat commercial direct
- Process   : Contacter le service entreprise Moov CI
- Note      : API disponible apres convention signee

#### Wave CI
- Programme : Wave Business
- Contact   : https://wave.com/business
- Process   : Inscription compte business -> acces API
- Endpoint  : Documentation sur https://docs.wave.com

### Integration dans le code (quand vous avez les credentials)

Dans backend/src/controllers/missionController.js, la fonction confirmerDepot
peut appeler l'API de paiement avant de confirmer le depot :

```javascript
// Exemple Orange Money (pseudo-code)
const orangeMoneyAPI = async (amount, phoneNumber) => {
  const response = await fetch('https://api.orange.com/orange-money-webpay/v1/webpayment', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ORANGE_MONEY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchant_key: process.env.ORANGE_MERCHANT_KEY,
      currency: 'OUV',
      order_id: missionId,
      amount: amount,
      return_url: `${process.env.CLIENT_URL}/payment-success`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
      notif_url: `${process.env.API_URL}/api/payment-webhook`,
    }),
  });
  return response.json();
};
```

Ajouter dans .env :
```
ORANGE_MONEY_TOKEN=votre_token
ORANGE_MERCHANT_KEY=votre_cle
MOOV_API_KEY=votre_cle
WAVE_API_KEY=votre_cle
```

---

## Fonctionnalites livrees

### Inscription / Connexion
- Gmail + mot de passe uniquement
- Token persistant 30 jours (reste connecte apres fermeture)
- Splash screen avec animation au demarrage
- Notifications de bienvenue a l'inscription

### Carte (style Snapchat)
- Avatar de chaque prestataire sur la carte
- Anneau vert = libre, orange = occupe
- Point vert = en ligne, gris = hors ligne
- Derniere connexion affichee ("Il y a 5 min")
- Distances reelles calculees (km et minutes)
- Ligne tracee entre l'utilisateur et le prestataire selectionne
- Position mise a jour en temps reel via Socket.IO

### Chat
- Messages en temps reel
- Bouton "Deposer" visible uniquement pour le demandeur
- L'argent va chez l'admin (escrow), pas directement au prestataire

### Paiement Escrow
- Demandeur depose -> admin recoit
- Prestataire travaille
- Demandeur valide -> admin libere
- Notification sonore + vibration pour l'admin

### Notifications (temps reel)
- Son different selon le type (paiement, message, systeme)
- Vibration mobile
- Badge rouge sur la cloche
- Admin notifie : inscription, depot, fin de mission

### Admin
- Dashboard avec statistiques
- Gestion utilisateurs (valider, suspendre, bannir)
- Liberation des paiements
- Gestion categories
- Configuration branding

---

## Architecture

```
aide-ci-final/
├── backend/          → Railway
│   ├── server.js     connexion DB d'abord, routes ensuite, retry x8
│   ├── seed.js       categories + admin
│   ├── railway.toml
│   └── src/
│       ├── models/   User, Mission, Categorie, Message, Transaction, Config, Notification
│       ├── controllers/ auth, mission, admin, prestataire
│       ├── routes/
│       ├── middleware/
│       └── socket/   position live, statut en ligne, notifications
│
└── frontend/         → Netlify
    ├── public/_redirects  SPA routing Netlify
    ├── vite.config.js
    └── src/
        ├── components/
        │   ├── SplashScreen.jsx  animation de demarrage
        │   └── ui/               Btn, Input, Card, Avatar, Stars, NotifBell...
        ├── context/  AuthContext, SocketContext (sons + vibrations)
        ├── utils/    api.js
        └── pages/
            ├── auth/        Login, Register (Gmail uniquement)
            ├── demandeur/   Home, Map, Chat, Payment, Tracking, Missions
            ├── prestataire/ Dashboard, Profile
            └── admin/       Dashboard complet
```
