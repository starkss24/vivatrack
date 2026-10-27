import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api';
import { setUnauthorizedHandler } from '../api/http';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me().then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false));
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await authApi.login(email, password);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { setUser(null); }
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
