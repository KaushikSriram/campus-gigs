import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

const UNIVERSITY_KEY = 'campusgig_university';
const TOKEN_KEY = 'campusgig_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [university, setUniversityState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCallback, setLoginCallback] = useState(null);

  // Load saved university and user on mount
  useEffect(() => {
    const savedUniversity = localStorage.getItem(UNIVERSITY_KEY);
    if (savedUniversity) {
      setUniversityState(savedUniversity);
    }
    loadUser();
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user);
      // Sync university from user profile
      if (data.user?.university) {
        setUniversityState(data.user.university);
        localStorage.setItem(UNIVERSITY_KEY, data.user.university);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
    setLoading(false);
  }, []);

  const setUniversity = (uni) => {
    setUniversityState(uni);
    localStorage.setItem(UNIVERSITY_KEY, uni);
  };

  // Step 1: send a 6-digit code to the user's .edu email
  const sendCode = async (email) => {
    return await api.sendCode({ email });
  };

  // Step 2: verify the code (+ displayName if new) and sign in
  const verifyCode = async (email, code, displayName) => {
    const data = await api.verifyCode({ email, code, displayName });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    if (data.user?.university) {
      setUniversity(data.user.university);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
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

  // Require login for an action - shows modal and calls callback on success
  const requireLogin = (callback) => {
    if (user) {
      callback();
      return;
    }
    setLoginCallback(() => callback);
    setShowLoginModal(true);
  };

  const onLoginSuccess = () => {
    setShowLoginModal(false);
    if (loginCallback) {
      loginCallback();
      setLoginCallback(null);
    }
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginCallback(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      university,
      loading,
      setUniversity,
      sendCode,
      verifyCode,
      logout,
      refreshUser,
      requireLogin,
      showLoginModal,
      onLoginSuccess,
      closeLoginModal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
