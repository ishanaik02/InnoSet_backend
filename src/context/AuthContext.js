import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginRequest, logoutRequest, getStoredUser } from '../services/authService';
import { destroyTracking, initializeTracking } from '../services/backgroundLocationService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const stored = await getStoredUser();
      if (stored) setUser(stored);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (user) initializeTracking();
  }, [user]);

  const login = async (employeeId, password) => {
    setError(null);
    try {
      const data = await loginRequest(employeeId, password);
      setUser(data.user);
      return true;
    } catch (e) {
      setError(e?.response?.data?.message || 'Login failed. Check credentials.');
      return false;
    }
  };

  const logout = async () => {
    await destroyTracking();
    await logoutRequest();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
