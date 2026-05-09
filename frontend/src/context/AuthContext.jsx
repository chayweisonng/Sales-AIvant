import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { setAccessToken } from '../lib/auth';
import { setSupabaseRealtimeAuth, supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const { data } = await api.get('/api/auth/session');
        setUser(data.user || null);
        setCompany(data.company || null);
        setAccessTokenState(data.accessToken || null);
      } catch (error) {
        setAccessToken(null);
        setUser(null);
        setCompany(null);
        setAccessTokenState(null);
        if (error?.response?.status !== 401) {
          window.sessionStorage.setItem('auth_expired_msg', 'Your session has expired. Please log in again.');
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrapSession();
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setAccessToken(null);
      setUser(null);
      setCompany(null);
      setAccessTokenState(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    setSupabaseRealtimeAuth(accessToken).catch((err) => {
      console.error('Failed to set Supabase realtime auth:', err);
    });
  }, [accessToken]);


  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });

    setAccessToken(data.accessToken || null);
    setUser(data.user || null);
    setCompany(data.company || null);
    setAccessTokenState(data.accessToken || null);

    return data;
  };

  const signup = async (email, password, companyName) => {
    const { data } = await api.post('/api/auth/signup', { email, password, companyName });

    if (data.user) {
      setAccessToken(data.accessToken || null);
      setUser(data.user || null);
      setCompany(data.company || null);
      setAccessTokenState(data.accessToken || null);
    }

    return data;
  };

  const forgotPassword = async (email) => {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      throw error;
    }

    return { message: 'Password reset link sent successfully' };
  };

  const resetPassword = async (password) => {
    const { data } = await api.post('/api/auth/reset-password', { password });
    return data;
  };

  const exchangeResetCode = async (code) => {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session?.access_token) {
      throw error || new Error('Failed to exchange authorization code');
    }

    await api.post('/api/auth/session-cookie', { accessToken: data.session.access_token });
    const sessionData = await fetchSession();
    return {
      ...sessionData,
      accessToken: data.session.access_token,
    };
  };

  const fetchSession = async () => {
    try {
      const { data } = await api.get('/api/auth/session');
      if (data.accessToken) setAccessToken(data.accessToken);
      setUser(data.user || null);
      setCompany(data.company || null);
      setAccessTokenState(data.accessToken || null);
      return data;
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      setCompany(null);
      setAccessTokenState(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (_error) {
      // Clear local state even if the remote session has already expired.
    } finally {
      setAccessToken(null);
      setUser(null);
      setCompany(null);
      setAccessTokenState(null);
      setLoading(false);
    }
  };

  const value = useMemo(() => ({
    user,
    company,
    accessToken,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    exchangeResetCode,
    fetchSession,
  }), [company, loading, user, accessToken]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
