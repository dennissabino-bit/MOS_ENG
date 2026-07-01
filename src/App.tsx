import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Obras from './pages/Obras';
import ObraDetail from './pages/ObraDetail';
import Fornecedores from './pages/Fornecedores';
import Cotacoes from './pages/Cotacoes';
import CotacaoComparativo from './pages/CotacaoComparativo';
import Usuarios from './pages/Usuarios';
import Diarias from './pages/Diarias';
import DiariaDetalhe from './pages/DiariaDetalhe';
import EnergiaApp from './energia/EnergiaApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<Dashboard />} />
        <Route path="/obras"          element={<Obras />} />
        <Route path="/obras/:id"      element={<ObraDetail />} />
        <Route path="/fornecedores"   element={<Fornecedores />} />
        <Route path="/cotacoes"       element={<Cotacoes />} />
        <Route path="/cotacoes/:id"   element={<CotacaoComparativo />} />
        <Route path="/usuarios"       element={<Usuarios />} />
        <Route path="/diarias"        element={<Diarias />} />
        <Route path="/diarias/:id"    element={<DiariaDetalhe />} />
        <Route path="/energia/*"      element={<EnergiaApp />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

