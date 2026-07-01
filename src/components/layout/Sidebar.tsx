import { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Plus,
  Zap,
  CalendarDays,
  PhoneCall,
  ClipboardCheck,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavLeaf {
  kind: 'leaf';
  to: string;
  label: string;
  exact?: boolean;
  soon?: false;
}

interface NavSoon {
  kind: 'soon';
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  kind: 'group';
  id: string;
  label: string;
  icon: React.ElementType;
  children: NavLeaf[];
}

interface NavModule {
  kind: 'module';
  to: string;
  label: string;
  icon: React.ElementType;
  color: string;     // Tailwind bg color for icon bg
  textColor: string; // Tailwind text color for icon
  exact?: boolean;
}

type NavNode = NavLeaf | NavGroup | NavModule | NavSoon;

// ─── Nav definition ───────────────────────────────────────────────────────────

const OVERVIEW: NavLeaf[] = [
  { kind: 'leaf', to: '/', label: 'Dashboard', exact: true },
];

const PROJECTS: NavGroup = {
  kind: 'group',
  id: 'projetos',
  label: 'Projetos',
  icon: Building2,
  children: [
    { kind: 'leaf', to: '/obras',    label: 'Obras'                },
    { kind: 'leaf', to: '/diarias',  label: 'Controle de Diárias'  },
    { kind: 'leaf', to: '/cotacoes', label: 'Cotações'              },
  ],
};

const MODULES: NavNode[] = [
  {
    kind: 'module',
    to: '/energia/dashboard',
    label: 'Energia',
    icon: Zap,
    color: 'bg-amber-100',
    textColor: 'text-amber-600',
  },
  { kind: 'soon', label: 'Chamados',  icon: PhoneCall      },
  { kind: 'soon', label: 'Checklist', icon: ClipboardCheck },
];

// ─── Leaf item ────────────────────────────────────────────────────────────────

function LeafItem({ item, depth = 0, onClose }: { item: NavLeaf; depth?: number; onClose?: () => void }) {
  const location = useLocation();
  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);

  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={`
        flex items-center gap-2 rounded-lg transition-all duration-150
        font-body text-sm font-medium
        ${depth > 0 ? 'py-1.5 pl-8 pr-3' : 'py-2 px-3'}
        ${isActive
          ? 'bg-mos-50 text-mos-700 border-l-2 border-mos-700 ' + (depth > 0 ? 'pl-[30px]' : 'pl-[10px]')
          : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
        }
      `}
    >
      {depth === 0 && (
        <LayoutDashboard
          className="w-4 h-4 flex-shrink-0"
          strokeWidth={isActive ? 2.2 : 1.8}
        />
      )}
      {depth > 0 && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-mos-700' : 'bg-text-disabled'}`} />
      )}
      {item.label}
    </NavLink>
  );
}

// ─── Group item (collapsible) ─────────────────────────────────────────────────

