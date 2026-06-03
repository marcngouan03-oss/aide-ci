import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [token,   setToken]   = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authAPI.me()
        .then(r => { setUser(r.data.user); localStorage.setItem('user', JSON.stringify(r.data.user)); })
        .catch(() => { localStorage.clear(); setToken(null); setUser(null); })
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const r = await authAPI.login({ email, password });
    localStorage.setItem('token', r.data.token);
    localStorage.setItem('user',  JSON.stringify(r.data.user));
    setToken(r.data.token); setUser(r.data.user);
    return r.data.user;
  }, []);

  const register = useCallback(async (data) => {
    const r = await authAPI.register(data);
    localStorage.setItem('token', r.data.token);
    localStorage.setItem('user',  JSON.stringify(r.data.user));
    setToken(r.data.token); setUser(r.data.user);
    return r.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.clear(); setToken(null); setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const r = await authAPI.me();
    setUser(r.data.user); localStorage.setItem('user', JSON.stringify(r.data.user));
  }, []);

  return (
    <Ctx.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}
export const useAuth = () => useContext(Ctx);
