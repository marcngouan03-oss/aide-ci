import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = {
  demandeur:   [
    { path:'/home',     label:'Accueil' },
    { path:'/map',      label:'Carte' },
    { path:'/missions', label:'Missions' },
    { path:'/profile',  label:'Profil' },
  ],
  prestataire: [
    { path:'/dashboard', label:'Tableau' },
    { path:'/missions',  label:'Missions' },
    { path:'/map',       label:'Carte' },
    { path:'/profile',   label:'Profil' },
  ],
};

export default function BottomNav() {
  const { user } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const items = NAV[user?.role] || NAV.demandeur;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] flex z-40"
      style={{ paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
      {items.map(it => {
        const active = loc.pathname.startsWith(it.path);
        return (
          <button key={it.path} onClick={() => nav(it.path)}
            className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all border-t-2
              ${active ? 'text-[#111] border-[#111]' : 'text-[#ABABAB] border-transparent'}`}
            style={{ fontFamily:'Syne,sans-serif' }}>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
