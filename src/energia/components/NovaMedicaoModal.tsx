import { useState, useEffect, useMemo } from 'react';
import { X, Zap, Loader2, Camera, Upload, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { calcularConsumo, calcularValorTotal, formatCurrencyBR, formatKWh, getMesAtual, getAnoAtual } from '../utils/calculos';
import type { EnergiaUnidade, EnergiaSala, EnergiaMedicao } from '../types';

interface Props {
  unidades: EnergiaUnidade[];
  salas: EnergiaSala[];
  isAdmin: boolean;
  userUnidadeId: string;
  preSelectedSalaId: string;
  editingMedicao?: EnergiaMedicao | null;
  onClose: () => void;
  onSaved: () => void;
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function NovaMedicaoModal({ unidades, salas, isAdmin, userUnidadeId, preSelectedSalaId, editingMedicao, onClose, onSaved }: Props) {
  const isEditing = !!editingMedicao;

  const [unidadeId, setUnidadeId] = useState(() => {
    if (editingMedicao) {
      const sala = salas.find(s => s.id === editingMedicao.sala_id);
      return sala?.unidade_id || '';
    }
    if (!isAdmin && userUnidadeId) return userUnidadeId;
    if (preSelectedSalaId) {
      const sala = salas.find(s => s.id === preSelectedSalaId);
      if (sala) return sala.unidade_id;
    }
    return unidades[0]?.id || '';
  });
  const [salaId, setSalaId] = useState(editingMedicao?.sala_id || preSelectedSalaId);
  const [mes, setMes] = useState(editingMedicao?.mes ?? getMesAtual());
  const [ano, setAno] = useState(editingMedicao?.ano ?? getAnoAtual());
  const [leituraAnterior, setLeituraAnterior] = useState(editingMedicao ? String(Number(editingMedicao.leitura_anterior)) : '');
  const [prevMesAno, setPrevMesAno] = useState<{ mes: number; ano: number } | null>(null);
  const [leituraAtual, setLeituraAtual] = useState(editingMedicao ? String(Number(editingMedicao.leitura_atual)) : '');
  const [tarifa, setTarifa] = useState(editingMedicao ? String(Number(editingMedicao.tarifa)) : '0.85');
  const [fotoPreview, setFotoPreview] = useState(editingMedicao?.foto_url || '');
  const [observacoes, setObservacoes] = useState(editingMedicao?.observacoes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [skipAutoFill, setSkipAutoFill] = useState(isEditing);
  const [isFirstMedicao, setIsFirstMedicao] = useState(false);

  const salasFiltered = useMemo(() => {
    const base = unidadeId ? salas.filter(s => s.unidade_id === unidadeId) : salas;
    // Exclude rooms with separate meters — they don't need system measurements
    return base.filter(s => (s.medicao_tipo ?? 'medido') === 'medido');
  }, [salas, unidadeId]);

  const selectedSala = salas.find(s => s.id === salaId);
  const isRelógioProprio = (selectedSala?.medicao_tipo ?? 'medido') === 'relogio_proprio';

  // When sala or unidade changes, resolve the effective tarifa (sala override > unidade default)
  useEffect(() => {
    if (isEditing) return;
    const sala = salas.find(s => s.id === salaId);
    if (sala?.tarifa_override != null && sala.tarifa_override > 0) {
      setTarifa(String(Number(sala.tarifa_override)));
      return;
    }
    const uid = sala?.unidade_id || unidadeId;
    const unidade = unidades.find(u => u.id === uid);
    if (unidade?.tarifa != null) {
      setTarifa(String(Number(unidade.tarifa)));
    }
  }, [salaId, unidadeId, salas, unidades]);

  // When sala or period changes, fetch the most recent previous reading for that sala
  useEffect(() => {
    if (skipAutoFill) {
      setSkipAutoFill(false);
      return;
    }
    if (!salaId) {
      setLeituraAnterior('');
      setPrevMesAno(null);
      setIsFirstMedicao(false);
      return;
    }
    (async () => {
      setLoadingPrev(true);
      const { data } = await supabase
        .from('energia_medicoes')
        .select('leitura_atual, mes, ano')
        .eq('sala_id', salaId)
        .or(`ano.lt.${ano},and(ano.eq.${ano},mes.lt.${mes})`)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const m = data as Pick<EnergiaMedicao, 'leitura_atual' | 'mes' | 'ano'>;
        setLeituraAnterior(String(Number(m.leitura_atual)));
        setPrevMesAno({ mes: m.mes, ano: m.ano });
        setIsFirstMedicao(false);
      } else {
        setLeituraAnterior('');
        setPrevMesAno(null);
        setIsFirstMedicao(true);
      }
      setLeituraAtual('');
      setLoadingPrev(false);
    })();
  }, [salaId, mes, ano]);

  const leitAnt = Number(leituraAnterior.replace(',', '.')) || 0;
  const leitAtual = Number(leituraAtual.replace(',', '.')) || 0;
  const tarifaNum = Number(tarifa.replace(',', '.')) || 0;
  const consumo = calcularConsumo(leitAtual, leitAnt);
  const valorTotal = calcularValorTotal(consumo, tarifaNum);
  const leituraInvalida = leituraAtual !== '' && leitAtual < leitAnt;

  function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!salaId) { setError('Selecione uma sala'); return; }
    if (!leituraAtual) { setError('Informe a leitura atual'); return; }
    if (leituraInvalida) { setError('Leitura atual não pode ser menor que a anterior'); return; }

    setSaving(true);
    const payload = {
      sala_id: salaId,
      mes,
      ano,
      leitura_anterior: leitAnt,
      leitura_atual: leitAtual,
      consumo,
      tarifa: tarifaNum,
      valor_total: valorTotal,
      foto_url: fotoPreview,
      observacoes: observacoes.trim(),
    };
    const { error: err } = await supabase.from('energia_medicoes').upsert(payload, { onConflict: 'sala_id,mes,ano' });
    setSaving(false);

    if (err) {
      setError(err.message.includes('duplicate') ? 'Já existe medição para este mês/sala' : err.message);
    } else {
      onSaved();
    }
  }

  const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const selectClass = "w-full appearance-none px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer";
  const inputClass = "w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-data text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card";
  const lockedClass = `${inputClass} bg-surface-1 text-text-tertiary cursor-not-allowed select-none`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-2xl my-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-mos-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-mos-700" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-text-primary">{isEditing ? 'Editar Medição' : 'Nova Medição'}</h2>
              <p className="font-body text-xs text-text-tertiary">{isEditing ? 'Altere os dados da leitura' : 'Registre a leitura mensal de energia'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-status-errorLight border border-status-error/20">
              <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0" />
              <p className="font-body text-xs text-status-error">{error}</p>
            </div>
          )}

          {/* Localização */}
          <div>
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-3">LOCALIZAÇÃO</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs text-text-tertiary mb-1.5">Unidade</label>
                <div className="relative">
                  <select value={unidadeId} onChange={e => { setUnidadeId(e.target.value); setSalaId(''); }} disabled={!isAdmin} className={`${selectClass} disabled:bg-surface-1`}>
                    <option value="">Selecione...</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block font-body text-xs text-text-tertiary mb-1.5">Sala *</label>
                <div className="relative">
                  <select value={salaId} onChange={e => setSalaId(e.target.value)} required className={selectClass}>
                    <option value="">Selecione...</option>
                    {salasFiltered.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Warning: sala com relógio próprio */}
          {isRelógioProprio && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-body text-xs font-semibold text-blue-700">Sala com relógio separado</p>
                <p className="font-body text-xs text-blue-600 mt-0.5">Esta sala possui medidor próprio e não requer medições pelo sistema. Selecione outra sala.</p>
              </div>
            </div>
          )}

          {/* Competência */}
          <div>
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-3">COMPETÊNCIA</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs text-text-tertiary mb-1.5">Mês</label>
                <div className="relative">
                  <select value={mes} onChange={e => setMes(Number(e.target.value))} className={selectClass}>
                    {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block font-body text-xs text-text-tertiary mb-1.5">Ano</label>
                <div className="relative">
                  <select value={ano} onChange={e => setAno(Number(e.target.value))} className={selectClass}>
                    {Array.from({ length: 5 }, (_, i) => getAnoAtual() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Leituras */}
          <div className="pt-1 border-t border-surface-2">
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-3 pt-3">LEITURAS</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-body text-xs text-text-tertiary mb-1.5">Leitura Anterior (kWh)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={loadingPrev ? '' : leituraAnterior}
                    readOnly={!isFirstMedicao}
                    tabIndex={isFirstMedicao ? 0 : -1}
                    onChange={isFirstMedicao ? e => setLeituraAnterior(e.target.value.replace(/[^0-9.,]/g, '')) : undefined}
                    placeholder={isFirstMedicao ? '0' : ''}
                    className={isFirstMedicao ? inputClass : lockedClass}
                  />
                  {loadingPrev && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary animate-spin" />}
                </div>
                {salaId && !loadingPrev && (
                  <p className="font-body text-[10px] text-text-tertiary mt-1">
                    {prevMesAno
                      ? `Medição de ${MESES_ABREV[prevMesAno.mes - 1]}/${prevMesAno.ano}`
                      : isFirstMedicao
                        ? 'Primeira medição — informe a leitura inicial'
                        : 'Sem medição anterior registrada'}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-body text-xs text-text-tertiary mb-1.5">Leitura Atual (kWh) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={leituraAtual}
                  required
                  onChange={e => setLeituraAtual(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className={`${inputClass} ${leituraInvalida ? 'border-status-error focus:ring-status-error/20 focus:border-status-error' : ''}`}
                />
                {leituraInvalida && <p className="font-body text-[10px] text-status-error mt-1">Deve ser maior que a leitura anterior</p>}
              </div>
              <div>
                <label className="block font-body text-xs text-text-tertiary mb-1.5">Tarifa (R$/kWh)</label>
                <input
                  type="text"
                  value={tarifa}
                  readOnly
                  tabIndex={-1}
                  className={lockedClass}
                />
                <p className="font-body text-[10px] text-text-tertiary mt-1">
                  {(() => {
                    const sala = salas.find(s => s.id === salaId);
                    return sala?.tarifa_override != null && sala.tarifa_override > 0
                      ? 'Tarifa própria da sala'
                      : 'Padrão da unidade';
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Calculated preview */}
          {leituraAtual && !leituraInvalida && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-mos-50 rounded-xl border border-mos-100">
              <div className="text-center">
                <p className="font-body text-[10px] font-semibold text-mos-700 tracking-widest">CONSUMO CALCULADO</p>
                <p className="font-display font-extrabold text-2xl text-mos-700 mt-1">{formatKWh(consumo)}</p>
              </div>
              <div className="text-center">
                <p className="font-body text-[10px] font-semibold text-mos-700 tracking-widest">VALOR TOTAL</p>
                <p className="font-display font-extrabold text-2xl text-mos-700 mt-1">{formatCurrencyBR(valorTotal)}</p>
              </div>
            </div>
          )}

          {/* Foto */}
          <div className="pt-1 border-t border-surface-2">
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-3 pt-3">FOTO DO MEDIDOR</p>
            {fotoPreview ? (
              <div className="relative inline-block">
                <img src={fotoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-surface-3 shadow-card" />
                <button type="button" onClick={() => setFotoPreview('')}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-status-error text-white flex items-center justify-center text-xs font-bold shadow-card">
                  x
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-surface-3 rounded-xl cursor-pointer hover:border-mos-700/40 hover:bg-mos-50/30 transition-colors gap-1.5">
                  <Camera className="w-5 h-5 text-text-tertiary" />
                  <span className="font-body text-xs text-text-tertiary font-medium">Tirar foto</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoUpload} />
                </label>
                <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-surface-3 rounded-xl cursor-pointer hover:border-mos-700/40 hover:bg-mos-50/30 transition-colors gap-1.5">
                  <Upload className="w-5 h-5 text-text-tertiary" />
                  <span className="font-body text-xs text-text-tertiary font-medium">Galeria / arquivo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
                </label>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">OBSERVAÇÕES</label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Informações adicionais..."
              className="w-full px-3 py-2.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors resize-none shadow-card"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving || leituraInvalida || isRelógioProprio} className="btn-primary inline-flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Salvar Medição
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
