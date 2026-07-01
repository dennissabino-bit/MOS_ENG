import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DiariaPlanilha, Obra } from '../../lib/database.types';

interface NovaPlanilhaModalProps {
  onClose: () => void;
  onSaved: (planilha: DiariaPlanilha) => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const inputClass =
  'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

function computeDataInicio(quinzena: 1 | 2, mes: number, ano: number): string {
  // Find the first Monday of the month
  const firstDay = new Date(ano, mes - 1, 1);
  const dayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon...
  const daysToMonday = dayOfWeek === 1 ? 0 : dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const firstMonday = new Date(ano, mes - 1, 1 + daysToMonday);

  // Quinzena 1 = first Monday; quinzena 2 = third Monday (first Monday + 14 days)
  const targetMonday = quinzena === 1 ? firstMonday : new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + 14);
  const y = targetMonday.getFullYear();
  const m = String(targetMonday.getMonth() + 1).padStart(2, '0');
  const d = String(targetMonday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function NovaPlanilhaModal({ onClose, onSaved }: NovaPlanilhaModalProps) {
  const now = new Date();
  const [obras, setObras] = useState<Pick<Obra, 'id' | 'nome' | 'localizacao'>[]>([]);
  const [form, setForm] = useState({
    obra_id: '',
    nome_equipe: '',
    quinzena: 1 as 1 | 2,
    mes: now.getMonth() + 1,
    ano: now.getFullYear(),
    localizacao: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('obras')
      .select('id, nome, localizacao')
      .eq('arquivada', false)
      .order('nome')
      .then(({ data }) => setObras((data ?? []) as Pick<Obra, 'id' | 'nome' | 'localizacao'>[]));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleObraChange(id: string) {
    const obra = obras.find(o => o.id === id);
    setForm(prev => ({ ...prev, obra_id: id, localizacao: obra?.localizacao ?? '' }));
  }

  async function handleSave() {
    if (!form.nome_equipe.trim()) { setError('Nome da equipe é obrigatório.'); return; }
    setSaving(true);
    setError(null);

    const payload = {
      obra_id: form.obra_id || null,
      nome_equipe: form.nome_equipe.trim(),
      quinzena: form.quinzena,
      mes: form.mes,
      ano: form.ano,
      data_inicio: computeDataInicio(form.quinzena, form.mes, form.ano),
      localizacao: form.localizacao.trim() || null,
    };

    const { data, error: err } = await supabase
      .from('diarias_planilhas')
      .insert(payload)
      .select('*, obras(nome, localizacao)')
      .single();

    if (err || !data) {
      setError(err?.message || 'Erro ao criar planilha.');
      setSaving(false);
      return;
    }

    onSaved(data as DiariaPlanilha);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Nova Planilha de Diárias</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Preencha os dados para criar a planilha.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Obra</label>
            <select className={inputClass} value={form.obra_id} onChange={e => handleObraChange(e.target.value)}>
              <option value="">Sem obra vinculada</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nome da Equipe *</label>
            <input
              className={inputClass}
              placeholder="Ex: Josué e Equipe"
              value={form.nome_equipe}
              onChange={e => set('nome_equipe', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Quinzena</label>
              <select
                className={inputClass}
                value={form.quinzena}
                onChange={e => set('quinzena', Number(e.target.value) as 1 | 2)}
              >
                <option value={1}>1ª Quinzena</option>
                <option value={2}>2ª Quinzena</option>
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Mês</label>
              <select
                className={inputClass}
                value={form.mes}
                onChange={e => set('mes', Number(e.target.value))}
              >
                {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Ano</label>
              <input
                type="number"
                className={inputClass}
                value={form.ano}
                min={2020}
                max={2100}
                onChange={e => set('ano', Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Localização</label>
            <input
              className={inputClass}
              placeholder="Ex: Porangatu"
              value={form.localizacao}
              onChange={e => set('localizacao', e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3">
              <p className="font-body text-sm text-red-600">{error}</p>
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
            {saving ? 'Criando…' : 'Criar Planilha'}
          </button>
        </div>
      </div>
    </div>
  );
}
