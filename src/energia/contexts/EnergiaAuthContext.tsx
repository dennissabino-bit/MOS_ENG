import { createContext, useContext } from 'react';
import type { EnergiaUsuario } from '../types';

interface EnergiaAuthState {
  user: EnergiaUsuario;
  loading: false;
  error: null;
  login: () => Promise<boolean>;
  logout: () => void;
  isAdmin: true;
}

// Portal mode: Energia runs as part of the main portal — no separate login required.
// All energy features are accessible with admin-level access.
const PORTAL_USER: EnergiaUsuario = {
  id: 'portal',
  nome: 'Portal',
  email: '',
  senha_hash: '',
  perfil: 'admin',
  unidade_id: null,
  ativo: true,
  created_at: new Date().toISOString(),
};

const PORTAL_AUTH: EnergiaAuthState = {
  user: PORTAL_USER,
  loading: false,
  error: null,
  isAdmin: true,
  login: async () => true,
  logout: () => {},
};

const EnergiaAuthContext = createContext<EnergiaAuthState>(PORTAL_AUTH);

export function EnergiaAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <EnergiaAuthContext.Provider value={PORTAL_AUTH}>
      {children}
    </EnergiaAuthContext.Provider>
  );
}

export function useEnergiaAuth(): EnergiaAuthState {
  return useContext(EnergiaAuthContext);
}
