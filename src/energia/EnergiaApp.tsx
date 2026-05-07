import { Routes, Route, Navigate } from 'react-router-dom';
import { EnergiaAuthProvider, useEnergiaAuth } from './contexts/EnergiaAuthContext';
import EnergiaLogin from './pages/EnergiaLogin';
import EnergiaDashboard from './pages/EnergiaDashboard';
import Unidades from './pages/Unidades';
import UnidadeDetalhe from './pages/UnidadeDetalhe';
import Salas from './pages/Salas';
import SalaDetalhe from './pages/SalaDetalhe';
import Medicoes from './pages/Medicoes';
import Usuarios from './pages/Usuarios';

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useEnergiaAuth();

  if (loading) return <div className="min-h-screen bg-surface-1 flex items-center justify-center"><div className="skeleton w-16 h-16 rounded-full" /></div>;
  if (!user) return <Navigate to="/energia/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/energia/dashboard" replace />;
  return <>{children}</>;
}

function EnergiaRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<EnergiaLogin />} />
      <Route path="/dashboard" element={<ProtectedRoute><EnergiaDashboard /></ProtectedRoute>} />
      <Route path="/unidades" element={<ProtectedRoute adminOnly><Unidades /></ProtectedRoute>} />
      <Route path="/unidades/:id" element={<ProtectedRoute adminOnly><UnidadeDetalhe /></ProtectedRoute>} />
      <Route path="/salas" element={<ProtectedRoute><Salas /></ProtectedRoute>} />
      <Route path="/salas/:id" element={<ProtectedRoute><SalaDetalhe /></ProtectedRoute>} />
      <Route path="/medicoes" element={<ProtectedRoute><Medicoes /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/energia/dashboard" replace />} />
    </Routes>
  );
}

export default function EnergiaApp() {
  return (
    <EnergiaAuthProvider>
      <EnergiaRoutes />
    </EnergiaAuthProvider>
  );
}
