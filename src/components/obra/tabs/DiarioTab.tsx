import { useState } from 'react';
import { Plus, BookOpen, Filter } from 'lucide-react';
import type { DiarioObra } from '../../../lib/database.types';

const CARGO_COLORS: Record<string, string> = {
  master: 'bg-role-master text-white',
  gestor: 'bg-role-gestor text-white',
  engenheiro: 'bg-role-engenheiro text-white',
  comprador: 'bg-role-comprador text-white',
};

const CARGO_LABELS: Record<string, string> = {
  master: 'Master',
  gestor: 'Gestor',
  engenheiro: 'Engenheiro',
  comprador: 'Comprador',
};

function formatDiarioDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

interface DiarioTabProps {
  entradas: DiarioObra[];
}

export function DiarioTab({ entradas }: DiarioTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [etapaFilter, setEtapaFilter] = useState('Todas');

  const etapaOptions = ['Todas', ...new Set(entradas.map(e => e.etapa_tag).filter(Boolean))];

  const filtered = etapaFilter === 'Todas'
    ? entradas
    : entradas.filter(e => e.etapa_tag === etapaFilter);

  const sorted = [...filtered].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-base text-text-primary">Diário de Obra</h3>
          <p className="font-body text-xs text-text-tertiary mt-0.5">{entradas.length} registros · Histórico de atividades e decisões</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-surface-3 bg-surface-0">
            <Filter className="w-3.5 h-3.5 text-text-tertiary" />
            <select
              value={etapaFilter}
              onChange={e => setEtapaFilter(e.target.value)}
              className="font-body text-xs text-text-secondary bg-transparent outline-none"
            >
              {etapaOptions.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-mos-700 text-white font-body text-xs font-medium hover:bg-mos-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Registro
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <BookOpen className="w-10 h-10 text-text-disabled" />
          <p className="font-body text-sm text-text-tertiary">Nenhum registro encontrado para este filtro.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[52px] top-0 bottom-0 w-px bg-surface-3" />
          <div className="space-y-6">
            {sorted.map((entrada) => (
              <div key={entrada.id} className="flex gap-4">
                <div className="shrink-0 flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-xs z-10 ${CARGO_COLORS[entrada.autor_cargo] || 'bg-surface-3 text-text-secondary'}`}>
                    {entrada.autor_iniciais}
                  </div>
                </div>
                <div className="flex-1 card p-4 hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="font-display font-semibold text-sm text-text-primary leading-snug">{entrada.titulo}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-body text-xs text-text-tertiary">{entrada.autor_nome}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${CARGO_COLORS[entrada.autor_cargo]}`}>
                          {CARGO_LABELS[entrada.autor_cargo]}
                        </span>
                        {entrada.etapa_tag && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-2 font-body text-[10px] text-text-secondary font-medium">
                            {entrada.etapa_tag}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 font-body text-xs text-text-tertiary capitalize">
                      {formatDiarioDate(entrada.data)}
                    </span>
                  </div>
                  <p className="font-body text-sm text-text-secondary leading-relaxed">{entrada.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-modal w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-base text-text-primary mb-4">Novo Registro no Diário</h3>
            <div className="space-y-3">
              <div>
                <label className="font-body text-xs font-semibold text-text-tertiary block mb-1">TÍTULO</label>
                <input type="text" placeholder="Ex: Concretagem das vigas do 3º pavimento" className="w-full px-3 py-2 rounded-md border border-surface-3 font-body text-sm text-text-primary outline-none focus:border-mos-700" />
              </div>
              <div>
                <label className="font-body text-xs font-semibold text-text-tertiary block mb-1">DESCRIÇÃO</label>
                <textarea rows={4} placeholder="Descreva as atividades, ocorrências ou decisões..." className="w-full px-3 py-2 rounded-md border border-surface-3 font-body text-sm text-text-primary outline-none focus:border-mos-700 resize-none" />
              </div>
              <div>
                <label className="font-body text-xs font-semibold text-text-tertiary block mb-1">ETAPA</label>
                <select className="w-full px-3 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary outline-none">
                  <option value="">Selecionar etapa...</option>
                  {etapaOptions.filter(o => o !== 'Todas').map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-1 transition-colors">Cancelar</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors">Salvar Registro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
