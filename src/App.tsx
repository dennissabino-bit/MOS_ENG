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
import Chamados from './pages/Chamados';
import Checklist from './pages/Checklist';
import Configuracoes from './pages/Configuracoes';
import EnergiaApp from './energia/EnergiaApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Principal */}
        <Route path="/"                 element={<Dashboard />} />

        {/* Projetos */}
        <Route path="/obras"            element={<Obras />} />
        <Route path="/obras/:id"        element={<ObraDetail />} />
        <Route path="/diarias"          element={<Diarias />} />
        <Route path="/diarias/:id"      element={<DiariaDetalhe />} />
        <Route path="/cotacoes"         element={<Cotacoes />} />
        <Route path="/cotacoes/:id"     element={<CotacaoComparativo />} />

        {/* Módulos */}
        <Route path="/imoveis/*"        element={<EnergiaApp />} />
        <Route path="/energia/*"        element={<EnergiaApp />} />
        <Route path="/chamados"         element={<Chamados />} />
        <Route path="/checklist"        element={<Checklist />} />

        {/* Configurações */}
        <Route path="/configuracoes"    element={<Configuracoes />} />

        {/* Rotas legadas — redirecionam para Configurações */}
        <Route path="/usuarios"         element={<Usuarios />} />
        <Route path="/fornecedores"     element={<Fornecedores />} />

        <Route path="*"                 element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
