import { ClipboardCheck, Clock, ListChecks, ShieldCheck, BarChart3 } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';

const STATS = [
  { label: 'Checklists ativos', value: '—', color: 'bg-status-infoLight text-status-info' },
  { label: 'Itens pendentes',   value: '—', color: 'bg-status-warningLight text-status-warning' },
  { label: 'Conformes',         value: '—', color: 'bg-status-successLight text-status-success' },
  { label: 'Não conformes',     value: '—', color: 'bg-status-errorLight text-status-error' },
];

export default function Checklist() {
  return (
    <AppLayout title="Checklist" subtitle="Inspeções, auditorias e controle de qualidade">
      <div className="p-6 space-y-8">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="card p-5">
              <div className={`inline-flex px-2 py-1 rounded-md text-xs font-bold mb-2 ${s.color}`}>
                {s.label}
              </div>
              <p className="font-data font-bold text-3xl text-text-disabled">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Coming soon */}
        <div className="card flex flex-col items-center justify-center py-20 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center">
            <ClipboardCheck className="w-8 h-8 text-text-disabled" strokeWidth={1.5} />
          </div>
          <div className="text-center max-w-sm">
            <h2 className="font-display font-bold text-lg text-text-primary mb-2">Módulo em Desenvolvimento</h2>
            <p className="font-body text-sm text-text-secondary leading-relaxed">
              O módulo de Checklist permitirá criar e aplicar listas de verificação
              para inspeções de obra, auditorias de segurança e controle de qualidade.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            {[
              { icon: ListChecks,   label: 'Templates de checklist' },
              { icon: ShieldCheck,  label: 'Inspeções de segurança' },
              { icon: BarChart3,    label: 'Relatório de conformidade' },
              { icon: ClipboardCheck, label: 'Assinatura digital'    },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 rounded-full">
                <Icon className="w-3.5 h-3.5 text-text-tertiary" strokeWidth={1.8} />
                <span className="font-body text-xs text-text-tertiary">{label}</span>
              </div>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mos-50 text-mos-700 font-body text-xs font-semibold mt-1">
            <Clock className="w-3.5 h-3.5" />
            Em breve
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
