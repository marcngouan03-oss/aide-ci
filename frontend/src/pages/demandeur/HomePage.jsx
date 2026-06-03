import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { categorieAPI, prestataireAPI } from '../../utils/api';
import { Avatar, Stars, Spin, Empty, NotifBell, lastSeen } from '../../components/ui/index';
import BottomNav from '../../components/ui/BottomNav';

export default function HomePage() {
  const { user } = useAuth();
  const { unread, clearUnread } = useSocket();
  const navigate = useNavigate();
  const [categories,   setCategories]   = useState([]);
  const [prestataires, setPrestataires] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selCat,       setSelCat]       = useState('');

  useEffect(() => {
    Promise.all([categorieAPI.getAll(), prestataireAPI.search({})])
      .then(([cr, pr]) => {
        setCategories(cr.data.categories || []);
        setPrestataires(pr.data.prestataires || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = selCat
    ? prestataires.filter(p => p.categorieId?._id === selCat)
    : prestataires;

  return (
    <div className="min-h-dvh flex flex-col pb-20 bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4 border-b border-[#E5E5E5]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#767676]"
            style={{ fontFamily:'Syne,sans-serif' }}>Bonjour</p>
          <h2 className="text-xl font-extrabold tracking-tight mt-0.5"
            style={{ fontFamily:'Syne,sans-serif' }}>{user?.prenom} {user?.nom}</h2>
        </div>
        <div className="flex items-center gap-2">
          <NotifBell count={unread} onClick={() => { clearUnread(); navigate('/notifications'); }} />
          <button onClick={() => navigate('/profile')}>
            <Avatar name={`${user?.prenom||''} ${user?.nom||''}`} size={40} />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-[#111] px-5 py-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background:'radial-gradient(ellipse 300px 200px at 80% 50%, rgba(232,89,10,.15), transparent 70%)' }}/>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#767676] mb-3 relative"
          style={{ fontFamily:'Syne,sans-serif' }}>Abidjan — Cote d'Ivoire</p>
        <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tighter mb-6 relative"
          style={{ fontFamily:'Syne,sans-serif' }}>
          Trouvez le bon<br />prestataire,<br />
          <span style={{ color:'#E8590A' }}>maintenant.</span>
        </h1>
        <button onClick={() => navigate('/map')}
          className="w-full bg-white flex items-center justify-between px-4 py-4 hover:bg-[#F7F7F5] transition-all relative">
          <span className="text-sm text-[#ABABAB]">Rechercher par metier ou quartier...</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#111]"
            style={{ fontFamily:'Syne,sans-serif' }}>Carte</span>
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spin size={28}/></div>
      ) : (
        <div className="flex-1">
          {/* Categories */}
          <section className="px-5 pt-7 pb-6 border-b border-[#E5E5E5]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-widest"
                style={{ fontFamily:'Syne,sans-serif' }}>Categories</h3>
              {selCat && (
                <button onClick={() => setSelCat('')}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#E8590A]"
                  style={{ fontFamily:'Syne,sans-serif' }}>Tout voir</button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {categories.slice(0, 8).map(cat => (
                <button key={cat._id}
                  onClick={() => setSelCat(cat._id === selCat ? '' : cat._id)}
                  className={`py-4 px-2 text-center border-2 transition-all
                    ${selCat===cat._id ? 'border-[#111] bg-[#111]' : 'border-[#E5E5E5] hover:border-[#ABABAB]'}`}>
                  <div className="w-5 h-5 mx-auto mb-2"
                    style={{ background: cat.couleur || '#111' }}/>
                  <span className="text-[10px] font-bold uppercase tracking-wide block leading-tight"
                    style={{ fontFamily:'Syne,sans-serif', color: selCat===cat._id ? '#fff' : '#111' }}>
                    {cat.nom}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Prestataires */}
          <section className="px-5 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-widest"
                style={{ fontFamily:'Syne,sans-serif' }}>
                Prestataires ({filtered.length})
              </h3>
              <button onClick={() => navigate('/map')}
                className="text-[10px] font-bold uppercase tracking-widest text-[#E8590A]"
                style={{ fontFamily:'Syne,sans-serif' }}>Voir carte</button>
            </div>

            {filtered.length === 0 ? (
              <Empty title="Aucun prestataire" subtitle="Soyez le premier a vous inscrire comme prestataire" />
            ) : (
              <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-3" style={{ scrollbarWidth:'none' }}>
                {filtered.map(p => (
                  <button key={p._id} onClick={() => navigate(`/prestataire/${p._id}`)}
                    className="min-w-[160px] flex-shrink-0 text-left border border-[#E5E5E5] p-4 hover:border-[#111] transition-all">
                    <div className="flex items-start gap-2 mb-3">
                      <div className="relative flex-shrink-0">
                        <Avatar name={`${p.prenom} ${p.nom}`} size={40}/>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white
                          ${p.enLigne ? 'bg-green-500' : 'bg-gray-400'}`}/>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs uppercase tracking-wide truncate"
                          style={{ fontFamily:'Syne,sans-serif' }}>{p.prenom}</p>
                        <p className="text-[11px] text-[#767676] truncate">{p.profession}</p>
                        <p className="text-[10px] text-[#ABABAB]">{lastSeen(p.derniereConnexion)}</p>
                      </div>
                    </div>
                    <Stars value={p.notemoyenne} size={11}/>
                    <p className="text-[10px] mt-1.5 text-[#767676]">
                      {p.distanceKm ? `${p.distanceKm} km — ${p.tempsArrivee} min` : p.ville}
                    </p>
                    <div className={`mt-2 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 inline-block
                      ${p.disponibilite==='libre' ? 'bg-[#EAF5EE] text-[#2D9B57]' : 'bg-yellow-50 text-yellow-700'}`}
                      style={{ fontFamily:'Syne,sans-serif' }}>
                      {p.disponibilite==='libre' ? 'Libre' : 'Occupe'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* IA Banner */}
          <div className="mx-5 mt-4 mb-4 bg-[#F7F7F5] border border-[#E5E5E5] p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8590A] mb-2"
              style={{ fontFamily:'Syne,sans-serif' }}>IA Aide CI</p>
            <p className="font-bold text-sm mb-1" style={{ fontFamily:'Syne,sans-serif' }}>
              Estimation automatique des prix
            </p>
            <p className="text-xs text-[#767676] mb-4">
              L'IA calcule le prix moyen par categorie et vous guide dans vos negociations.
            </p>
            <button onClick={() => navigate('/map')}
              className="text-[11px] font-bold uppercase tracking-widest text-[#111] flex items-center gap-2 hover:text-[#E8590A]"
              style={{ fontFamily:'Syne,sans-serif' }}>
              Voir sur la carte →
            </button>
          </div>
        </div>
      )}

      <BottomNav/>
    </div>
  );
}
