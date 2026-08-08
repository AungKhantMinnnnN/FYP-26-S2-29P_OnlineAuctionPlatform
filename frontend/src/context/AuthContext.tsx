/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  balance: number;
  email_verified: boolean;
  subscription_tier: string;
  subscription_expires_at?: string | null;
  profile?: {
    full_name: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    bio?: string;
    email_alerts_enabled?: boolean;
    marketing_emails_enabled?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: string | undefined;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    fullName: string,
    username: string,
    email: string,
    password: string,
    phone?: string,
    address?: string,
    bio?: string,
    city?: string,
    country?: string,
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
  adjustBalance: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    setUser(null);
    queryClient.clear();
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Clearing local state is what matters for the UI; a failed request just leaves
      // a cookie the server will reject as expired anyway.
      console.error('Logout request failed:', error);
    }
  }, [queryClient]);

  useEffect(() => {
    // Session lives in an httpOnly cookie, so the only way to check login state is to ask
    // the server. A 401 here just means "not logged in," not an error to surface.
    let isMounted = true;
    apiClient.get<User>('/auth/get_current_user')
      .then((response) => {
        if (isMounted) setUser(response.data);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    setLoading(true);
    try {
      // The response also sets the httpOnly session cookie -- nothing to store client-side.
      await apiClient.post('/auth/login', {
        username_or_email: usernameOrEmail,
        password: password,
      });
      const profileResponse = await apiClient.get<User>('/auth/get_current_user');
      queryClient.clear();
      setUser(profileResponse.data);
      setLoading(false);
      navigate('/dashboard');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [navigate, queryClient]);

  const register = useCallback(async (
    fullName: string,
    username: string,
    email: string,
    password: string,
    phone?: string,
    address?: string,
    bio?: string,
    city?: string,
    country?: string,
  ) => {
    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        full_name: fullName,
        username: username,
        email: email,
        password: password,
        phone: phone || '',
        address: address || '',
        bio: bio || '',
        city: city || '',
        country: country || '',
      });
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiClient.get<User>('/auth/get_current_user');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  }, [user]);

  const adjustBalance = useCallback((amount: number) => {
    setUser((current) => {
      if (!current) return current;
      const nextBalance = Number(((current.balance ?? 0) + amount).toFixed(2));
      return { ...current, balance: nextBalance };
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, role: user?.role, login, logout, register, refreshUser, adjustBalance }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
