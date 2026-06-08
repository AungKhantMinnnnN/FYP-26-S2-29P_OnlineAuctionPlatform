/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  balance: number;
  profile?: {
    full_name: string;
    phone?: string;
    address?: string;
    bio?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: string | undefined;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => void;
  register: (
    fullName: string,
    username: string,
    email: string,
    password: string,
    phone?: string,
    address?: string,
    bio?: string
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
  adjustBalance: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(() => !!sessionStorage.getItem('token'));
  const navigate = useNavigate();

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;
    if (token) {
      apiClient.get<User>('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then((response) => {
        if (isMounted) {
          setUser(response.data);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch user profile:', error);
        if (isMounted) {
          logout();
          setLoading(false);
        }
      });
    } else {
      Promise.resolve().then(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [token, logout]);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post<{ access_token: string; token_type: string }>('/auth/login', {
        username_or_email: usernameOrEmail,
        password: password,
      });
      const newToken = response.data.access_token;
      sessionStorage.setItem('token', newToken);
      setToken(newToken);
      
      const profileResponse = await apiClient.get<User>('/auth/me', {
        headers: {
          Authorization: `Bearer ${newToken}`
        }
      });
      setUser(profileResponse.data);
      setLoading(false);
      navigate('/dashboard');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [navigate]);

  const register = useCallback(async (
    fullName: string,
    username: string,
    email: string,
    password: string,
    phone?: string,
    address?: string,
    bio?: string
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
      });
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (token) {
      try {
        const response = await apiClient.get<User>('/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to refresh user profile:', error);
      }
    }
  }, [token]);

  const adjustBalance = useCallback((amount: number) => {
    setUser((current) => {
      if (!current) return current;
      const nextBalance = Number(((current.balance ?? 0) + amount).toFixed(2));
      return { ...current, balance: nextBalance };
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!user, role: user?.role, login, logout, register, refreshUser, adjustBalance }}>
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
