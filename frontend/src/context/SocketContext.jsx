import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);

// Créer un son de notification via Web Audio API
function playNotifSound(type = 'message') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = type === 'paiement' ? 880 : type === 'message' ? 660 : 440;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    // Vibration mobile
    if (navigator.vibrate) navigator.vibrate(type === 'paiement' ? [200, 100, 200] : [100]);
  } catch {}
}

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const ref = useRef(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) return;
    const URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', e => console.warn('Socket:', e.message));

    // Notifications initiales (non lues)
    socket.on('notifications_init', (notifs) => {
      setNotifications(notifs);
      setUnread(notifs.length);
      if (notifs.length > 0) playNotifSound('systeme');
    });

    // Nouvelle notification en temps réel
    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      setUnread(prev => prev + 1);
      playNotifSound(notif.type);
    });

    // Son sur nouveau message
    socket.on('play_sound', ({ type }) => playNotifSound(type));

    ref.current = socket;
    return () => { socket.disconnect(); ref.current = null; setConnected(false); };
  }, [token]);

  const emit = (ev, d) => ref.current?.emit(ev, d);
  const on   = (ev, cb) => { ref.current?.on(ev, cb); };
  const off  = (ev, cb) => { ref.current?.off(ev, cb); };

  const clearUnread = useCallback(() => setUnread(0), []);

  return (
    <Ctx.Provider value={{ socket: ref.current, connected, emit, on, off, notifications, unread, clearUnread, playNotifSound }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSocket = () => useContext(Ctx);
