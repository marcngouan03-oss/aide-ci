import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { adminAPI, missionAPI } from '../../utils/api';
import { Spin, Btn, NotifBell } from '../../components/ui/index';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { notifications, unread, clearUnread } = useSocket();
  const navigate = useNavigate();
  const [stats,        setStats]        = useState(null);
  const [missions,     setMissions]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('dashboard');
  const [showNotifs,   setShowNotifs]   = useState(false);

  useEffect(() => {
    Promise.all([
      adminAPI.dashboard(),
      adminAPI.getMissions({ limit: 10 }),
      adminAPI.getTransactions({ limit: 10 }),
    ]).then(([d, m, t]) => {
      setStats(d.data.stats);
      setMissions(m.data.missions || []);
      setTransactions(t.data.transactions || []);
    }).finally(() => setLoading(false));
  }, []);

  const TABS = [
    { key:'dashboard',  label:'Vue generale' },
    { key:'users',      label:'Utilisateurs' },
    { key:'missions',   label:'Missions' },
    { key:'categories', label:'Categories' },
    { key:'config',     label:'Configuration' },
  ];

  const lbl = s => ({
    en_attente_depot:'En attente', depot_recu:'Depot recu',
    prestataire_en_route:'En route', en_cours:'En cours',
    termine:'Termine', paye:'Paye', annule:'Annule', litige:'Litige'
  }[s]||s);

  if (loading) return (
    <div className="h-dvh flex items-center justify-center bg-[#111]">
      <Spin size={32} color="white"/>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col bg-[#111] text-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-5 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <div className="text-2xl font-extrabold tracking-tighter"
            style={{ fontFamily:'Syne,sans-serif' }}>
            AIDE<span style={{ color:'#E8590A' }}>CI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowNotifs(true); clearUnread(); }}
              className="relative w-10 h-10 flex items-center justify-center border border-white/20 hover:border-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E8590A] text-white text-[9px] font-bold flex items-center justify-center"
                  style={{ fontFamily:'Syne,sans-serif' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#E8590A] border border-[#E8590A]/30 px-2 py-1"
              style={{ fontFamily:'Syne,sans-serif' }}>Admin</span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
              style={{ fontFamily:'Syne,sans-serif' }}>Quitter</button>
          </div>
        </div>
        <p className="text-xs text-white/30">{user?.email}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-px bg-white/10 border-b border-white/10">
          {[
            { val: stats.totalUsers.toLocaleString(),        lbl:'Utilisateurs',    trend:`+${stats.newUsers7d} cette semaine` },
            { val: stats.totalPrestataires.toLocaleString(), lbl:'Prestataires',    trend:'actifs et valides' },
            { val: `${(stats.escrowTotal/1000).toFixed(0)}k FCFA`, lbl:'En escrow', trend:`${stats.missionsActives} actives` },
            { val: stats.missionsMois.toLocaleString(),      lbl:'Missions/mois',   trend:'ce mois' },
          ].map(s => (
            <div key={s.lbl} className="bg-[#111] px-5 py-5">
              <div className="text-2xl font-extrabold text-white tracking-tighter mb-1"
                style={{ fontFamily:'Syne,sans-serif' }}>{s.val}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-0.5"
                style={{ fontFamily:'Syne,sans-serif' }}>{s.lbl}</div>
              <div className="text-[10px] text-[#E8590A]">{s.trend}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-white/10" style={{ scrollbarWidth:'none' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap flex-shrink-0 transition-all
              ${tab===t.key ? 'text-white border-b-2 border-[#E8590A] -mb-px' : 'text-white/35 hover:text-white/60'}`}
            style={{ fontFamily:'Syne,sans-serif' }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab==='dashboard' && (
          <div className="px-5 py-5 flex flex-col gap-5">
            <Sec label="Missions recentes">
              {missions.map(m => (
                <Row key={m._id}
                  left={<>
                    <p className="text-sm font-bold text-white">{m.demandeur?.prenom} → {m.prestataire?.prenom}</p>
                    <p className="text-xs text-white/40 mt-0.5 truncate">{m.description}</p>
                  </>}
                  right={<>
                    <p className="text-sm font-bold text-[#E8590A]" style={{ fontFamily:'Syne,sans-serif' }}>
                      {m.montant?.toLocaleString()} F
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">{lbl(m.statut)}</p>
                  </>}
                />
              ))}
            </Sec>
            <Sec label="Transactions recentes">
              {transactions.map(t => (
                <Row key={t._id}
                  left={<>
                    <p className="text-sm font-bold text-white">{t.demandeur?.prenom} → {t.prestataire?.prenom}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {t.type==='liberation'?'Liberation':'Depot'} — {new Date(t.createdAt).toLocaleDateString('fr')}
                    </p>
                  </>}
                  right={<p className={`text-sm font-bold ${t.type==='liberation'?'text-green-400':'text-[#E8590A]'}`}
                    style={{ fontFamily:'Syne,sans-serif' }}>{t.montant?.toLocaleString()} F</p>}
                />
              ))}
            </Sec>
          </div>
        )}
        {tab==='users'      && <UsersTab/>}
        {tab==='missions'   && <MissionsTab/>}
        {tab==='categories' && <CategoriesTab/>}
        {tab==='config'     && <ConfigTab/>}
      </div>

      {/* Notifications panel */}
      {showNotifs && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNotifs(false)}/>
          <div className="relative bg-[#1A1A1A] w-full max-h-[80vh] overflow-y-auto border-t border-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#1A1A1A]">
              <h3 className="text-[11px] font-bold uppercase tracking-widest"
                style={{ fontFamily:'Syne,sans-serif' }}>Notifications</h3>
              <button onClick={() => setShowNotifs(false)} className="text-white/50 text-xl">×</button>
            </div>
            {notifications.length===0 ? (
              <div className="px-5 py-12 text-center text-sm text-white/30">Aucune notification</div>
            ) : notifications.map(n => (
              <div key={n._id} className={`px-5 py-4 border-b border-white/06 ${!n.lu?'bg-[#E8590A]/10':''}`}>
                <p className="font-bold text-sm text-white" style={{ fontFamily:'Syne,sans-serif' }}>{n.titre}</p>
                <p className="text-xs text-white/50 mt-1">{n.corps}</p>
                <p className="text-[10px] text-white/25 mt-1">{new Date(n.createdAt).toLocaleString('fr')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SECTION HELPERS ───────────────────────────────────────────
function Sec({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3"
        style={{ fontFamily:'Syne,sans-serif' }}>{label}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
function Row({ left, right }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/06">
      <div className="flex-1 min-w-0">{left}</div>
      <div className="flex-shrink-0 text-right">{right}</div>
    </div>
  );
}

// ── USERS TAB ─────────────────────────────────────────────────
function UsersTab() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('prestataire');

  useEffect(() => {
    setLoading(true);
    adminAPI.getUsers({ role:filter })
      .then(r => setUsers(r.data.users || []))
      .finally(() => setLoading(false));
  }, [filter]);

  const update = async (id, data) => {
    await adminAPI.updateUser(id, data);
    setUsers(prev => prev.map(u => u._id===id ? { ...u, ...data } : u));
  };

  return (
    <div className="px-5 py-5 flex flex-col gap-4">
      <div className="flex gap-2">
        {['prestataire','demandeur'].map(r => (
          <button key={r} onClick={() => setFilter(r)}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all
              ${filter===r ? 'bg-white text-[#111]' : 'border border-white/20 text-white/50 hover:text-white'}`}
            style={{ fontFamily:'Syne,sans-serif' }}>{r}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-10"><Spin color="white"/></div> :
        users.length===0 ? <p className="text-white/30 text-sm text-center py-8">Aucun utilisateur</p> :
        users.map(u => (
          <div key={u._id} className="border border-white/10 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-sm text-white">{u.prenom} {u.nom}</p>
                <p className="text-xs text-white/40 mt-0.5">{u.email}</p>
                <p className="text-xs text-white/40">{u.profession||u.role} — {u.ville}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 border
                ${u.statut==='actif' ? 'text-green-400 border-green-400/30' : 'text-yellow-400 border-yellow-400/30'}`}
                style={{ fontFamily:'Syne,sans-serif' }}>{u.statut}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {u.role==='prestataire' && !u.valide && (
                <button onClick={() => update(u._id, { valide:true, statut:'actif' })}
                  className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold uppercase tracking-wide hover:bg-green-700"
                  style={{ fontFamily:'Syne,sans-serif' }}>Valider</button>
              )}
              {u.statut==='actif' && (
                <button onClick={() => update(u._id, { statut:'suspendu' })}
                  className="px-3 py-1.5 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-wide hover:bg-red-500/10"
                  style={{ fontFamily:'Syne,sans-serif' }}>Suspendre</button>
              )}
              {u.statut==='suspendu' && (
                <button onClick={() => update(u._id, { statut:'actif' })}
                  className="px-3 py-1.5 border border-green-500/40 text-green-400 text-[10px] font-bold uppercase tracking-wide hover:bg-green-500/10"
                  style={{ fontFamily:'Syne,sans-serif' }}>Reactiver</button>
              )}
              {u.statut!=='banni' && (
                <button onClick={() => update(u._id, { statut:'banni' })}
                  className="px-3 py-1.5 bg-red-700 text-white text-[10px] font-bold uppercase tracking-wide hover:bg-red-800"
                  style={{ fontFamily:'Syne,sans-serif' }}>Bannir</button>
              )}
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── MISSIONS TAB ──────────────────────────────────────────────
function MissionsTab() {
  const [missions, setMissions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    adminAPI.getMissions().then(r => setMissions(r.data.missions||[])).finally(() => setLoading(false));
  }, []);

  const liberer = async (id) => {
    try {
      await missionAPI.updateStatut(id, 'paye');
      setMissions(prev => prev.map(m => m._id===id ? { ...m, statut:'paye' } : m));
    } catch(e) { alert(e.response?.data?.message||'Erreur'); }
  };

  const lbl = s => ({
    en_attente_depot:'En attente', depot_recu:'Depot recu',
    prestataire_en_route:'En route', en_cours:'En cours',
    termine:'Termine', paye:'Paye', annule:'Annule'
  }[s]||s);

  return (
    <div className="px-5 py-5 flex flex-col gap-3">
      {loading ? <div className="flex justify-center py-10"><Spin color="white"/></div> :
        missions.length===0 ? <p className="text-white/30 text-sm text-center py-8">Aucune mission</p> :
        missions.map(m => (
          <div key={m._id} className="border border-white/10 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 mr-4 min-w-0">
                <p className="font-bold text-sm text-white">{m.demandeur?.prenom} → {m.prestataire?.prenom}</p>
                <p className="text-xs text-white/40 truncate mt-0.5">{m.description}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{new Date(m.createdAt).toLocaleDateString('fr')}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-sm text-[#E8590A]" style={{ fontFamily:'Syne,sans-serif' }}>
                  {m.montant?.toLocaleString()} F
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">{lbl(m.statut)}</p>
              </div>
            </div>
            {m.statut==='termine' && (
              <button onClick={() => liberer(m._id)}
                className="mt-2 w-full py-3 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-green-700"
                style={{ fontFamily:'Syne,sans-serif' }}>
                Liberer {m.montant?.toLocaleString()} FCFA vers {m.prestataire?.prenom}
              </button>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ── CATEGORIES TAB ────────────────────────────────────────────
function CategoriesTab() {
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ nom:'', icone:'', couleur:'#E8590A' });

  useEffect(() => {
    adminAPI.getCategories().then(r => setCats(r.data.categories||[])).finally(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!form.nom.trim()) return;
    const r = await adminAPI.createCategorie(form);
    setCats(prev => [...prev, r.data.categorie]);
    setForm({ nom:'', icone:'', couleur:'#E8590A' });
  };

  const del = async (id) => {
    if (!confirm('Supprimer cette categorie ?')) return;
    await adminAPI.deleteCategorie(id);
    setCats(prev => prev.filter(c => c._id!==id));
  };

  return (
    <div className="px-5 py-5 flex flex-col gap-4">
      {/* Add form */}
      <div className="border border-[#E8590A]/30 p-4 flex flex-col gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8590A]"
          style={{ fontFamily:'Syne,sans-serif' }}>Ajouter</p>
        <div className="flex gap-3 items-end">
          <input value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))}
            placeholder="Nom de la categorie"
            className="flex-1 bg-transparent border-b border-white/20 pb-2 text-sm text-white outline-none focus:border-white placeholder:text-white/30"/>
          <input value={form.icone} onChange={e=>setForm(p=>({...p,icone:e.target.value}))}
            placeholder="Code"
            className="w-16 bg-transparent border-b border-white/20 pb-2 text-sm text-white outline-none focus:border-white placeholder:text-white/30"/>
          <input type="color" value={form.couleur} onChange={e=>setForm(p=>({...p,couleur:e.target.value}))}
            className="w-8 h-8 bg-transparent border-none cursor-pointer"/>
        </div>
        <button onClick={create}
          className="self-start px-4 py-2 bg-[#E8590A] text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
          style={{ fontFamily:'Syne,sans-serif' }}>Ajouter</button>
      </div>

      {loading ? <div className="flex justify-center py-8"><Spin color="white"/></div> : (
        <div className="grid grid-cols-2 gap-2">
          {cats.map(c => (
            <div key={c._id} className="border border-white/10 p-3 flex items-center gap-3">
              <div className="w-3 h-3 flex-shrink-0" style={{ background:c.couleur||'#E8590A' }}/>
              <span className="text-sm font-medium text-white flex-1 truncate">{c.nom}</span>
              <button onClick={() => del(c._id)} className="text-white/20 hover:text-red-400 text-sm">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CONFIG TAB ────────────────────────────────────────────────
function ConfigTab() {
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    adminAPI.getConfig().then(r => setConfig(r.data.config||{}));
  }, []);

  const save = async () => {
    setSaving(true);
    await adminAPI.updateConfig(config);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const fields = [
    { key:'app_nom',           label:"Nom de l'application",     type:'text' },
    { key:'app_slogan',        label:'Slogan',                    type:'text' },
    { key:'couleur_primaire',  label:'Couleur principale',        type:'color' },
    { key:'couleur_secondaire',label:'Couleur secondaire',        type:'color' },
    { key:'frais_plateforme',  label:'Frais plateforme (FCFA)',   type:'number' },
    { key:'logo_url',          label:'URL du logo',               type:'text' },
  ];

  return (
    <div className="px-5 py-5 flex flex-col gap-5">
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2"
            style={{ fontFamily:'Syne,sans-serif' }}>{f.label}</label>
          {f.type==='color' ? (
            <div className="flex items-center gap-3">
              <input type="color" value={config[f.key]||'#000'}
                onChange={e => setConfig(p=>({...p,[f.key]:e.target.value}))}
                className="w-8 h-8 cursor-pointer border-none bg-transparent"/>
              <input type="text" value={config[f.key]||''}
                onChange={e => setConfig(p=>({...p,[f.key]:e.target.value}))}
                className="flex-1 bg-transparent border-b border-white/20 pb-2 text-sm text-white outline-none focus:border-white"/>
            </div>
          ) : (
            <input type={f.type} value={config[f.key]??''}
              onChange={e => setConfig(p=>({...p,[f.key]:e.target.value}))}
              className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white outline-none focus:border-white"/>
          )}
        </div>
      ))}

      {/* Payment toggles */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3"
          style={{ fontFamily:'Syne,sans-serif' }}>Moyens de paiement</p>
        {[
          ['orange_money_actif','Orange Money'],
          ['moov_money_actif',  'Moov Money'],
          ['wave_actif',        'Wave'],
        ].map(([k,l]) => (
          <div key={k} className="flex items-center justify-between py-3 border-b border-white/10">
            <span className="text-sm text-white">{l}</span>
            <button onClick={() => setConfig(p=>({...p,[k]:!p[k]}))}
              className={`w-10 h-5 relative transition-all ${config[k]?'bg-[#E8590A]':'bg-white/20'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${config[k]?'left-5':'left-0.5'}`}/>
            </button>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-4 bg-[#E8590A] text-white text-[11px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
        style={{ fontFamily:'Syne,sans-serif' }}>
        {saved ? 'Configuration sauvegardee !' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
      </button>
    </div>
  );
}
