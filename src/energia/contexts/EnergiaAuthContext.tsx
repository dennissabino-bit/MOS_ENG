import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { EnergiaUsuario } from '../types';

interface EnergiaAuthState {
  user: EnergiaUsuario | null;
  loading: boolean;
  error: string | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const EnergiaAuthContext = createContext<EnergiaAuthState | null>(null);

const STORAGE_KEY = 'energia_user_id';

export function EnergiaAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<EnergiaUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('energia_usuarios')
      .select('*')
      .eq('id', userId)
      .eq('ativo', true)
      .maybeSingle();
    if (data) {
      setUser(data as EnergiaUsuario);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      loadUser(storedId).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  const login = useCallback(async (email: string, senha: string): Promise<boolean> => {
    setError(null);
    const { data } = await supabase
      .from('energia_usuarios')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('senha_hash', senha)
      .eq('ativo', true)
      .maybeSingle();

    if (!data) {
      setError('Email ou senha inválidos');
      return false;
    }

    const usuario = data as EnergiaUsuario;
    setUser(usuario);
    localStorage.setItem(STORAGE_KEY, usuario.id);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isAdmin = user?.perfil === 'admin';

  return (
    <EnergiaAuthContext.Provider value={{ user, loading, error, login, logout, isAdmin }}>
      {children}
    </EnergiaAuthContext.Provider>
  );
}

export function useEnergiaAuth(): EnergiaAuthState {
  const ctx = useContext(EnergiaAuthContext);
  if (!ctx) throw new Error('useEnergiaAuth must be used within EnergiaAuthProvider');
  return ctx;
}
