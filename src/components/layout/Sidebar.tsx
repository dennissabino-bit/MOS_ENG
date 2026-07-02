import { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Plus,
  Zap,
  CalendarDays,
  PhoneCall,
  ClipboardCheck,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { RoleBadge } from '../ui/Badge';
import type { UserCargo } from '../../lib/database.types';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const currentUser = {
  nome: 'Diego Esteves',
  cargo: 'administrador' as UserCargo,
  iniciais: 'DE',
  role: 'Administrador',
};

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  exact?: boolean;
}

const MAIN_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
];

const OBRAS_ITEMS: NavItem[] = [
  { to: '/obras',    icon: Building2,    label: 'Obras'           },
  { to: '/diarias',  icon: CalendarDays, label: 'Controle de Diárias' },
  { to: '/cotacoes', icon: FileText,     label: 'Cotações'        },
];

const MODULE_ITEMS: NavItem[] = [
  { to: '/imoveis',  icon: Zap,            label: 'Imóveis'   },
  { to: '/chamados', icon: PhoneCall,       label: 'Chamados',  badge: 'Em breve' },
  { to: '/checklist',icon: ClipboardCheck, label: 'Checklist', badge: 'Em breve' },
];

const SECTIONS = [
  { label: 'PAINEL',   items: MAIN_ITEMS  },
  { label: 'PROJETOS', items: OBRAS_ITEMS },
  { label: 'MÓDULOS',  items: MODULE_ITEMS },
];

function NavItemEl({ item, onClose }: { item: NavItem; onClose?: () => void }) {
  const location = useLocation();
  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);

  if (item.badge) {
    return (
      <li>
        <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body font-medium text-text-disabled cursor-not-allowed select-none">
          <item.icon className="w-4 h-4 flex-shrink-0 opacity-40" strokeWidth={1.8} />
          <span className="flex-1">{item.label}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-surface-2 text-text-tertiary">
            {item.badge}
          </span>
        </span>
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={item.to}
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
        <item.icon
          className="w-4 h-4 flex-shrink-0"
          strokeWidth={isActive ? 2.2 : 1.8}
        />
        {item.label}
      </NavLink>
    </li>
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isConfigActive = location.pathname.startsWith('/configuracoes');

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-[188px] bg-surface-0 border-r border-surface-2
          flex flex-col z-50 transition-transform duration-300
          lg:translate-x-0 lg:static lg:z-auto
          ${mobileOpen ? 'translate-x-0 animate-slide-in' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-2 flex-shrink-0">
          <div className="w-8 h-8 bg-mos-700 rounded-md flex items-center justify-center flex-shrink-0">
            <Plus className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-text-primary leading-tight">MOS</p>
            <p className="font-body text-[10px] text-text-tertiary leading-tight tracking-wide">GESTOR DE OBRAS</p>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-body font-semibold text-text-tertiary tracking-widest px-3 mb-1.5">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItemEl key={item.to} item={item} onClose={onMobileClose} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Configurações — pinned bottom */}
        <div className="px-3 pb-1 flex-shrink-0">
          <Link
            to="/configuracoes"
            onClick={onMobileClose}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm
              font-body font-medium transition-all duration-200
              ${isConfigActive
                ? 'bg-mos-50 text-mos-700 border-l-2 border-mos-700 pl-[10px]'
                : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              }
            `}
          >
            <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={isConfigActive ? 2.2 : 1.8} />
            <span className="flex-1">Configurações</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </Link>
        </div>

        {/* User */}
        <div className="px-3 py-3 border-t border-surface-2 flex-shrink-0">
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors duration-150"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className="w-7 h-7 rounded-full bg-mos-700 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-[10px] text-white">{currentUser.iniciais}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-body font-semibold text-xs text-text-primary truncate">{currentUser.nome.split(' ')[0]}</p>
              <p className="font-body text-[10px] text-text-tertiary truncate">{currentUser.role}</p>
            </div>
            <div className="flex-shrink-0">
              <RoleBadge cargo={currentUser.cargo} />
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
