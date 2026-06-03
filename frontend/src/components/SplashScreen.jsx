import { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0); // 0=logo, 1=tagline, 2=fade

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#111]"
      style={{
        animation: phase === 2 ? 'splashFade .8s ease forwards' : 'none',
        transition: 'opacity .8s ease',
      }}>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(232,89,10,.3) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite' }} />
      </div>

      {/* Logo */}
      <div style={{ animation: 'splashReveal .7s ease both' }}>
        <div className="text-5xl font-extrabold tracking-tighter text-white mb-2"
          style={{ fontFamily: 'Syne, sans-serif' }}>
          AIDE<span style={{ color: '#E8590A' }}>CI</span>
        </div>
      </div>

      {/* CI flag colors bar */}
      <div className="flex w-24 h-1 mt-3 mb-6 overflow-hidden"
        style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity .5s ease .3s' }}>
        <div className="flex-1 bg-[#F77F00]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#009A44]" />
      </div>

      {/* Tagline */}
      <div style={{
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all .5s ease .4s',
      }}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 text-center"
          style={{ fontFamily: 'Syne, sans-serif' }}>
          L'entraide securisee
        </p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/30 text-center mt-1"
          style={{ fontFamily: 'Syne, sans-serif' }}>
          Cote d'Ivoire
        </p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-2 mt-10"
        style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity .3s ease .8s' }}>
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 bg-white/30 rounded-full"
            style={{ animation: `bounce 1.2s ease-in-out ${i*.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}
