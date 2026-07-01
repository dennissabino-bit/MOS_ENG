import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, DoorOpen, Zap, Users, FileText, LogOut,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { usePendencias } from '../hooks/usePendencias';

interface EnergiaLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

interface TabDef {
  to: string;
  label: string;
  icon: React.ElementType;
  adminOnly: boolean;
}

const ENERGIA_TABS: TabDef[] = [
  { to: '/energia/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { to: '/energia/unidades',  label: 'Unidades',  icon: Building2,       adminOnly: true  },
  { to: '/energia/salas',     label: 'Salas',     icon: DoorOpen,        adminOnly: false },
  { to: '/energia/medicoes',  label: 'Medições',  icon: Zap,             adminOnly: false },
  { to: '/energia/relatorios',label: 'Relatórios',icon: FileText,        adminOnly: false },
  { to: '/energia/usuarios',  label: 'Usuários',  icon: Users,           adminOnly: true  },
];

function EnergiaTabsBar() {
  const { user, isAdmin, logout } = useEnergiaAuth();
  const { pendentes } = usePendencias(user, isAdmin);
  const location = useLocation();
  const navigate = useNavigate();

  const visible = ENERGIA_TABS.filter(t => !t.adminOnly || isAdmin);

  function handleLogout() {
    logout();
    navigate('/energia/login');
  }

  return (
    <div className="sticky top-0 z-10 bg-surface-0 border-b border-surface-2 flex items-center">
      <div className="flex flex-1 overflow-x-auto">
        {visible.map(tab => {
          const isActive =
            location.pathname === tab.to ||
            location.pathname.startsWith(tab.to + '/');
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`
                flex items-center gap-2 px-4 py-3 font-body text-sm font-medium
                border-b-2 transition-colors whitespace-nowrap
                ${isActive
                  ? 'border-mos-700 text-mos-700'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-surface-3'
                }
              `}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
              {tab.label}
              {tab.to === '/energia/medicoes' && pendentes.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-status-error text-white font-data text-[10px] font-bold">
                  {pendentes.length}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Logout Energia */}
      <button
        onClick={handleLogout}
        title="Sair do módulo Energia"
        className="flex items-center gap-1.5 px-3 py-2 mx-2 rounded-lg font-body text-xs text-text-tertiary hover:text-status-error hover:bg-surface-2 transition-colors flex-shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
        Sair
      </button>
    </div>
  );
}

export function EnergiaLayout({ title, subtitle, children }: EnergiaLayoutProps) {
  return (
    <AppLayout title={title} subtitle={subtitle}>
      <EnergiaTabsBar />
      {children}
    </AppLayout>
  );
}
