import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { missionAPI, authAPI, adminAPI } from '../../utils/api';
import { Spin, Stars, Avatar, Badge, Empty, Btn } from '../../components/ui/index';
import BottomNav from '../../components/ui/BottomNav';

// ── PRESTATAIRE DASHBOARD ─────────────────────────────────────
export function PrestataireDashboard() {
  const { user } = useAuth();
  const { emit } = useSocket();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [dispo,    setDispo]    = useState(user?.disponibilite || 'libre');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    missionAPI.mesMissions()
      .then(r => setMissions(r.data.missions || []))
      .finally(() => setLoading(false));

    // Partager position en continu
    const wid = navigator.geolocation?.watchPosition(
      pos => emit('update_location', { lat: pos.coords.latitude, lng: pos.coords.longitude }),
      null, { enableHighAccuracy: true, maximumAge: 8000 }
    );
    return () => wid && navigator.geolocation?.clearWatch(wid);
  }, []);

  const toggleDispo = async () => {
    const next = dispo === 'libre' ? 'occupe' : 'libre';
    setUpdating(true);
    try {
      await authAPI.updateDisponibilite(next);
      emit('update_disponibilite', { disponibilite: next });
      setDispo(next);
    } finally { setUpdating(false); }
  };

  const updateStatut = async (id, statut) => {
    await missionAPI.updateStatut(id, statut);
    setMissions(prev => prev.map(m => m._id === id ? { ...m, statut } : m));
    emit('mission_update', { missionId: id, statut });
  };

  const ACTIVES = ['depot_recu','prestataire_en_route','prestataire_arrive','en_cours'];
  const actives    = missions.filter(m => ACTIVES.includes(m.statut));
  const historique = missions.filter(m => ['paye','termine','annule'].includes(m.statut));

  const sNext = (statut) => ({
    depot_recu: { label:'Partir', next:'prestataire_en_route' },
    prestataire_en_route: { label:'Je suis arrive', next:'prestataire_arrive' },
    prestataire_arrive:   { label:'Commencer le travail', next:'en_cours' },
  }[statut]);

  return (
    <div className="min-h-dvh flex flex-col pb-24 bg-white">
      {/* Header */}
      <div className="bg-[#111] px-5 pt-14 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={`${user?.prenom||''} ${user?.nom||''}`} size={52} />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40"
              style={{ fontFamily:'Syne,sans-serif' }}>Tableau de bord</p>
            <h2 className="text-xl font-extrabold text-white tracking-tighter mt-0.5"
              style={{ fontFamily:'Syne,sans-serif' }}>{user?.prenom} {user?.nom}</h2>
            <p className="text-xs text-white/40 mt-0.5">{user?.profession}</p>
          </div>
          <button onClick={() => navigate('/profile')}
            className="w-9 h-9 border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white text-lg">
            /
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-white/10 mb-6">
          {[
            { val: user?.notemoyenne?.toFixed(1) || '0.0', lbl:'Note' },
            { val: user?.nombreMissions || 0,               lbl:'Missions' },
            { val: user?.nombreAvis || 0,                   lbl:'Avis' },
          ].map(s => (
            <div key={s.lbl} className="bg-[#111] text-center py-4">
              <div className="text-xl font-extrabold text-white tracking-tighter"
                style={{ fontFamily:'Syne,sans-serif' }}>{s.val}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1"
                style={{ fontFamily:'Syne,sans-serif' }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Dispo toggle */}
        <div className={`flex items-center justify-between p-4 border ${dispo==='libre'?'border-green-500/30 bg-green-500/10':'border-yellow-500/30 bg-yellow-500/10'}`}>
          <div>
            <p className="font-bold text-white text-sm uppercase tracking-wide"
              style={{ fontFamily:'Syne,sans-serif' }}>
              {dispo==='libre' ? 'Disponible' : 'Occupe'}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {dispo==='libre' ? 'Visible sur la carte' : 'Non visible pour les demandeurs'}
            </p>
          </div>
          <button onClick={toggleDispo} disabled={updating}
            className={`w-12 h-6 relative transition-all ${dispo==='libre'?'bg-green-500':'bg-yellow-500/50'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${dispo==='libre'?'left-7':'left-1'}`}/>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Missions actives */}
        {actives.length > 0 && (
          <section className="px-5 py-6 border-b border-[#E5E5E5]">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{ fontFamily:'Syne,sans-serif' }}>
              Missions en cours ({actives.length})
            </p>
            {actives.map(m => {
              const next = sNext(m.statut);
              return (
                <div key={m._id} className="border border-[#E5E5E5] p-4 mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 mr-4">
                      <p className="font-bold text-sm" style={{ fontFamily:'Syne,sans-serif' }}>
                        {m.demandeur?.prenom} {m.demandeur?.nom}
                      </p>
                      <p className="text-xs text-[#767676] mt-1">{m.description}</p>
                      {m.adresseTravail && (
                        <p className="text-xs text-[#ABABAB] mt-0.5">{m.adresseTravail}</p>
                      )}
                      {m.distanceKm && (
                        <p className="text-xs text-[#E8590A] mt-0.5 font-semibold">
                          {m.distanceKm} km — {m.tempsMin} min
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-sm flex-shrink-0"
                      style={{ fontFamily:'Syne,sans-serif', color:'#E8590A' }}>
                      {m.montant?.toLocaleString()} F
                    </span>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-[#E5E5E5]">
                    <button onClick={() => navigate(`/chat/${m.demandeur?._id}`)}
                      className="flex-1 py-2.5 border border-[#111] text-[10px] font-bold uppercase tracking-widest hover:bg-[#111] hover:text-white transition-all"
                      style={{ fontFamily:'Syne,sans-serif' }}>Chat</button>
                    {next && (
                      <button onClick={() => updateStatut(m._id, next.next)}
                        className="flex-1 py-2.5 bg-[#E8590A] text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                        style={{ fontFamily:'Syne,sans-serif' }}>{next.label}</button>
                    )}
                    <button onClick={() => navigate(`/tracking/${m._id}`)}
                      className="flex-1 py-2.5 bg-[#111] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-all"
                      style={{ fontFamily:'Syne,sans-serif' }}>Carte</button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Historique */}
        <section className="px-5 py-6">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ fontFamily:'Syne,sans-serif' }}>Historique</p>
          {loading ? <div className="flex justify-center py-10"><Spin/></div>
            : historique.length === 0 ? (
              <Empty title="Aucune mission terminee" subtitle="Vos missions completees apparaitront ici"/>
            ) : historique.map(m => (
              <div key={m._id} className="flex items-center justify-between py-4 border-b border-[#E5E5E5]">
                <div className="flex-1 mr-4">
                  <p className="font-medium text-sm">{m.description}</p>
                  <p className="text-xs text-[#767676] mt-0.5">{new Date(m.createdAt).toLocaleDateString('fr')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm"
                    style={{ fontFamily:'Syne,sans-serif', color: m.statut==='paye'?'#2D9B57':'#767676' }}>
                    {m.montant?.toLocaleString()} F
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-[#767676] mt-0.5"
                    style={{ fontFamily:'Syne,sans-serif' }}>
                    {m.statut==='paye'?'Paye':m.statut}
                  </p>
                </div>
              </div>
            ))
          }
        </section>
      </div>

      <BottomNav/>
    </div>
  );
}

// ── PROFILE PAGE (shared) ─────────────────────────────────────
export function ProfilePage() {
  const { user, logout } = useAuth();
  const { notifications, unread, clearUnread } = useSocket();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);

  const menu = [
    { label:'Mes missions',   action: () => navigate('/missions') },
    { label:`Notifications (${unread})`, action: () => { setShowNotifs(true); clearUnread(); } },
    { label:'Securite',       action: () => {} },
    { label:'Aide & support', action: () => {} },
  ];

  return (
    <div className="min-h-dvh flex flex-col pb-24 bg-white">
      <div className="bg-[#111] px-5 pt-14 pb-10">
        <div className="flex items-start gap-4">
          <Avatar name={`${user?.prenom||''} ${user?.nom||''}`} size={64}/>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1"
              style={{ fontFamily:'Syne,sans-serif' }}>
              {user?.role==='prestataire' ? user?.profession : user?.role==='demandeur' ? 'Demandeur' : 'Administrateur'}
            </p>
            <h2 className="text-2xl font-extrabold text-white tracking-tighter"
              style={{ fontFamily:'Syne,sans-serif' }}>{user?.prenom} {user?.nom}</h2>
            <p className="text-xs text-white/40 mt-1">{user?.email}</p>
            <p className="text-xs text-white/40">{user?.ville}</p>
            {user?.role==='prestataire' && (
              <div className="flex items-center gap-2 mt-2">
                <Stars value={user?.notemoyenne} size={12}/>
                <span className="text-sm text-white/70 font-bold">{user?.notemoyenne?.toFixed(1)||'0.0'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {menu.map((item, i) => (
          <button key={i} onClick={item.action}
            className="flex items-center justify-between px-5 py-5 border-b border-[#E5E5E5] hover:bg-[#F7F7F5] text-left transition-colors">
            <span className="text-sm font-medium">{item.label}</span>
            <span className="text-[#767676] text-lg">›</span>
          </button>
        ))}
        <button onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center justify-between px-5 py-5 border-b border-[#E5E5E5] hover:bg-red-50 mt-6 transition-colors">
          <span className="text-sm font-medium text-red-600">Se deconnecter</span>
          <span className="text-red-300 text-lg">›</span>
        </button>
      </div>

      {/* Notifications panel */}
      {showNotifs && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNotifs(false)}/>
          <div className="relative bg-white w-full max-h-[80vh] overflow-y-auto shadow-xl animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5] sticky top-0 bg-white">
              <h3 className="text-[11px] font-bold uppercase tracking-widest"
                style={{ fontFamily:'Syne,sans-serif' }}>Notifications</h3>
              <button onClick={() => setShowNotifs(false)} className="text-[#767676] text-xl">×</button>
            </div>
            {notifications.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[#767676]">Aucune notification</div>
            ) : notifications.map(n => (
              <div key={n._id} className={`px-5 py-4 border-b border-[#E5E5E5] ${!n.lu?'bg-[#FFF4EE]':''}`}>
                <p className="font-bold text-sm" style={{ fontFamily:'Syne,sans-serif' }}>{n.titre}</p>
                <p className="text-xs text-[#767676] mt-1">{n.corps}</p>
                <p className="text-[10px] text-[#ABABAB] mt-1">
                  {new Date(n.createdAt).toLocaleString('fr')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav/>
    </div>
  );
}