function GroupItem({ group, onClose }: { group: NavGroup; onClose?: () => void }) {
  const location = useLocation();
  const isChildActive = group.children.some(c => location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(isChildActive);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
          font-body text-sm font-medium transition-colors duration-150
          ${isChildActive
            ? 'text-mos-700 bg-mos-50/60'
            : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
          }
        `}
      >
        <group.icon
          className="w-4 h-4 flex-shrink-0"
          strokeWidth={isChildActive ? 2.2 : 1.8}
        />
        <span className="flex-1 text-left">{group.label}</span>
        {open
          ? <ChevronDown className="w-3 h-3 flex-shrink-0 text-text-tertiary" />
          : <ChevronRight className="w-3 h-3 flex-shrink-0 text-text-tertiary" />
        }
      </button>

      <div className={`overflow-hidden transition-all duration-200 ease-out ${open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="mt-0.5 space-y-0.5">
          {group.children.map(child => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={onClose}
              className={({ isActive: active }) => `
                flex items-center gap-2 py-1.5 rounded-lg transition-all duration-150
                font-body text-sm font-medium
                ${(active || location.pathname.startsWith(child.to))
                  ? 'pl-[30px] pr-3 bg-mos-50 text-mos-700 border-l-2 border-mos-700'
                  : 'pl-8 pr-3 text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                }
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                location.pathname.startsWith(child.to) ? 'bg-mos-700' : 'bg-text-disabled'
              }`} />
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Module item ──────────────────────────────────────────────────────────────

function ModuleItem({ mod, onClose }: { mod: NavModule; onClose?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith('/energia');

  return (
    <NavLink
      to={mod.to}
      onClick={onClose}
      className={`
        flex items-center gap-2.5 px-3 py-2 rounded-lg
        font-body text-sm font-medium transition-all duration-150
        ${isActive
          ? 'bg-mos-50 text-mos-700 border-l-2 border-mos-700 pl-[10px]'
          : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
        }
      `}
    >
      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-mos-700' : mod.color}`}>
        <mod.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : mod.textColor}`} strokeWidth={2} />
      </div>
      {mod.label}
    </NavLink>
  );
}

// ─── Soon item ────────────────────────────────────────────────────────────────

function SoonItem({ item }: { item: NavSoon }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-not-allowed select-none">
      <div className="w-6 h-6 rounded-md bg-surface-2 flex items-center justify-center flex-shrink-0">
        <item.icon className="w-3.5 h-3.5 text-text-disabled" strokeWidth={1.8} />
      </div>
      <span className="flex-1 font-body text-sm text-text-disabled">{item.label}</span>
      <span className="font-body text-[9px] font-bold tracking-wider text-text-disabled bg-surface-2 px-1.5 py-0.5 rounded uppercase">
        Em breve
      </span>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const SECTION_LABEL = 'px-3 mb-1.5 font-body text-[10px] font-semibold text-text-disabled tracking-widest uppercase';

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const isConfigActive = location.pathname.startsWith('/configuracoes');

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-[200px] bg-surface-0 border-r border-surface-2
        flex flex-col z-50 transition-transform duration-300
        lg:translate-x-0 lg:static lg:z-auto
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-2 flex-shrink-0">
          <div className="w-8 h-8 bg-mos-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Plus className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="font-display font-extrabold text-sm text-text-primary leading-tight tracking-tight">MOS</p>
            <p className="font-body text-[9px] text-text-tertiary leading-tight tracking-widest uppercase">Gestor de Obras</p>
          </div>
        </div>

        {/* Nav scroll area */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">

          {/* Painel */}
          <div>
            <p className={SECTION_LABEL}>Painel</p>
            <LeafItem item={OVERVIEW[0]} onClose={onMobileClose} />
          </div>

          {/* Projetos */}
          <div>
            <p className={SECTION_LABEL}>Projetos</p>
            <GroupItem group={PROJECTS} onClose={onMobileClose} />
          </div>

          {/* Módulos */}
          <div>
            <p className={SECTION_LABEL}>Módulos</p>
            <div className="space-y-0.5">
              {MODULES.map((m, i) =>
                m.kind === 'module' ? (
                  <ModuleItem key={i} mod={m} onClose={onMobileClose} />
                ) : (
                  <SoonItem key={i} item={m as NavSoon} />
                )
              )}
            </div>
          </div>

        </nav>

        {/* Configurações — pinned */}
        <div className="px-3 py-2 border-t border-surface-2 flex-shrink-0">
          <Link
            to="/configuracoes"
            onClick={onMobileClose}
            className={`
              flex items-center gap-2.5 px-3 py-2 rounded-lg
              font-body text-sm font-medium transition-all duration-150
              ${isConfigActive
                ? 'bg-mos-50 text-mos-700 border-l-2 border-mos-700 pl-[10px]'
                : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              }
            `}
          >
            <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={isConfigActive ? 2.2 : 1.8} />
            <span className="flex-1">Configurações</span>
          </Link>
        </div>

        {/* User pill */}
        <div className="px-3 py-3 border-t border-surface-2 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-mos-700 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-[10px] text-white">DE</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-semibold text-xs text-text-primary truncate leading-tight">Diego Esteves</p>
              <p className="font-body text-[10px] text-text-tertiary truncate leading-tight">Administrador</p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-text-disabled flex-shrink-0" strokeWidth={1.8} />
          </div>
        </div>

      </aside>
    </>
  );
}
