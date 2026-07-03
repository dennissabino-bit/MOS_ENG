import { useState, useEffect } from 'react';
import { X, DoorOpen, Loader2, Gauge, SplitSquareVertical, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTiposSala } from '../hooks/useTiposSala';
import type { EnergiaSala, EnergiaUnidade, MedicaoTipo } from '../types';

interface Props {
  unidadeId?: string;
  unidades?: EnergiaUnidade[];
  onClose: () => void;
  onSaved: () => void;
  initial?: EnergiaSala;
}

export function NovaSalaModal({ unidadeId, unidades, onClose, onSaved, initial }: Props) {
  const { tipos, loading: tiposLoading } = useTiposSala();
  const [selectedUnidadeId, setSelectedUnidadeId] = useState(
    initial?.unidade_id ?? unidadeId ?? unidades?.[0]?.id ?? ''
  );
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [tipoSala, setTipoSala] = useState(initial?.tipo_sala ?? '');
  const [responsavel, setResponsavel] = useState(initial?.responsavel ?? '');
  const [cpfCnpj, setCpfCnpj] = useState(initial?.cpf_cnpj ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telefone, setTelefone] = useState(initial?.telefone ?? '');
  const [medicaoTipo, setMedicaoTipo] = useState<MedicaoTipo>(initial?.medicao_tipo ?? 'medido');
  const [valorAluguel, setValorAluguel] = useState(initial?.valor_aluguel ? String(initial.valor_aluguel) : '');
  const [tarifaOverride, setTarifaOverride] = useState(initial?.tarifa_override != null ? String(initial.tarifa_override) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Set default tipo once types load (only for new salas)
  useEffect(() => {
    if (!initial && !tipoSala && tipos.length > 0) {
      setTipoSala(tipos[0].slug);
    }
  }, [tipos, initial, tipoSala]);

  function maskCpfCnpj(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError('Nome é obrigatório'); return; }
    if (!selectedUnidadeId) { setError('Selecione uma unidade'); return; }
    setSaving(true);
    setError('');
    const payload = {
      unidade_id: selectedUnidadeId,
      nome: nome.trim(),
      tipo_sala: tipoSala,
      medicao_tipo: medicaoTipo,
      responsavel: responsavel.trim(),
      cpf_cnpj: cpfCnpj.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      valor_aluguel: Number(valorAluguel.replace(',', '.')) || 0,
      tarifa_override: tarifaOverride.trim() !== '' ? Number(tarifaOverride.replace(',', '.')) : null,
      ativo: true,
    };
    if (initial?.id) {
      const { error: err } = await supabase.from('energia_salas').update(payload).eq('id', initial.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('energia_salas').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center">
              <DoorOpen className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-text-primary">{initial ? 'Editar' : 'Nova'} Sala</h2>
              <p className="font-body text-xs text-text-tertiary">Preencha os dados da sala</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-status-errorLight border border-status-error/20">
              <p className="font-body text-xs text-status-error">{error}</p>
            </div>
          )}

          {unidades && !initial && (
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">UNIDADE *</label>
              <div className="relative">
                <select
                  value={selectedUnidadeId}
                  onChange={e => setSelectedUnidadeId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors appearance-none pr-8"
                >
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">NOME DA SALA *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required autoFocus
              className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors" />
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">TIPO DE SALA</label>
            {tiposLoading ? (
              <div className="w-full px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-text-tertiary" />
                <span className="font-body text-sm text-text-tertiary">Carregando tipos...</span>
              </div>
            ) : (
              <select
                value={tipoSala}
                onChange={e => setTipoSala(e.target.value)}
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              >
                {tipos.map(t => (
                  <option key={t.id} value={t.slug}>{t.nome}</option>
                ))}
              </select>
            )}
          </div>

          {/* Medicao tipo */}
          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-2">TIPO DE MEDIÇÃO</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'medido', label: 'Medição interna', desc: 'Relógio compartilhado — requer leituras mensais', Icon: Gauge },
                { value: 'relogio_proprio', label: 'Relógio separado', desc: 'Medidor próprio — sem medições pelo sistema', Icon: SplitSquareVertical },
              ] as const).map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMedicaoTipo(value)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                    medicaoTipo === value
                      ? 'border-mos-700 bg-mos-50 ring-1 ring-mos-700/20'
                      : 'border-surface-3 bg-surface-0 hover:bg-surface-1'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${medicaoTipo === value ? 'text-mos-700' : 'text-text-tertiary'}`} />
                  <div>
                    <p className={`font-body text-xs font-semibold ${medicaoTipo === value ? 'text-mos-700' : 'text-text-primary'}`}>{label}</p>
                    <p className="font-body text-[10px] text-text-tertiary leading-tight mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">LOCATÁRIO</label>
            <input type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)}
              className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors" />
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">CPF / CNPJ</label>
            <input
              type="text"
              inputMode="numeric"
              value={cpfCnpj}
              onChange={e => setCpfCnpj(maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors" />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">TELEFONE</label>
              <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)}
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">VALOR DO ALUGUEL (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={valorAluguel}
                onChange={e => setValorAluguel(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">TARIFA PRÓPRIA (R$/kWh)</label>
              <input
                type="text"
                inputMode="decimal"
                value={tarifaOverride}
                onChange={e => setTarifaOverride(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="Usar da unidade"
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              />
              <p className="font-body text-[10px] text-text-tertiary mt-1">Deixe em branco para usar a tarifa da unidade</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving || tiposLoading} className="btn-primary inline-flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {initial ? 'Salvar' : 'Criar Sala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
