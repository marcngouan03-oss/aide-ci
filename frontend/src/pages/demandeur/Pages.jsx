import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { missionAPI, prestataireAPI } from '../../utils/api';
import { Spin, Btn, Stars, Avatar, Badge, Empty, Card } from '../../components/ui/index';
import BottomNav from '../../components/ui/BottomNav';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';

// ── PAYMENT ───────────────────────────────────────────────────
const PM = [
  { key:'orange_money', label:'Orange Money', tag:'OM', bg:'#FF6600' },
  { key:'moov_money',   label:'Moov Money',   tag:'MM', bg:'#005BAC' },
  { key:'wave',         label:'Wave',          tag:'WV', bg:'#1DC8E5' },
];

export function PaymentPage() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const [mission,    setMission]   = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [selected,   setSelected]  = useState('orange_money');
  const [confirming, setConfirming]= useState(false);

  useEffect(() => {
    missionAPI.getOne(missionId).then(r => setMission(r.data.mission)).finally(() => setLoading(false));
  }, [missionId]);

  const confirm = async () => {
    setConfirming(true);
    try {
      await missionAPI.confirmerDepot(missionId);
      navigate(`/tracking/${missionId}`);
    } catch(err) { alert(err.response?.data?.message||'Erreur'); }
    finally { setConfirming(false); }
  };

  if (loading) return <div className="h-dvh flex items-center justify-center"><Spin/></div>;
  if (!mission) return null;

  const p = mission.prestataire;

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="flex items-center gap-3 px-5 pt-14 pb-5 border-b border-[#E5E5E5]">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 border border-[#E5E5E5] hover:border-[#111] flex items-center justify-center text-sm font-bold">←</button>
        <h2 className="text-[11px] font-bold uppercase tracking-widest flex-1" style={{ fontFamily:'Syne,sans-serif' }}>
          Depot securise
        </h2>
      </div>

      {/* Amount */}
      <div className="bg-[#111] px-5 py-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#767676] mb-2"
          style={{ fontFamily:'Syne,sans-serif' }}>Montant de la mission</p>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-5xl font-extrabold text-white tracking-tighter"
            style={{ fontFamily:'Syne,sans-serif' }}>{mission.montant?.toLocaleString()}</span>
          <span className="text-lg text-[#767676]">FCFA</span>
        </div>
        <p className="text-[10px] text-[#767676]">Bloque chez l'admin jusqu'a validation du travail</p>
        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/60">
          Prestataire : <span className="text-white font-semibold">{p?.prenom} {p?.nom}</span> — {p?.profession}
          <br/><span className="text-white/40 text-[11px]">{mission.description}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 py-6 gap-6">
        {/* Methods */}
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#767676] mb-3"
            style={{ fontFamily:'Syne,sans-serif' }}>Moyen de paiement</h3>
          <div className="flex flex-col gap-2">
            {PM.map(pm => (
              <button key={pm.key} onClick={() => setSelected(pm.key)}
                className={`flex items-center gap-4 p-4 border-2 text-left transition-all
                  ${selected===pm.key ? 'border-[#111] bg-[#F7F7F5]' : 'border-[#E5E5E5] hover:border-[#ABABAB]'}`}>
                <div className="w-12 h-8 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background:pm.bg, fontFamily:'Syne,sans-serif' }}>{pm.tag}</div>
                <span className="font-bold text-sm flex-1" style={{ fontFamily:'Syne,sans-serif' }}>{pm.label}</span>
                <div className={`w-4 h-4 border-2 flex items-center justify-center ${selected===pm.key?'border-[#111] bg-[#111]':'border-[#E5E5E5]'}`}>
                  {selected===pm.key && <div className="w-1.5 h-1.5 bg-white"/>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="border border-[#E5E5E5] p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#767676] mb-3"
            style={{ fontFamily:'Syne,sans-serif' }}>Recapitulatif</h3>
          {[['Service',mission.description],['Montant',`${mission.montant?.toLocaleString()} FCFA`],['Frais admin','0 FCFA']].map(([k,v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-[#E5E5E5]">
              <span className="text-xs text-[#767676]">{k}</span>
              <span className="text-xs font-medium truncate ml-4 max-w-[60%] text-right">{v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3">
            <span className="text-sm font-bold uppercase tracking-wide" style={{ fontFamily:'Syne,sans-serif' }}>Total</span>
            <span className="text-lg font-extrabold tracking-tighter" style={{ fontFamily:'Syne,sans-serif',color:'#E8590A' }}>
              {mission.montantTotal?.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        <div className="mt-auto">
          <Btn size="xl" fullWidth variant="orange" loading={confirming} onClick={confirm}>
            Confirmer le depot
          </Btn>
          <p className="text-center text-[10px] text-[#767676] mt-3 uppercase tracking-wide"
            style={{ fontFamily:'Syne,sans-serif' }}>
            Libere uniquement apres validation par l'admin
          </p>
        </div>
      </div>
    </div>
  );
}

// ── TRACKING ──────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function mkIcon(label, bg) {
  return L.divIcon({
    html:`<div style="width:36px;height:36px;background:${bg};border-radius:50%;border:3px solid #fff;
      display:flex;align-items:center;justify-content:center;font-family:Syne,sans-serif;
      font-size:11px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">${label}</div>`,
    iconSize:[36,36], iconAnchor:[18,18], className:''
  });
}

const STEPS = [
  { key:'depot_recu',           label:'Depot confirme' },
  { key:'prestataire_en_route', label:'En route vers vous' },
  { key:'prestataire_arrive',   label:'Prestataire arrive' },
  { key:'en_cours',             label:'Travail en cours' },
  { key:'termine',              label:'Travail termine' },
];

export function TrackingPage() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { on, off } = useSocket();
  const [mission,   setMission]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [prestaPos, setPrestaPos] = useState(null);
  const [userPos,   setUserPos]   = useState(null);
  const [showVal,   setShowVal]   = useState(false);
  const [note,      setNote]      = useState(5);
  const [avis,      setAvis]      = useState('');
  const [validating,setValidating]= useState(false);
  const [done,      setDone]      = useState(false);

  useEffect(() => {
    missionAPI.getOne(missionId).then(r => {
      setMission(r.data.mission);
      const c = r.data.mission.prestataire?.location?.coordinates;
      if (c?.[0]) setPrestaPos({ lat:c[1], lng:c[0] });
    }).finally(() => setLoading(false));
    navigator.geolocation?.getCurrentPosition(p => setUserPos({ lat:p.coords.latitude, lng:p.coords.longitude }));
  }, [missionId]);

  useEffect(() => {
    const onLoc = ({ userId, lat, lng }) => {
      if (userId===mission?.prestataire?._id) setPrestaPos({ lat, lng });
    };
    const onMission = ({ statut }) => setMission(p => ({ ...p, statut }));
    on('mission_location_update', onLoc);
    on('mission_updated', onMission);
    return () => { off('mission_location_update', onLoc); off('mission_updated', onMission); };
  }, [mission]);

  const valider = async () => {
    setValidating(true);
    try {
      await missionAPI.updateStatut(missionId, 'termine');
      if (note) await missionAPI.noter(missionId, { note, avis });
      setDone(true);
    } catch(err) { alert(err.response?.data?.message||'Erreur'); }
    finally { setValidating(false); }
  };

  if (loading) return <div className="h-dvh flex items-center justify-center"><Spin/></div>;
  if (!mission) return null;

  const p = mission.prestataire;
  const cur = STEPS.findIndex(s => s.key===mission.statut);
  const mapCenter = userPos||prestaPos||{ lat:5.36, lng:-4.0 };

  if (done) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-white">
      <div className="w-20 h-20 bg-[#111] flex items-center justify-center mb-8">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 className="text-2xl font-extrabold tracking-tighter mb-3" style={{ fontFamily:'Syne,sans-serif' }}>Mission accomplie</h2>
      <p className="text-sm text-[#767676] mb-8 max-w-xs">
        L'admin va liberer <strong>{mission.montant?.toLocaleString()} FCFA</strong> vers {p?.prenom} apres verification.
      </p>
      <Btn size="xl" fullWidth onClick={() => navigate('/home')}>Retour a l'accueil</Btn>
    </div>
  );

  return (
    <div className="h-dvh flex flex-col">
      <div className="flex-1 relative">
        <MapContainer center={[mapCenter.lat,mapCenter.lng]} zoom={14} className="w-full h-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {userPos && <Marker position={[userPos.lat,userPos.lng]} icon={mkIcon('V','#3B82F6')}/>}
          {prestaPos && <Marker position={[prestaPos.lat,prestaPos.lng]} icon={mkIcon(p?.prenom?.[0]||'P','#E8590A')}/>}
          {userPos && prestaPos && (
            <Polyline positions={[[userPos.lat,userPos.lng],[prestaPos.lat,prestaPos.lng]]}
              color="#E8590A" weight={3} dashArray="8,5" opacity={0.7}/>
          )}
        </MapContainer>
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-[1000] w-9 h-9 bg-white border border-[#E5E5E5] flex items-center justify-center text-sm font-bold hover:border-[#111]">←</button>
        {mission.distanceKm && (
          <div className="absolute top-4 right-4 z-[1000] bg-white border border-[#E5E5E5] px-3 py-2">
            <p className="text-xs font-bold" style={{ fontFamily:'Syne,sans-serif' }}>
              {mission.distanceKm} km — {mission.tempsMin} min
            </p>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-[#E5E5E5] px-5 pt-5 pb-8 max-h-[55vh] overflow-y-auto">
        {/* Steps */}
        <div className="flex flex-col gap-0 mb-4">
          {STEPS.map((s,i) => {
            const done = i < cur, active = i===cur;
            return (
              <div key={s.key} className="flex items-start gap-3 py-2">
                <div className="flex flex-col items-center w-6 flex-shrink-0">
                  <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white
                    ${done?'bg-[#2D9B57]':active?'bg-[#E8590A]':'bg-[#E5E5E5]'}`}
                    style={{ fontFamily:'Syne,sans-serif', color:(!done&&!active)?'#767676':'white' }}>
                    {done?'✓':i+1}
                  </div>
                  {i<STEPS.length-1 && <div className="w-px h-4 mt-0.5 bg-[#E5E5E5]"/>}
                </div>
                <p className={`text-sm pt-0.5 ${active?'font-bold text-[#111]':done?'text-[#767676] line-through':'text-[#ABABAB]'}`}>
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Presta row */}
        <div className="flex items-center gap-3 p-3 bg-[#F7F7F5] border border-[#E5E5E5] mb-4">
          <div className="w-10 h-10 bg-[#111] flex items-center justify-center text-white font-bold"
            style={{ fontFamily:'Syne,sans-serif' }}>
            {p?.prenom?.[0]}{p?.nom?.[0]}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ fontFamily:'Syne,sans-serif' }}>{p?.prenom} {p?.nom}</p>
            <p className="text-xs" style={{ color:'#E8590A' }}>
              {mission.statut==='prestataire_en_route' ? `En route — ${mission.distanceKm||'?'} km` : mission.statut}
            </p>
          </div>
        </div>

        {/* Validate */}
        {user?.role==='demandeur' && ['en_cours','prestataire_arrive'].includes(mission.statut) && !showVal && (
          <Btn size="lg" fullWidth variant="green" onClick={() => setShowVal(true)}>
            Travail termine — Valider
          </Btn>
        )}
        {showVal && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <p className="text-[11px] font-bold uppercase tracking-widest text-center" style={{ fontFamily:'Syne,sans-serif' }}>
              Noter le travail
            </p>
            <div className="flex justify-center gap-3">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setNote(n)} className="text-3xl"
                  style={{ color:n<=note?'#E8590A':'#E5E5E5' }}>★</button>
              ))}
            </div>
            <textarea value={avis} onChange={e=>setAvis(e.target.value)}
              placeholder="Votre avis (optionnel)..."
              className="w-full border border-[#E5E5E5] px-4 py-3 text-sm outline-none focus:border-[#111] resize-none" rows={3}/>
            <Btn size="lg" fullWidth loading={validating} onClick={valider}>Valider et noter {note}/5</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MISSIONS LIST ─────────────────────────────────────────────
export function MissionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('actives');

  useEffect(() => {
    missionAPI.mesMissions().then(r => setMissions(r.data.missions||[])).finally(() => setLoading(false));
  }, []);

  const ACTIVES = ['en_attente_depot','depot_recu','prestataire_en_route','prestataire_arrive','en_cours'];
  const filtered = missions.filter(m => {
    if (filter==='actives')   return ACTIVES.includes(m.statut);
    if (filter==='terminees') return ['termine','paye'].includes(m.statut);
    return true;
  });

  const sLabel = s => ({ en_attente_depot:'En attente', depot_recu:'Depot recu',
    prestataire_en_route:'En route', prestataire_arrive:'Arrive', en_cours:'En cours',
    termine:'Termine', paye:'Paye', litige:'Litige', annule:'Annule' }[s]||s);
  const sColor = s => ['termine','paye'].includes(s)?'green':['litige','annule'].includes(s)?'red':'gray';

  return (
    <div className="min-h-dvh flex flex-col pb-24 bg-white">
      <div className="px-5 pt-14 pb-5 border-b border-[#E5E5E5]">
        <h1 className="text-2xl font-extrabold tracking-tighter mb-4" style={{ fontFamily:'Syne,sans-serif' }}>Mes Missions</h1>
        <div className="flex gap-2">
          {[['actives','En cours'],['terminees','Terminees'],['toutes','Toutes']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all
                ${filter===k?'bg-[#111] text-white border-[#111]':'border-[#E5E5E5] text-[#767676] hover:border-[#ABABAB]'}`}
              style={{ fontFamily:'Syne,sans-serif' }}>{l}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 px-5 py-5">
        {loading ? <div className="flex justify-center py-16"><Spin/></div>
          : filtered.length===0 ? <Empty title="Aucune mission" subtitle="Vos missions apparaitront ici"/>
          : filtered.map(m => {
            const other = user?.role==='demandeur' ? m.prestataire : m.demandeur;
            const isActive = ACTIVES.includes(m.statut);
            return (
              <div key={m._id} className="border border-[#E5E5E5] p-4 mb-3 hover:border-[#111] transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar name={`${other?.prenom||''} ${other?.nom||''}`} size={40}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm uppercase tracking-wide truncate"
                        style={{ fontFamily:'Syne,sans-serif' }}>{other?.prenom} {other?.nom}</p>
                      <Badge color={sColor(m.statut)}>{sLabel(m.statut)}</Badge>
                    </div>
                    <p className="text-xs text-[#767676] truncate">{m.description}</p>
                    {m.distanceKm && <p className="text-[10px] text-[#E8590A] mt-0.5">{m.distanceKm} km — {m.tempsMin} min</p>}
                    <p className="text-[10px] text-[#ABABAB] mt-0.5">{new Date(m.createdAt).toLocaleDateString('fr')}</p>
                  </div>
                  <span className="font-bold text-sm flex-shrink-0" style={{ fontFamily:'Syne,sans-serif',color:'#E8590A' }}>
                    {m.montant?.toLocaleString()} F
                  </span>
                </div>
                {isActive && (
                  <div className="flex gap-2 pt-3 border-t border-[#E5E5E5]">
                    <button onClick={() => navigate(`/chat/${other?._id}`)}
                      className="flex-1 py-2.5 border-2 border-[#111] text-[10px] font-bold uppercase tracking-widest hover:bg-[#111] hover:text-white transition-all"
                      style={{ fontFamily:'Syne,sans-serif' }}>Chat</button>
                    <button onClick={() => navigate(`/tracking/${m._id}`)}
                      className="flex-1 py-2.5 bg-[#111] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-all"
                      style={{ fontFamily:'Syne,sans-serif' }}>Suivre</button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
      <BottomNav/>
    </div>
  );
}

// ── PRESTATAIRE PROFILE ───────────────────────────────────────
export function PrestataireProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [presta, setPresta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prestataireAPI.getOne(id).then(r => setPresta(r.data.prestataire)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="h-dvh flex items-center justify-center"><Spin/></div>;
  if (!presta) return <div className="h-dvh flex items-center justify-center text-sm text-[#767676]">Prestataire introuvable</div>;

  return (
    <div className="min-h-dvh flex flex-col pb-8 bg-white">
      <div className="bg-[#111] px-5 pt-14 pb-10">
        <button onClick={() => navigate(-1)}
          className="mb-5 w-9 h-9 border border-white/20 flex items-center justify-center text-white text-sm font-bold hover:border-white">←</button>
        <div className="flex items-end gap-4">
          <div className="relative">
            <div className="w-18 h-18 bg-white/10 flex items-center justify-center text-white font-bold text-2xl"
              style={{ width:72,height:72,fontFamily:'Syne,sans-serif' }}>
              {presta.prenom?.[0]}{presta.nom?.[0]}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-[#111] ${presta.enLigne?'bg-green-500':'bg-gray-400'}`}/>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-extrabold text-white tracking-tighter" style={{ fontFamily:'Syne,sans-serif' }}>
              {presta.prenom} {presta.nom}
            </h2>
            <p className="text-xs text-white/50 mt-1">{presta.profession} — {presta.ville}</p>
            <div className="flex items-center gap-2 mt-2">
              <Stars value={presta.notemoyenne} size={12}/>
              <span className="text-sm font-bold text-white">{presta.notemoyenne?.toFixed(1)||'0.0'}</span>
              <span className="text-xs text-white/30">({presta.nombreAvis} avis)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-[#E5E5E5]">
        {[
          { val:presta.notemoyenne?.toFixed(1)||'0.0', lbl:'Note' },
          { val:presta.nombreMissions||0, lbl:'Missions' },
          { val:presta.disponibilite==='libre'?'Libre':'Occupe', lbl:'Statut' },
        ].map((s,i) => (
          <div key={s.lbl} className={`text-center py-5 ${i<2?'border-r border-[#E5E5E5]':''}`}>
            <div className="text-xl font-extrabold tracking-tighter" style={{ fontFamily:'Syne,sans-serif' }}>{s.val}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#767676] mt-1"
              style={{ fontFamily:'Syne,sans-serif' }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="px-5 py-6 flex flex-col gap-4">
        <div className="bg-[#F7F7F5] border border-[#E5E5E5] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8590A] mb-2"
            style={{ fontFamily:'Syne,sans-serif' }}>Estimation IA</p>
          <p className="font-bold text-sm" style={{ fontFamily:'Syne,sans-serif' }}>
            {presta.profession} a {presta.ville}
          </p>
          <p className="text-xl font-extrabold mt-1 tracking-tighter"
            style={{ fontFamily:'Syne,sans-serif',color:'#E8590A' }}>
            5 000 – 25 000 FCFA
          </p>
          <p className="text-xs text-[#767676] mt-1">Selon la complexite de la tache</p>
        </div>
        {user?.role==='demandeur' && (
          <Btn size="xl" fullWidth variant="orange" onClick={() => navigate(`/chat/${presta._id}`)}>
            Contacter {presta.prenom}
          </Btn>
        )}
      </div>
    </div>
  );
}
