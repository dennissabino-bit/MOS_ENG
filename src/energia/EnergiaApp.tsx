import { Routes, Route, Navigate } from 'react-router-dom';
import { EnergiaAuthProvider } from './contexts/EnergiaAuthContext';
import EnergiaDashboard from './pages/EnergiaDashboard';
import Unidades from './pages/Unidades';
import UnidadeDetalhe from './pages/UnidadeDetalhe';
import Salas from './pages/Salas';
import SalaDetalhe from './pages/SalaDetalhe';
import Medicoes from './pages/Medicoes';
import Alugueis from './pages/Alugueis';
import Faturas from './pages/Faturas';
import Relatorios from './pages/Relatorios';
import EnergiaConfiguracoes from './pages/EnergiaConfiguracoes';
import Cadastro from './pages/Cadastro';

function EnergiaRoutes() {
  return (
    <Routes>
      <Route path="/dashboard"      element={<EnergiaDashboard />} />
      <Route path="/unidades"       element={<Unidades />} />
      <Route path="/unidades/:id"   element={<UnidadeDetalhe />} />
      <Route path="/salas"          element={<Salas />} />
      <Route path="/salas/:id"      element={<SalaDetalhe />} />
      <Route path="/medicoes"       element={<Medicoes />} />
      <Route path="/alugueis"       element={<Alugueis />} />
      <Route path="/faturas"        element={<Faturas />} />
      <Route path="/relatorios"     element={<Relatorios />} />
      <Route path="/cadastro"       element={<Cadastro />} />
      <Route path="/configuracoes"  element={<EnergiaConfiguracoes />} />
      <Route path="*"               element={<Navigate to="/imoveis/dashboard" replace />} />
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
