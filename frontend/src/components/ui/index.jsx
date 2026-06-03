// ── BUTTON ────────────────────────────────────────────────────
export function Btn({ children, variant='dark', size='md', fullWidth, loading, className='', ...p }) {
  const V = {
    dark:    'bg-[#111] text-white hover:bg-[#333]',
    orange:  'bg-[#E8590A] text-white hover:bg-[#FF7A30]',
    outline: 'border-2 border-[#111] text-[#111] hover:bg-[#111] hover:text-white',
    ghost:   'text-[#E8590A] hover:underline',
    green:   'bg-[#2D9B57] text-white hover:opacity-90',
    danger:  'bg-red-600 text-white hover:bg-red-700',
    white:   'bg-white text-[#111] border border-[#E5E5E5] hover:bg-[#F7F7F5]',
  };
  const S = {
    sm: 'px-3 py-2 text-[11px] gap-1.5',
    md: 'px-5 py-3 text-[12px] gap-2',
    lg: 'px-6 py-4 text-[12px] gap-2',
    xl: 'px-8 py-4 text-[13px] gap-2',
  };
  return (
    <button
      {...p}
      disabled={loading || p.disabled}
      className={`inline-flex items-center justify-center font-bold uppercase tracking-widest transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        ${V[variant]} ${S[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ fontFamily: 'Syne, sans-serif', ...(p.style||{}) }}>
      {loading ? <Spin size={14} color={variant==='outline'?'#111':'#fff'} /> : children}
    </button>
  );
}

// ── INPUT ────────────────────────────────────────────────────
export function Input({ label, error, className='', ...p }) {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#767676] mb-1.5"
          style={{ fontFamily: 'Syne, sans-serif' }}>{label}</label>
      )}
      <input
        {...p}
        className={`border-b py-3 text-sm bg-transparent outline-none transition-colors placeholder:text-[#ABABAB]
          ${error ? 'border-red-400 text-red-600' : 'border-[#E5E5E5] focus:border-[#111]'}`}
      />
      {error && <span className="text-[11px] text-red-500 mt-1">{error}</span>}
    </div>
  );
}

// ── CARD ─────────────────────────────────────────────────────
export function Card({ children, className='', onClick, hover }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#E5E5E5]
        ${hover ? 'cursor-pointer transition-all hover:border-[#111] hover:shadow-[var(--shadow-lg)]' : ''}
        ${className}`}>
      {children}
    </div>
  );
}

// ── AVATAR ───────────────────────────────────────────────────
export function Avatar({ name='?', size=44, color, className='' }) {
  const ini = name.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
  const bg  = color || '#111';
  return (
    <div className={`flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{ width:size, height:size, background:bg, fontFamily:'Syne,sans-serif', fontSize:size*.38 }}>
      {ini}
    </div>
  );
}

// ── SPINNER ──────────────────────────────────────────────────
export function Spin({ size=24, color='#E8590A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation:'spin .7s linear infinite', flexShrink:0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity=".2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── PAGE LOADER ──────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
      <div className="text-3xl font-extrabold tracking-tighter mb-4" style={{ fontFamily:'Syne,sans-serif' }}>
        AIDE<span style={{ color:'#E8590A' }}>CI</span>
      </div>
      <Spin size={28} />
    </div>
  );
}

// ── MODAL ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-white w-full max-w-md shadow-[var(--shadow-lg)] animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]">
          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily:'Syne,sans-serif' }}>{title}</h3>
          <button onClick={onClose} className="text-[#767676] hover:text-[#111] text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── BADGE ────────────────────────────────────────────────────
export function Badge({ children, color='dark', className='' }) {
  const C = {
    dark:   'bg-[#111] text-white',
    orange: 'bg-[#FFF4EE] text-[#E8590A]',
    green:  'bg-[#EAF5EE] text-[#2D9B57]',
    gray:   'bg-[#E5E5E5] text-[#767676]',
    red:    'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${C[color]} ${className}`}
      style={{ fontFamily:'Syne,sans-serif' }}>{children}</span>
  );
}

// ── STARS ────────────────────────────────────────────────────
export function Stars({ value=0, max=5, size=13, interactive, onChange }) {
  return (
    <span style={{ fontSize:size, letterSpacing:2 }}>
      {Array.from({length:max},(_,i) => (
        <span key={i}
          onClick={() => interactive && onChange && onChange(i+1)}
          style={{ color: i<Math.round(value) ? '#E8590A' : '#E5E5E5', cursor: interactive ? 'pointer' : 'default' }}>
          ★
        </span>
      ))}
    </span>
  );
}

// ── EMPTY ────────────────────────────────────────────────────
export function Empty({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-8 h-px bg-[#E5E5E5] mb-8"/>
      <p className="text-sm font-bold uppercase tracking-widest text-[#111] mb-2"
        style={{ fontFamily:'Syne,sans-serif' }}>{title}</p>
      {subtitle && <p className="text-xs text-[#767676]">{subtitle}</p>}
    </div>
  );
}

// ── NOTIF BELL ───────────────────────────────────────────────
export function NotifBell({ count=0, onClick }) {
  return (
    <button onClick={onClick} className="relative w-10 h-10 flex items-center justify-center border border-[#E5E5E5] hover:border-[#111] transition-colors">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E8590A] text-white text-[9px] font-bold flex items-center justify-center"
          style={{ fontFamily:'Syne,sans-serif' }}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

// ── LAST SEEN ────────────────────────────────────────────────
export function lastSeen(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)    return 'A l\'instant';
  if (s < 3600)  return `Il y a ${Math.round(s/60)} min`;
  if (s < 86400) return `Il y a ${Math.round(s/3600)} h`;
  return `Il y a ${Math.round(s/86400)} j`;
}
