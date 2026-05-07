import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Obra, ObraStatus } from '../../lib/database.types';
import { DatePickerInput } from '../ui/DatePickerInput';
import { CurrencyInput } from '../ui/CurrencyInput';

interface NovoProjetoModalProps {
  onClose: () => void;
  onSaved: (obra: Obra) => void;
}

interface FormState {
  nome: string;
  codigo: string;
  status: ObraStatus;
  tipo: string;
  bandeira: string;
  localizacao: string;
  engenheiro: string;
  data_inicio: string;
  data_fim: string;
  orcado: number | null;
  descricao: string;
}

const INITIAL: FormState = {
  nome: '',
  codigo: '',
  status: 'planejamento',
  tipo: 'Residencial',
  bandeira: '',
  localizacao: '',
  engenheiro: '',
  data_inicio: '',
  data_fim: '',
  orcado: null,
  descricao: '',
};

const STATUS_OPTS: { value: ObraStatus; label: string }[] = [
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'concluida', label: 'Concluída' },
];

const TIPO_OPTS = ['Residencial', 'Comercial', 'Industrial', 'Infraestrutura', 'Misto'];

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

export function NovoProjetoModal({ onClose, onSaved }: NovoProjetoModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return; }
    if (!form.codigo.trim()) { setError('Código é obrigatório.'); return; }
    if (!form.localizacao.trim()) { setError('Localização é obrigatória.'); return; }

    setSaving(true);
    setError(null);

    const newObra: Obra = {
      id: `obra-${Date.now()}`,
      nome: form.nome.trim(),
      codigo: form.codigo.trim().toUpperCase(),
      status: form.status,
      tipo: form.tipo,
      bandeira: form.bandeira.trim() || form.nome.trim().slice(0, 2).toUpperCase(),
      localizacao: form.localizacao.trim(),
      engenheiro: form.engenheiro.trim() || '—',
      orcado: form.orcado ?? 0,
      realizado: 0,
      avanco_fisico: 0,
      data_inicio: form.data_inicio || new Date().toISOString().split('T')[0],
      data_fim: form.data_fim || '',
      imagem_url: '',
      descricao: form.descricao.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await new Promise(r => setTimeout(r, 400));

    setSaving(false);
    onSaved(newObra);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Novo Projeto</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Preencha as informações do empreendimento e clique em Criar Projeto.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[72vh]">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nome do Projeto *</label>
              <input
                className={inputClass}
                placeholder="Ex: Residencial Aurora — Torre A"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Código / Sigla *</label>
              <input
                className={inputClass}
                placeholder="Ex: AUR-001"
                value={form.codigo}
                onChange={e => set('codigo', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Status Inicial</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={e => set('status', e.target.value as ObraStatus)}
              >
                {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Tipo</label>
              <select
                className={inputClass}
                value={form.tipo}
                onChange={e => set('tipo', e.target.value)}
              >
                {TIPO_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Bandeira / Marca</label>
              <input
                className={inputClass}
                placeholder="Ex: Construtora MOS"
                value={form.bandeira}
                onChange={e => set('bandeira', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Localização *</label>
            <input
              className={inputClass}
              placeholder="Ex: São Paulo, SP"
              value={form.localizacao}
              onChange={e => set('localizacao', e.target.value)}
            />
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Engenheiro Responsável</label>
            <input
              className={inputClass}
              placeholder="Ex: Eng. João Silva"
              value={form.engenheiro}
              onChange={e => set('engenheiro', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Data de Início</label>
              <DatePickerInput
                value={form.data_inicio}
                onChange={v => set('data_inicio', v)}
                className={inputClass}
                id="proj-inicio"
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Data de Conclusão Prevista</label>
              <DatePickerInput
                value={form.data_fim}
                onChange={v => set('data_fim', v)}
                className={inputClass}
                id="proj-fim"
              />
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Orçamento Total (R$)</label>
            <CurrencyInput
              value={form.orcado}
              onChange={v => set('orcado', v)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Descrição</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Descrição breve do empreendimento (opcional)"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md bg-status-errorLight px-4 py-3">
              <p className="font-body text-sm text-status-error">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Criando…' : 'Criar Projeto'}
          </button>
        </div>
      </div>
    </div>
  );
}
