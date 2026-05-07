type TabId = 'visao-geral' | 'orcamento' | 'cronograma' | 'medicoes' | 'diario';

interface Tab {
  id: TabId;
  label: string;
  hasIndicator?: boolean;
}

const TABS: Tab[] = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'orcamento', label: 'Orçamento' },
  { id: 'cronograma', label: 'Cronograma', hasIndicator: true },
  { id: 'medicoes', label: 'Medições', hasIndicator: true },
  { id: 'diario', label: 'Diário' },
];

interface ObraTabsProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

export type { TabId };

export function ObraTabs({ activeTab, onChange }: ObraTabsProps) {
  return (
    <div className="flex items-center gap-0 px-6 bg-surface-0 border-b border-surface-3">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-1.5 px-4 py-3 font-body text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? 'text-text-primary border-mos-700'
                : 'text-text-tertiary border-transparent hover:text-text-secondary hover:border-surface-3'
            }`}
          >
            {tab.label}
            {tab.hasIndicator && isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-mos-700" />
            )}
          </button>
        );
      })}
    </div>
  );
}
