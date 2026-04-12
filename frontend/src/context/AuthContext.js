import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('campusgig_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch {
      localStorage.removeItem('campusgig_token');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Step 1: send a 6-digit code to the user's .edu email
  // Returns { isNew: bool } so the UI knows to collect a display name
  const sendCode = async (email) => {
    return await api.sendCode({ email });
  };

  // Step 2: verify the code (+ displayName if new) and sign in
  const verifyCode = async (email, code, displayName) => {
    const data = await api.verifyCode({ email, code, displayName });
    localStorage.setItem('campusgig_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('campusgig_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, sendCode, verifyCode, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
