import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, DoorOpen, Zap, LogOut, Menu, Plus, Users, FileText } from 'lucide-react';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { usePendencias } from '../hooks/usePendencias';

interface EnergiaLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const NAV_SECTIONS = [
  {
    label: 'VISÃO GERAL',
    items: [
      { to: '/energia/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
    ],
  },
  {
    label: 'ESTRUTURA',
    items: [
      { to: '/energia/unidades',  icon: Building2, label: 'Unidades',  adminOnly: true  },
      { to: '/energia/salas',     icon: DoorOpen,  label: 'Salas',     adminOnly: false },
      { to: '/energia/usuarios',  icon: Users,     label: 'Usuários',  adminOnly: true  },
    ],
  },
  {
    label: 'OPERACIONAL',
    items: [
      { to: '/energia/medicoes', icon: Zap, label: 'Medições', adminOnly: false },
      { to: '/energia/relatorios', icon: FileText, label: 'Relatórios', adminOnly: false },
    ],
  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout, isAdmin } = useEnergiaAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { pendentes } = usePendencias(user, isAdmin);

  function handleLogout() {
    logout();
    navigate('/energia/login');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-2">
        <div className="w-8 h-8 bg-mos-700 rounded-md flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-display font-bold text-sm text-text-primary leading-tight">Energia</p>
          <p className="font-body text-[10px] text-text-tertiary leading-tight tracking-wide">CONTROLE DE MEDIÇÕES</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_SECTIONS.map(section => {
          const visibleItems = isAdmin ? section.items : section.items.filter(i => !i.adminOnly);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              <p className="text-[10px] font-body font-semibold text-text-tertiary tracking-widest px-3 mb-1.5">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label }) => {
                  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={onClose}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                          font-body font-medium cursor-pointer
                          transition-all duration-200 ease-out
                          ${isActive
                            ? 'bg-mos-50 text-mos-700 border-l-2 border-mos-700 pl-[10px]'
                            : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                        <span className="flex-1">{label}</span>
                        {to === '/energia/medicoes' && pendentes.length > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-status-error text-white font-data text-[10px] font-bold">
                            {pendentes.length}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-surface-2 space-y-0.5">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-mos-700 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-[10px] text-white">
              {user?.nome?.slice(0, 2).toUpperCase() ?? 'US'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body font-semibold text-xs text-text-primary truncate">{user?.nome?.split(' ')[0]}</p>
            <p className="font-body text-[10px] text-text-tertiary capitalize">{user?.perfil}</p>
          </div>
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${
            isAdmin ? 'bg-mos-50 text-mos-700' : 'bg-status-infoLight text-status-info'
          }`}>
            {isAdmin ? 'ADMIN' : 'GERENTE'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors duration-150 font-body text-sm font-medium"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.8} />
          Sair
        </button>
      </div>
    </div>
  );
}

export function EnergiaLayout({ title, subtitle, children }: EnergiaLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface-1 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-[188px] bg-surface-0 border-r border-surface-2
          flex flex-col z-50 transition-transform duration-300
          lg:translate-x-0 lg:static lg:z-auto
          ${mobileOpen ? 'translate-x-0 animate-slide-in' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-surface-0 border-b border-surface-2 flex items-center px-6 gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-surface-2 transition-colors mr-1"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-base text-text-primary leading-tight truncate">{title}</h1>
            {subtitle && <p className="font-body text-xs text-text-tertiary truncate">{subtitle}</p>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
