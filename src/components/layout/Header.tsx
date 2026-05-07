import { Search, SlidersHorizontal, Bell, ChevronDown, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  return (
    <header className="h-14 bg-surface-0 border-b border-surface-2 flex items-center px-6 gap-4 flex-shrink-0">
      <button
        className="lg:hidden p-1.5 rounded-md hover:bg-surface-2 transition-colors mr-1"
        onClick={onMenuClick}
      >
        <Menu className="w-5 h-5 text-text-secondary" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-base text-text-primary leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="font-body text-xs text-text-tertiary truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button className="p-2 rounded-lg hover:bg-surface-2 transition-colors duration-150">
          <Search className="w-4 h-4 text-text-secondary" />
        </button>
        <button className="p-2 rounded-lg hover:bg-surface-2 transition-colors duration-150">
          <SlidersHorizontal className="w-4 h-4 text-text-secondary" />
        </button>
        <button className="relative p-2 rounded-lg hover:bg-surface-2 transition-colors duration-150">
          <Bell className="w-4 h-4 text-text-secondary" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-mos-700 rounded-full" />
        </button>

        <div className="flex items-center gap-1.5 ml-1 pl-3 border-l border-surface-2 cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-mos-700 flex items-center justify-center">
            <span className="font-display font-bold text-[10px] text-white">DE</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
        </div>
      </div>
    </header>
  );
}
