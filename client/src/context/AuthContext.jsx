import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sh_user') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('sh_token', res.token);
      localStorage.setItem('sh_user', JSON.stringify(res.data));
      setUser(res.data);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sh_token');
    localStorage.removeItem('sh_user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('sh_token');
    if (token && !user) {
      authApi
        .me()
        .then((res) => {
          localStorage.setItem('sh_user', JSON.stringify(res.data));
          setUser(res.data);
        })
        .catch(() => logout());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
