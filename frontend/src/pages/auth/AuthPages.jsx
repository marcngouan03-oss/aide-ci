import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Btn, Input, Spin } from '../../components/ui/index';

// ── INPUT FIELD HELPER ────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#767676] mb-2"
        style={{ fontFamily: 'Syne, sans-serif' }}>{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function TextInput({ ...p }) {
  return (
    <input {...p}
      className="w-full border-b border-[#E5E5E5] focus:border-[#111] py-3 text-sm bg-transparent outline-none transition-colors placeholder:text-[#ABABAB]"
    />
  );
}

// ── LOGIN ─────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim())      return setError('Email obligatoire');
    if (!email.includes('@')) return setError('Email invalide');
    if (!password)          return setError('Mot de passe obligatoire');
    setLoading(true);
    try {
      const u = await login({ email: email.trim().toLowerCase(), password });
      if      (u.role === 'admin')       navigate('/admin');
      else if (u.role === 'prestataire') navigate('/dashboard');
      else                               navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Connexion impossible. Verifiez vos identifiants.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 pt-12 pb-5 flex items-center justify-between border-b border-[#E5E5E5]">
        <span className="text-2xl font-extrabold tracking-tighter" style={{ fontFamily:'Syne,sans-serif' }}>
          AIDE<span style={{ color:'#E8590A' }}>CI</span>
        </span>
        <Link to="/register" className="text-[10px] font-bold uppercase tracking-widest text-[#767676] hover:text-[#111]"
          style={{ fontFamily:'Syne,sans-serif' }}>Inscription</Link>
      </div>

      {/* Hero */}
      <div className="bg-[#111] px-6 py-14">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#767676] mb-3"
          style={{ fontFamily:'Syne,sans-serif' }}>Cote d'Ivoire</p>
        <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tighter"
          style={{ fontFamily:'Syne,sans-serif' }}>
          L'entraide<br /><span style={{ color:'#E8590A' }}>securisee.</span>
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="flex-1 px-6 py-8 flex flex-col gap-6 max-w-sm mx-auto w-full">
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily:'Syne,sans-serif' }}>Connexion</h2>

        <Field label="Adresse Gmail *">
          <TextInput type="email" placeholder="vous@gmail.com" value={email}
            onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </Field>

        <Field label="Mot de passe *">
          <TextInput type="password" placeholder="Votre mot de passe" value={password}
            onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>

        {error && <div className="border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

        <Btn type="submit" size="lg" fullWidth loading={loading}>Se connecter</Btn>

        <p className="text-xs text-[#767676] mt-auto pt-6 border-t border-[#E5E5E5]">
          Pas de compte ?{' '}
          <Link to="/register" className="font-bold text-[#111] hover:text-[#E8590A]">Creer un compte</Link>
        </p>
      </form>
    </div>
  );
}

