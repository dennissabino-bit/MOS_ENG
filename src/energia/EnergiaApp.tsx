import { Routes, Route, Navigate } from 'react-router-dom';
import { EnergiaAuthProvider } from './contexts/EnergiaAuthContext';
import EnergiaDashboard from './pages/EnergiaDashboard';
import Unidades from './pages/Unidades';
import UnidadeDetalhe from './pages/UnidadeDetalhe';
import Salas from './pages/Salas';
import SalaDetalhe from './pages/SalaDetalhe';
import Medicoes from './pages/Medicoes';
import Usuarios from './pages/Usuarios';
import Relatorios from './pages/Relatorios';

function EnergiaRoutes() {
  return (
    <Routes>
      <Route path="/dashboard"     element={<EnergiaDashboard />} />
      <Route path="/unidades"      element={<Unidades />} />
      <Route path="/unidades/:id"  element={<UnidadeDetalhe />} />
      <Route path="/salas"         element={<Salas />} />
      <Route path="/salas/:id"     element={<SalaDetalhe />} />
      <Route path="/medicoes"      element={<Medicoes />} />
      <Route path="/relatorios"    element={<Relatorios />} />
      <Route path="/usuarios"      element={<Usuarios />} />
      <Route path="*"              element={<Navigate to="/energia/dashboard" replace />} />
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
