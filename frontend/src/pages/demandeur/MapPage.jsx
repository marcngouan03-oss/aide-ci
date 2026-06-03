import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { prestataireAPI, categorieAPI } from '../../utils/api';
import { Spin, Btn, lastSeen } from '../../components/ui/index';
import BottomNav from '../../components/ui/BottomNav';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

// Avatar marker Snapchat-style
function makeAvatar(prenom, nom, disponibilite, enLigne) {
  const ini  = ((prenom?.[0]||'')+(nom?.[0]||'')).toUpperCase();
  const ring = disponibilite==='libre' ? '#22C55E' : '#F59E0B';
  const dot  = enLigne ? '#22C55E' : '#9CA3AF';
  const html = `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none">
    <div style="position:relative">
      <div style="width:46px;height:46px;border-radius:50%;background:#111;border:3px solid ${ring};
        display:flex;align-items:center;justify-content:center;font-family:Syne,sans-serif;
        font-size:15px;font-weight:800;color:#fff;box-shadow:0 3px 12px rgba(0,0,0,.3)">${ini}</div>
      <div style="position:absolute;bottom:0;right:0;width:12px;height:12px;background:${dot};
        border-radius:50%;border:2px solid #fff"></div>
    </div>
    <div style="background:#111;color:#fff;font-family:Syne,sans-serif;font-size:9px;font-weight:700;
      padding:2px 7px;margin-top:3px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">
      ${prenom||''}
    </div>
  </div>`;
  return L.divIcon({ html, iconSize:[64,72], iconAnchor:[32,60], className:'' });
}

function makeYouIcon() {
  return L.divIcon({
    html:`<div style="width:18px;height:18px;background:#3B82F6;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,.6)"></div>`,
    iconSize:[18,18], iconAnchor:[9,9], className:''
  });
}