// ── REGISTER ──────────────────────────────────────────────────
export function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [step, setStep]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState('');

  const [f, setF] = useState({
    prenom:'', nom:'', email:'', password:'', confirmPwd:'',
    role:'', profession:'', ville:'',
  });
  const [errs, setErrs] = useState({});

  const set = (k, v) => { setF(p=>({...p,[k]:v})); setErrs(p=>({...p,[k]:''})); };

  const validate1 = () => {
    const e = {};
    if (!f.prenom.trim())  e.prenom = 'Obligatoire';
    if (!f.nom.trim())     e.nom    = 'Obligatoire';
    if (!f.email.trim())   e.email  = 'Obligatoire';
    else if (!f.email.includes('@')) e.email = 'Email invalide';
    if (!f.password)       e.password = 'Obligatoire';
    else if (f.password.length < 6) e.password = 'Minimum 6 caracteres';
    if (f.password !== f.confirmPwd) e.confirmPwd = 'Les mots de passe ne correspondent pas';
    return e;
  };

  const validate2 = () => {
    const e = {};
    if (!f.role) e.role = 'Choisissez votre role';
    if (f.role === 'prestataire' && !f.profession.trim()) e.profession = 'Obligatoire';
    return e;
  };

  const nextStep = () => {
    const e = validate1();
    if (Object.keys(e).length) { setErrs(e); return; }
    setStep(2);
  };

  const submit = async () => {
    const e = validate2();
    if (Object.keys(e).length) { setErrs(e); return; }
    setGlobalErr(''); setLoading(true);
    try {
      const payload = {
        prenom: f.prenom.trim(), nom: f.nom.trim(),
        email:  f.email.trim().toLowerCase(),
        password: f.password,
        role: f.role,
        ville: f.ville.trim(),
      };
      if (f.role === 'prestataire') payload.profession = f.profession.trim();
      const u = await register(payload);
      if (u.role === 'prestataire') navigate('/dashboard');
      else navigate('/home');
    } catch (err) {
      setGlobalErr(err.response?.data?.message || 'Erreur lors de la creation du compte');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 pt-12 pb-5 flex items-center justify-between border-b border-[#E5E5E5]">
        <span className="text-2xl font-extrabold tracking-tighter" style={{ fontFamily:'Syne,sans-serif' }}>
          AIDE<span style={{ color:'#E8590A' }}>CI</span>
        </span>
        <button onClick={() => step===1 ? navigate('/login') : setStep(1)}
          className="text-[10px] font-bold uppercase tracking-widest text-[#767676] hover:text-[#111]"
          style={{ fontFamily:'Syne,sans-serif' }}>{step===1 ? 'Connexion' : 'Retour'}</button>
      </div>

      {/* Progress */}
      <div className="flex h-1">
        <div className={`flex-1 transition-all ${step>=1 ? 'bg-[#111]' : 'bg-[#E5E5E5]'}`}/>
        <div className={`flex-1 transition-all ${step>=2 ? 'bg-[#E8590A]' : 'bg-[#E5E5E5]'}`}/>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col gap-5 max-w-sm mx-auto w-full">
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily:'Syne,sans-serif' }}>
          {step===1 ? 'Vos informations' : 'Votre role'}
        </h2>

        {step===1 && <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prenom *" error={errs.prenom}>
              <TextInput placeholder="Kofi" value={f.prenom} onChange={e=>set('prenom',e.target.value)} />
            </Field>
            <Field label="Nom *" error={errs.nom}>
              <TextInput placeholder="Asante" value={f.nom} onChange={e=>set('nom',e.target.value)} />
            </Field>
          </div>
          <Field label="Adresse Gmail *" error={errs.email}>
            <TextInput type="email" placeholder="vous@gmail.com" value={f.email}
              onChange={e=>set('email',e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Ville / Quartier">
            <TextInput placeholder="Abidjan, Cocody..." value={f.ville} onChange={e=>set('ville',e.target.value)} />
          </Field>
          <Field label="Mot de passe * (min. 6 caracteres)" error={errs.password}>
            <TextInput type="password" placeholder="Choisir un mot de passe" value={f.password}
              onChange={e=>set('password',e.target.value)} />
          </Field>
          <Field label="Confirmer le mot de passe *" error={errs.confirmPwd}>
            <TextInput type="password" placeholder="Retaper le mot de passe" value={f.confirmPwd}
              onChange={e=>set('confirmPwd',e.target.value)} />
          </Field>
          <Btn size="lg" fullWidth onClick={nextStep}>Continuer</Btn>
          <p className="text-xs text-[#767676] pt-4 border-t border-[#E5E5E5]">
            Deja un compte ? <Link to="/login" className="font-bold text-[#111] hover:text-[#E8590A]">Se connecter</Link>
          </p>
        </>}

        {step===2 && <>
          <p className="text-xs text-[#767676]">Comment voulez-vous utiliser Aide CI ?</p>
          <div className="flex flex-col gap-3">
            {[
              { role:'demandeur',   title:"Chercher de l'aide",     desc:'Je cherche un prestataire pour effectuer un travail' },
              { role:'prestataire', title:'Proposer mes services',   desc:'Je propose mon metier et veux recevoir des missions securisees' },
            ].map(r => (
              <button key={r.role} type="button" onClick={() => set('role', r.role)}
                className={`p-5 text-left border-2 transition-all ${f.role===r.role ? 'border-[#111] bg-[#F7F7F5]' : 'border-[#E5E5E5] hover:border-[#ABABAB]'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm uppercase tracking-wide" style={{ fontFamily:'Syne,sans-serif' }}>{r.title}</span>
                  {f.role===r.role && <div className="w-4 h-4 bg-[#111] flex items-center justify-center"><div className="w-2 h-2 bg-white"/></div>}
                </div>
                <p className="text-xs text-[#767676] leading-relaxed">{r.desc}</p>
              </button>
            ))}
          </div>
          {errs.role && <p className="text-xs text-red-500">{errs.role}</p>}

          {f.role==='prestataire' && (
            <Field label="Votre profession *" error={errs.profession}>
              <TextInput placeholder="Ex: Plombier, Electricien, Coiffeur..." value={f.profession}
                onChange={e=>set('profession',e.target.value)} />
            </Field>
          )}

          {globalErr && <div className="border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-600">{globalErr}</div>}

          <Btn size="lg" fullWidth variant="orange" loading={loading} onClick={submit}
            disabled={!f.role || (f.role==='prestataire' && !f.profession)}>
            Creer mon compte
          </Btn>
        </>}
      </div>
    </div>
  );
}
