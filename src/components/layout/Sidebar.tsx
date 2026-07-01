import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Truck,
  FileText,
  Users,
  Plus,
  Zap,
  CalendarDays,
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

const navSections = [
  {
    label: 'OBRAS',
    items: [
      { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/obras',   icon: Building2,        label: 'Obras'     },
      { to: '/diarias', icon: CalendarDays,     label: 'Controle de Diárias' },
    ],
  },
  {
    label: 'SUPRIMENTOS',
    items: [
      { to: '/fornecedores', icon: Truck,     label: 'Fornecedores' },
      { to: '/cotacoes',     icon: FileText,  label: 'Cotações'     },
    ],
  },
  {
    label: 'ADMINISTRAÇÃO',
    items: [
      { to: '/usuarios', icon: Users, label: 'Usuários' },
    ],
  },
  {
    label: 'MÓDULOS',
    items: [
      { to: '/energia', icon: Zap, label: 'Energia' },
    ],
  },
];

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-2">
          <div className="w-8 h-8 bg-mos-700 rounded-md flex items-center justify-center flex-shrink-0">
            <Plus className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-text-primary leading-tight">MOS</p>
            <p className="font-body text-[10px] text-text-tertiary leading-tight tracking-wide">GESTOR DE OBRAS</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-body font-semibold text-text-tertiary tracking-widest px-3 mb-1.5">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => {
                  const isActive = to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(to);
                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={onMobileClose}
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
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isActive ? 'rotate-0' : 'group-hover:rotate-6'}`}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        {label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-surface-2">
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