function Locator({ onLoc }) {
  const map = useMap();
  useEffect(() => {
    map.locate({ setView:true, maxZoom:14 });
    map.on('locationfound', e => onLoc({ lat:e.latlng.lat, lng:e.latlng.lng }));
  }, []);
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { on, off, emit } = useSocket();
  const [prestataires, setPrestataires] = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [catFilter,    setCatFilter]    = useState('');
  const [selected,     setSelected]     = useState(null);
  const [userPos,      setUserPos]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const watchRef = useRef(null);

  const center = userPos ? [userPos.lat, userPos.lng] : [5.3600, -4.0083];

  useEffect(() => {
    Promise.all([categorieAPI.getAll(), prestataireAPI.carte()])
      .then(([cr, pr]) => {
        setCategories(cr.data.categories || []);
        setPrestataires(pr.data.prestataires || []);
      })
      .finally(() => setLoading(false));

    // Partager position si prestataire
    if (user?.role === 'prestataire') {
      watchRef.current = navigator.geolocation?.watchPosition(
        pos => emit('update_location', { lat: pos.coords.latitude, lng: pos.coords.longitude }),
        null, { enableHighAccuracy:true, maximumAge:5000 }
      );
    }
    return () => { if (watchRef.current) navigator.geolocation?.clearWatch(watchRef.current); };
  }, []);

  useEffect(() => {
    const onLoc  = ({ userId, lat, lng }) =>
      setPrestataires(prev => prev.map(p => p._id===userId
        ? { ...p, location:{ type:'Point', coordinates:[lng,lat] } } : p));
    const onStatus = ({ userId, enLigne, derniereConnexion }) =>
      setPrestataires(prev => prev.map(p => p._id===userId ? { ...p, enLigne, derniereConnexion } : p));
    const onDispo = ({ userId, disponibilite }) =>
      setPrestataires(prev => prev.map(p => p._id===userId ? { ...p, disponibilite } : p));
    on('prestataire_location', onLoc);
    on('user_status', onStatus);
    on('prestataire_disponibilite', onDispo);
    return () => { off('prestataire_location', onLoc); off('user_status', onStatus); off('prestataire_disponibilite', onDispo); };
  }, []);

  // Calculer distance réelle
  function calcDist(lat1,lon1,lat2,lon2) {
    const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  const visibles = prestataires.filter(p => {
    if (catFilter && p.categorieId?._id !== catFilter) return false;
    const [lng,lat] = p.location?.coordinates||[0,0];
    return lat!==0||lng!==0;
  });

  const allFiltered = prestataires.filter(p => !catFilter || p.categorieId?._id===catFilter);

  // Enrichir le selected avec distance réelle
  const enriched = selected && userPos && selected.location?.coordinates?.[0] ? {
    ...selected,
    distKm: Math.round(calcDist(userPos.lat,userPos.lng,selected.location.coordinates[1],selected.location.coordinates[0])*10)/10,
    tempsMin: Math.max(1, Math.round(calcDist(userPos.lat,userPos.lng,selected.location.coordinates[1],selected.location.coordinates[0])/30*60)),
  } : selected;

  return (
    <div className="h-dvh flex flex-col relative">
      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-12">
        <div className="bg-white border border-[#E5E5E5] p-3 mb-2 flex items-center gap-2 shadow-sm">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center border border-[#E5E5E5] text-sm font-bold hover:border-[#111] flex-shrink-0">←</button>
          <span className="text-sm font-bold flex-1 truncate" style={{ fontFamily:'Syne,sans-serif' }}>
            {allFiltered.length} prestataire{allFiltered.length!==1?'s':''}
            {visibles.length!==allFiltered.length && ` — ${visibles.length} localisé${visibles.length!==1?'s':''}`}
          </span>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${visibles.some(p=>p.enLigne) ? 'bg-green-500' : 'bg-gray-300'}`}/>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
          <button onClick={() => setCatFilter('')}
            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border shadow-sm flex-shrink-0
              ${!catFilter ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-[#111] border-[#E5E5E5]'}`}
            style={{ fontFamily:'Syne,sans-serif' }}>Tous</button>
          {categories.slice(0,12).map(c => (
            <button key={c._id} onClick={() => setCatFilter(c._id===catFilter?'':c._id)}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border shadow-sm flex-shrink-0
                ${catFilter===c._id ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-[#111] border-[#E5E5E5]'}`}
              style={{ fontFamily:'Syne,sans-serif' }}>{c.nom}</button>
          ))}
        </div>
        <div className="flex gap-3 mt-1.5 bg-white border border-[#E5E5E5] px-3 py-1.5 w-fit shadow-sm">
          {[['Libre','bg-green-500'],['Occupe','bg-yellow-500'],['Hors ligne','bg-gray-400']].map(([l,c]) => (
            <span key={l} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ fontFamily:'Syne,sans-serif' }}>
              <span className={`w-2 h-2 rounded-full ${c}`}/>{l}
            </span>
          ))}
        </div>
      </div>

      {/* Map */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-[#F7F7F5]"><Spin size={32}/></div>
      ) : (
        <div className="flex-1">
          <MapContainer center={center} zoom={13} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OSM"/>
            <Locator onLoc={pos => setUserPos(pos)}/>
            {userPos && <Marker position={[userPos.lat,userPos.lng]} icon={makeYouIcon()}>
              <Tooltip permanent direction="top" offset={[0,-12]}>
                <span style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700 }}>Vous</span>
              </Tooltip>
            </Marker>}
            {visibles.map(p => {
              const [lng,lat] = p.location.coordinates;
              return (
                <Marker key={p._id} position={[lat,lng]}
                  icon={makeAvatar(p.prenom,p.nom,p.disponibilite,p.enLigne)}
                  eventHandlers={{ click:()=>setSelected(p) }}/>
              );
            })}
            {/* Ligne entre l'utilisateur et le prestataire sélectionné */}
            {userPos && selected?.location?.coordinates?.[0] && (
              <Polyline
                positions={[[userPos.lat,userPos.lng],[selected.location.coordinates[1],selected.location.coordinates[0]]]}
                color="#E8590A" weight={2} dashArray="8,5" opacity={0.6}/>
            )}
          </MapContainer>
        </div>
      )}

      {/* Panel prestataire */}
      {selected && (
        <div className="absolute bottom-16 left-4 right-4 z-[1000] bg-white border border-[#E5E5E5] shadow-xl animate-slide-up">
          <div className="flex items-start gap-3 p-4 border-b border-[#E5E5E5]">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 bg-[#111] flex items-center justify-center text-white font-bold text-lg"
                style={{ fontFamily:'Syne,sans-serif' }}>
                {(selected.prenom?.[0]||'')}{(selected.nom?.[0]||'')}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${selected.enLigne?'bg-green-500':'bg-gray-400'}`}/>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base tracking-tight" style={{ fontFamily:'Syne,sans-serif' }}>
                {selected.prenom} {selected.nom}
              </h4>
              <p className="text-xs text-[#767676]">{selected.profession} — {selected.ville}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border
                  ${selected.disponibilite==='libre' ? 'text-green-600 border-green-200 bg-green-50' : 'text-yellow-600 border-yellow-200 bg-yellow-50'}`}
                  style={{ fontFamily:'Syne,sans-serif' }}>
                  {selected.disponibilite==='libre'?'Disponible':'Occupe'}
                </span>
                <span className="text-[10px] text-[#767676]">{lastSeen(selected.derniereConnexion)}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#767676] text-xl p-1">×</button>
          </div>

          <div className="grid grid-cols-4 border-b border-[#E5E5E5] text-center">
            {[
              { val: enriched?.distKm ? `${enriched.distKm} km` : '—',    lbl:'Distance' },
              { val: enriched?.tempsMin ? `${enriched.tempsMin} min` : '—', lbl:'Arrivee' },
              { val: selected.notemoyenne?.toFixed(1)||'0.0',               lbl:'Note' },
              { val: selected.nombreMissions||0,                            lbl:'Missions' },
            ].map((s,i) => (
              <div key={s.lbl} className={`py-3 ${i<3?'border-r border-[#E5E5E5]':''}`}>
                <p className="font-bold text-sm" style={{ fontFamily:'Syne,sans-serif' }}>{s.val}</p>
                <p className="text-[9px] uppercase tracking-widest text-[#767676]" style={{ fontFamily:'Syne,sans-serif' }}>{s.lbl}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 p-3">
            <button onClick={() => navigate(`/prestataire/${selected._id}`)}
              className="flex-1 py-3 border-2 border-[#111] text-[10px] font-bold uppercase tracking-widest hover:bg-[#111] hover:text-white transition-all"
              style={{ fontFamily:'Syne,sans-serif' }}>Profil</button>
            {user?.role==='demandeur' && (
              <button onClick={() => navigate(`/chat/${selected._id}`)}
                className="flex-1 py-3 bg-[#E8590A] text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                style={{ fontFamily:'Syne,sans-serif' }}>Contacter</button>
            )}
          </div>
        </div>
      )}

      <BottomNav/>
    </div>
  );
}
