import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DoorOpen, Zap, Plus, Camera, CreditCard as Edit,
  Home, Check, Loader2, Trash2, UserCheck, UserX,
  Archive, ArchiveRestore, CalendarRange, AlertTriangle, User, Mail, Phone, Hash,
  SplitSquareVertical, Gauge, Pencil, X, TrendingUp, FileText, History, Send,
} from 'lucide-react';
import { ConsumoSparkline } from '../components/ConsumoSparkline';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { NovaSalaModal } from '../components/NovaSalaModal';
import { NovoContratoLocacaoModal } from '../components/NovoContratoLocacaoModal';
import { ContratoLocacaoPDF } from '../components/ContratoLocacaoPDF';
import { SalaDocumentosCard } from '../components/SalaDocumentosCard';
import { SalaFotosGallery } from '../components/SalaFotosGallery';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatKWh, formatMesAno, getMesAtual, getAnoAtual } from '../utils/calculos';
import { useTiposSala } from '../hooks/useTiposSala';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { INDICE_REAJUSTE_LABEL } from '../types';
import type { EnergiaSala, EnergiaMedicao, EnergiaUnidade, EnergiaAluguel, EnergiaContratoLocacao, MedicaoTipo } from '../types';

export default function SalaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLabel } = useTiposSala();
  const { isAdmin } = useEnergiaAuth();

  const [sala, setSala] = useState<EnergiaSala | null>(null);
  const [unidade, setUnidade] = useState<EnergiaUnidade | null>(null);
  const [medicoes, setMedicoes] = useState<EnergiaMedicao[]>([]);
  const [alugueis, setAlugueis] = useState<EnergiaAluguel[]>([]);
  const [contrato, setContrato] = useState<EnergiaContratoLocacao | null>(null);
  const [historicContratos, setHistoricContratos] = useState<EnergiaContratoLocacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [showEditSala, setShowEditSala] = useState(false);
  const [showConfirmArquivar, setShowConfirmArquivar] = useState(false);
  const [showContrato, setShowContrato] = useState(false);
  const [showReajuste, setShowReajuste] = useState(false);
  const [showContratoPDF, setShowContratoPDF] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showConfirmEncerrar, setShowConfirmEncerrar] = useState(false);
  const [encerrandoContrato, setEncerrandoContrato] = useState(false);
  const [deletingAluguelId, setDeletingAluguelId] = useState<string | null>(null);
  const [editingTipo, setEditingTipo] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<MedicaoTipo>('medido');
  const [savingTipo, setSavingTipo] = useState(false);

  // Pagination
  const PAGE_SIZE = 6;
  const [medicaoPage, setMedicaoPage] = useState(0);
  const [aluguelPage, setAluguelPage] = useState(0);

  // Dia vencimento inline edit
  const [editingDiaVenc, setEditingDiaVenc] = useState(false);
  const [diaVencInput, setDiaVencInput] = useState(10);
  const [savingDiaVenc, setSavingDiaVenc] = useState(false);

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    const { data: sData } = await supabase.from('energia_salas').select('*').eq('id', id).maybeSingle();
    const fetchedSala = sData as EnergiaSala | null;
    setSala(fetchedSala);
    if (fetchedSala) {
      const [uRes, mRes, aRes, cRes, hRes] = await Promise.all([
        supabase.from('energia_unidades').select('*').eq('id', fetchedSala.unidade_id).maybeSingle(),
        supabase.from('energia_medicoes').select('*').eq('sala_id', id).order('ano', { ascending: false }).order('mes', { ascending: false }),
        supabase.from('energia_alugueis').select('*').eq('sala_id', id).order('ano', { ascending: false }).order('mes', { ascending: false }),
        supabase.from('energia_contratos_locacao').select('*').eq('sala_id', id).eq('ativo', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('energia_contratos_locacao').select('*').eq('sala_id', id).eq('ativo', false).order('created_at', { ascending: false }),
      ]);
      setUnidade(uRes.data as EnergiaUnidade | null);
      setMedicoes((mRes.data as EnergiaMedicao[]) || []);
      setAlugueis((aRes.data as EnergiaAluguel[]) || []);
      setContrato(cRes.data as EnergiaContratoLocacao | null);
      setHistoricContratos((hRes.data as EnergiaContratoLocacao[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [id]);

  const totalConsumo = medicoes.reduce((s, m) => s + Number(m.consumo), 0);
  const totalCusto = medicoes.reduce((s, m) => s + Number(m.valor_total), 0);
  const totalAluguelOrcado = alugueis.reduce((s, a) => s + Number(a.valor), 0);
  const aluguelPago = alugueis.filter(a => a.pago).length;
  const aluguelRealizado = alugueis.filter(a => a.pago).reduce((s, a) => s + Number(a.valor), 0);
  const adimplenciaPct = alugueis.length > 0 ? (aluguelPago / alugueis.length) * 100 : 0;

  async function handleArquivar() {
    if (!sala || !id) return;
    await supabase.from('energia_salas').update({ ativo: false, arquivada: true }).eq('id', id);
    setShowConfirmArquivar(false);
    setSala(prev => prev ? { ...prev, ativo: false, arquivada: true } : prev);
  }

  async function handleRestaurar() {
    if (!sala || !id) return;
    await supabase.from('energia_salas').update({ arquivada: false }).eq('id', id);
    setSala(prev => prev ? { ...prev, arquivada: false } : prev);
  }

  async function handleToggleOcupada() {
    if (!sala || !id) return;
    await supabase.from('energia_salas').update({ ativo: !sala.ativo }).eq('id', id);
    setSala(prev => prev ? { ...prev, ativo: !prev.ativo } : prev);
  }

  function handleStartEditTipo() {
    setTipoSelecionado(sala?.medicao_tipo ?? 'medido');
    setEditingTipo(true);
  }

  async function handleSaveTipo() {
    if (!id || !sala) return;
    setSavingTipo(true);
    await supabase.from('energia_salas').update({ medicao_tipo: tipoSelecionado }).eq('id', id);
    setSala(prev => prev ? { ...prev, medicao_tipo: tipoSelecionado } : prev);
    setSavingTipo(false);
    setEditingTipo(false);
  }

  async function handleSaveDiaVenc() {
    if (!contrato) return;
    const dia = Math.min(28, Math.max(1, diaVencInput));
    setSavingDiaVenc(true);
    await supabase.from('energia_contratos_locacao').update({ dia_vencimento: dia }).eq('id', contrato.id);
    setContrato(prev => prev ? { ...prev, dia_vencimento: dia } : prev);
    setSavingDiaVenc(false);
    setEditingDiaVenc(false);
  }

  async function handleTogglePago(aluguel: EnergiaAluguel) {
    await supabase.from('energia_alugueis').update({ pago: !aluguel.pago }).eq('id', aluguel.id);
    setAlugueis(prev => prev.map(a => a.id === aluguel.id ? { ...a, pago: !a.pago } : a));
  }

  async function handleDeleteAluguel() {
    if (!deletingAluguelId) return;
    await supabase.from('energia_alugueis').delete().eq('id', deletingAluguelId);
    setDeletingAluguelId(null);
    fetchData();
  }

  async function handleEncerrarContrato() {
    if (!contrato) return;
    setEncerrandoContrato(true);
    const mesAtual = getMesAtual();
    const anoAtual = getAnoAtual();
    const futuros = alugueis.filter(a =>
      !a.pago && (a.ano > anoAtual || (a.ano === anoAtual && a.mes >= mesAtual))
    );
    if (futuros.length > 0) {
      await supabase.from('energia_alugueis').delete().in('id', futuros.map(a => a.id));
    }
    await supabase.from('energia_contratos_locacao').update({ ativo: false }).eq('id', contrato.id);
    setEncerrandoContrato(false);
    setShowConfirmEncerrar(false);
    fetchData();
  }

  const adimplenciaColor =
    adimplenciaPct >= 90 ? 'text-status-success' :
    adimplenciaPct >= 70 ? 'text-status-warning' :
    'text-status-error';

  const adimplenciaBarColor =
    adimplenciaPct >= 90 ? 'bg-status-success' :
    adimplenciaPct >= 70 ? 'bg-status-warning' :
    'bg-status-error';

  if (loading) {
    return (
      <EnergiaLayout title="Sala" subtitle="Detalhes e medições">
        <div className="p-6 space-y-4">
          <div className="skeleton h-10 w-1/3 rounded-lg" />
          <div className="skeleton h-64 w-full rounded-xl" />
        </div>
      </EnergiaLayout>
    );
  }

  if (!sala) {
    return (
      <EnergiaLayout title="Sala" subtitle="">
        <div className="p-6">
          <p className="font-body text-sm text-text-tertiary">Sala não encontrada.</p>
        </div>
      </EnergiaLayout>
    );
  }

  const isRelógioProprio = (sala.medicao_tipo ?? 'medido') === 'relogio_proprio';

  return (
    <EnergiaLayout title={sala.nome} subtitle={`${getLabel(sala.tipo_sala)} · ${isRelógioProprio ? 'Relógio separado' : `${medicoes.length} medições`}`}>
      <div className="p-6 space-y-6">
        {/* Archived banner */}
        {sala.arquivada && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-2 border border-surface-3 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Archive className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <p className="font-body text-sm text-text-secondary">Esta sala está arquivada e não aparece nas listagens ativas.</p>
            </div>
            <button
              onClick={handleRestaurar}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm font-semibold text-text-secondary hover:bg-surface-1 transition-colors flex-shrink-0"
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              Restaurar
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-surface-2 transition-colors mt-0.5">
              <ArrowLeft className="w-4 h-4 text-text-tertiary" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <DoorOpen className="w-5 h-5 text-text-secondary" />
                <h1 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">{sala.nome}</h1>
                <span className={`font-body text-[10px] font-semibold px-2 py-0.5 rounded-xs tracking-wider ${sala.ativo ? 'badge-saudavel' : 'text-text-tertiary bg-surface-2'}`}>
                  {sala.ativo ? 'OCUPADA' : 'DESOCUPADA'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <span className="font-body text-sm text-text-tertiary">{getLabel(sala.tipo_sala)}</span>
                {unidade && <span className="font-body text-sm text-text-secondary">· {unidade.nome}</span>}
              </div>
            </div>
          </div>

          {/* Center: Tipo de Medição */}
          {!editingTipo && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isRelógioProprio ? 'border-blue-200 bg-blue-50' : 'border-surface-3 bg-surface-1'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isRelógioProprio ? 'bg-blue-100' : 'bg-surface-2'}`}>
                {isRelógioProprio
                  ? <SplitSquareVertical className="w-4 h-4 text-blue-600" />
                  : <Gauge className="w-4 h-4 text-text-secondary" />
                }
              </div>
              <div>
                <p className="font-body text-[10px] font-semibold tracking-widest text-text-tertiary mb-0.5">TIPO DE MEDIÇÃO</p>
                <p className={`font-display font-bold text-base leading-tight ${isRelógioProprio ? 'text-blue-700' : 'text-text-primary'}`}>
                  {isRelógioProprio ? 'Relógio separado' : 'Medição interna'}
                </p>
                <p className={`font-body text-xs mt-0.5 ${isRelógioProprio ? 'text-blue-500' : 'text-text-tertiary'}`}>
                  {isRelógioProprio
                    ? 'Medidor próprio — sem leituras mensais pelo sistema'
                    : 'Relógio compartilhado — requer leituras mensais'}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={handleStartEditTipo}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-sm font-semibold border transition-colors flex-shrink-0 ml-1 ${
                    isRelógioProprio
                      ? 'bg-white/70 border-blue-200 text-blue-700 hover:bg-white'
                      : 'bg-surface-0 border-surface-3 text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Alterar
                </button>
              )}
            </div>
          )}

          {/* Right: action buttons */}
          <div className="flex items-center gap-2">
            {sala.arquivada ? (
              <button onClick={handleRestaurar} className="btn-secondary flex items-center gap-1.5 text-sm">
                <ArchiveRestore className="w-3.5 h-3.5" />
                Restaurar
              </button>
            ) : (
              <button onClick={() => setShowConfirmArquivar(true)} className="btn-secondary flex items-center gap-1.5 text-sm text-status-error border-status-error/30 hover:bg-status-errorLight">
                <Archive className="w-3.5 h-3.5" />
                Arquivar
              </button>
            )}
            <button onClick={() => setShowEditSala(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={handleToggleOcupada}
              className={`flex items-center gap-1.5 text-sm font-body font-semibold px-3 py-2 rounded-lg border transition-colors ${
                sala.ativo
                  ? 'border-status-warning/40 bg-status-warningLight text-status-warning hover:bg-status-warning/20'
                  : 'border-status-success/40 bg-status-successLight text-status-success hover:bg-status-success/20'
              }`}
            >
              {sala.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {sala.ativo ? 'Desocupar' : 'Ocupar'}
            </button>
            {!isRelógioProprio && (
              <button
                onClick={() => navigate(`/imoveis/medicoes?sala=${id}`)}
                className="flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-2 rounded-lg shadow-card transition-transform duration-[120ms] hover:scale-[1.05] active:scale-[0.93]"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Nova Medição
              </button>
            )}
          </div>
        </div>

        {/* Tipo de Medição — edit panel */}
        {editingTipo && (
          <div className={`rounded-xl border overflow-hidden ${isRelógioProprio ? 'border-blue-200 bg-blue-50' : 'border-surface-3 bg-surface-1'}`}>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-body text-xs font-semibold tracking-widest text-text-tertiary">TIPO DE MEDIÇÃO</p>
                <button onClick={() => setEditingTipo(false)} className="p-1 rounded hover:bg-surface-2 transition-colors">
                  <X className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { value: 'medido' as MedicaoTipo, label: 'Medição interna', desc: 'Relógio compartilhado — requer leituras mensais', Icon: Gauge },
                  { value: 'relogio_proprio' as MedicaoTipo, label: 'Relógio separado', desc: 'Medidor próprio — sem leituras pelo sistema', Icon: SplitSquareVertical },
                ]).map(({ value, label, desc, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTipoSelecionado(value)}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      tipoSelecionado === value
                        ? value === 'relogio_proprio'
                          ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-mos-700 bg-mos-50 ring-2 ring-mos-700/20'
                        : 'border-surface-3 bg-surface-0 hover:bg-surface-1'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      tipoSelecionado === value
                        ? value === 'relogio_proprio' ? 'bg-blue-100' : 'bg-mos-100'
                        : 'bg-surface-2'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        tipoSelecionado === value
                          ? value === 'relogio_proprio' ? 'text-blue-600' : 'text-mos-700'
                          : 'text-text-tertiary'
                      }`} />
                    </div>
                    <div>
                      <p className={`font-body text-sm font-semibold ${tipoSelecionado === value ? (value === 'relogio_proprio' ? 'text-blue-700' : 'text-mos-700') : 'text-text-primary'}`}>{label}</p>
                      <p className="font-body text-xs text-text-tertiary mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button onClick={() => setEditingTipo(false)} className="btn-secondary text-sm">Cancelar</button>
                <button
                  onClick={handleSaveTipo}
                  disabled={savingTipo || tipoSelecionado === (sala.medicao_tipo ?? 'medido')}
                  className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {savingTipo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        {isRelógioProprio ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5 flex items-start gap-4 border-blue-100 bg-blue-50/50 sm:col-span-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <SplitSquareVertical className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-display font-bold text-base text-blue-800">Sala com relógio separado</p>
                <p className="font-body text-sm text-blue-600 mt-1">Esta sala possui medidor de energia próprio e independente. Não são necessárias leituras mensais pelo sistema — o consumo é medido e cobrado diretamente pelo fornecedor.</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 text-text-secondary" />
              </div>
              <div>
                <p className="font-display font-bold text-xl text-text-primary">{formatCurrencyBR(totalAluguelOrcado)}</p>
                <p className="font-body text-xs text-text-tertiary">Aluguel ({aluguelPago}/{alugueis.length} pagos)</p>
              </div>
            </div>
            {alugueis.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-text-secondary" />
                    <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">ADIMPLÊNCIA</p>
                  </div>
                  <span className={`font-data text-base font-bold ${adimplenciaColor}`}>{adimplenciaPct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${adimplenciaBarColor}`} style={{ width: `${adimplenciaPct}%` }} />
                </div>
                <p className="font-body text-xs text-text-tertiary mt-2">{formatCurrencyBR(aluguelRealizado)} recebido de {formatCurrencyBR(totalAluguelOrcado)}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-text-secondary" />
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-text-primary">{medicoes.length}</p>
                  <p className="font-body text-xs text-text-tertiary">Medições Registradas</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-text-secondary" />
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-text-primary">{formatKWh(totalConsumo)}</p>
                  <p className="font-body text-xs text-text-tertiary">Consumo Acumulado</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-text-secondary" />
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-text-primary">{formatCurrencyBR(totalCusto)}</p>
                  <p className="font-body text-xs text-text-tertiary">Custo Energia</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-text-secondary" />
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-text-primary">{formatCurrencyBR(totalAluguelOrcado)}</p>
                  <p className="font-body text-xs text-text-tertiary">Aluguel Cobrado</p>
                </div>
              </div>
              {alugueis.length > 0 ? (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-text-secondary" />
                      <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">ADIMPLÊNCIA</p>
                    </div>
                    <span className={`font-data text-base font-bold ${adimplenciaColor}`}>{adimplenciaPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${adimplenciaBarColor}`} style={{ width: `${adimplenciaPct}%` }} />
                  </div>
                  <p className="font-body text-xs text-text-tertiary mt-2">{formatCurrencyBR(aluguelRealizado)} recebido</p>
                </div>
              ) : (
                <div className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-text-secondary" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-xl text-text-primary">—</p>
                    <p className="font-body text-xs text-text-tertiary">Adimplência</p>
                  </div>
                </div>
              )}
            </div>

            {medicoes.length >= 2 && <ConsumoSparkline data={medicoes} />}
          </>
        )}

        {/* Locatário */}
        {(sala.responsavel || sala.cpf_cnpj || sala.email || sala.telefone || sala.email_fatura) && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-2 bg-surface-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-text-tertiary" />
                <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">LOCATÁRIO</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowEditSala(true)}
                  className="flex items-center gap-1.5 text-xs font-body font-semibold text-mos-700 hover:text-mos-700/80 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
              )}
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                {sala.responsavel && (
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${sala.ativo ? 'bg-mos-50' : 'bg-surface-1'}`}>
                      <User className={`w-4 h-4 ${sala.ativo ? 'text-mos-700' : 'text-text-tertiary'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-0.5">NOME</p>
                      <p className="font-body text-sm font-semibold text-text-primary truncate">{sala.responsavel}</p>
                    </div>
                  </div>
                )}
                {sala.cpf_cnpj && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Hash className="w-4 h-4 text-text-tertiary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-0.5">CPF / CNPJ</p>
                      <p className="font-data text-sm font-semibold text-text-primary">{sala.cpf_cnpj}</p>
                    </div>
                  </div>
                )}
                {sala.email && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Mail className="w-4 h-4 text-text-tertiary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-0.5">EMAIL</p>
                      <a href={`mailto:${sala.email}`} className="font-body text-sm text-mos-700 hover:underline truncate block">{sala.email}</a>
                    </div>
                  </div>
                )}
                {sala.telefone && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone className="w-4 h-4 text-text-tertiary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-0.5">TELEFONE</p>
                      <a href={`tel:${sala.telefone}`} className="font-body text-sm text-mos-700 hover:underline">{sala.telefone}</a>
                    </div>
                  </div>
                )}
                {sala.email_fatura && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Send className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-0.5">EMAIL FATURA</p>
                      <a href={`mailto:${sala.email_fatura}`} className="font-body text-sm text-blue-600 hover:underline truncate block">{sala.email_fatura}</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contrato de Locação */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-2 bg-surface-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-3.5 h-3.5 text-text-tertiary" />
              <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">CONTRATO DE LOCAÇÃO</p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3">
                {historicContratos.length > 0 && (
                  <button
                    onClick={() => setShowHistorico(v => !v)}
                    className="flex items-center gap-1.5 font-body text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    Histórico ({historicContratos.length})
                  </button>
                )}
                {contrato && (
                  <>
                    <button
                      onClick={() => setShowContratoPDF(true)}
                      className="flex items-center gap-1.5 font-body text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Gerar PDF
                    </button>
                    <button
                      onClick={() => setShowReajuste(true)}
                      className="flex items-center gap-1.5 font-body text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Reajuste
                    </button>
                    <button
                      onClick={() => setShowConfirmEncerrar(true)}
                      className="font-body text-xs font-semibold text-status-error hover:text-status-error/70 transition-colors"
                    >
                      Encerrar
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowContrato(true)}
                  className="flex items-center gap-1.5 text-xs font-body font-semibold text-mos-700 hover:text-mos-700/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {contrato ? 'Editar Contrato' : 'Novo Contrato'}
                </button>
              </div>
            )}
          </div>

          {contrato ? (
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-1">VALOR MENSAL</p>
                  <p className="font-data text-base font-bold text-text-primary">{formatCurrencyBR(Number(contrato.valor_mensal))}</p>
                </div>
                <div>
                  <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-1">INÍCIO</p>
                  <p className="font-data text-base font-bold text-text-primary">{formatMesAno(contrato.mes_inicio, contrato.ano_inicio)}</p>
                </div>
                <div>
                  <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-1">FIM</p>
                  <p className="font-data text-base font-bold text-text-primary">{formatMesAno(contrato.mes_fim, contrato.ano_fim)}</p>
                </div>
                <div>
                  <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-1">REAJUSTE</p>
                  <p className="font-data text-sm font-bold text-text-primary">
                    {INDICE_REAJUSTE_LABEL[contrato.indice_reajuste] ?? 'Fixo'}
                    {Number(contrato.percentual_reajuste) > 0 && (
                      <span className="text-text-tertiary font-normal ml-1">({Number(contrato.percentual_reajuste).toFixed(2)}%)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-1">TOTAL DO CONTRATO</p>
                  <p className="font-data text-base font-bold text-text-primary">
                    {formatCurrencyBR(Number(contrato.valor_mensal) * alugueis.length)}
                  </p>
                </div>
              </div>

              {/* Dia de vencimento */}
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-1">VENCIMENTO</p>
                  {editingDiaVenc ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={diaVencInput}
                        onChange={e => setDiaVencInput(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
                        className="w-16 px-2 py-1 bg-surface-0 border border-mos-700/40 rounded-md font-data text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20"
                        autoFocus
                      />
                      <span className="font-body text-xs text-text-tertiary">de cada mês</span>
                      <button
                        onClick={handleSaveDiaVenc}
                        disabled={savingDiaVenc}
                        className="flex items-center gap-1 px-2 py-1 bg-mos-700 text-white rounded-md font-body text-xs font-semibold hover:bg-mos-700/90 transition-colors disabled:opacity-50"
                      >
                        {savingDiaVenc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Salvar
                      </button>
                      <button onClick={() => setEditingDiaVenc(false)} className="p-1 rounded hover:bg-surface-2 transition-colors">
                        <X className="w-3.5 h-3.5 text-text-tertiary" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-data text-sm font-bold text-text-primary">
                        Dia {contrato.dia_vencimento ?? 10}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={() => { setDiaVencInput(contrato.dia_vencimento ?? 10); setEditingDiaVenc(true); }}
                          className="p-0.5 rounded hover:bg-surface-2 transition-colors"
                          title="Editar dia de vencimento"
                        >
                          <Pencil className="w-3 h-3 text-text-tertiary" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {contrato.observacoes && (
                <p className="font-body text-xs text-text-tertiary">{contrato.observacoes}</p>
              )}
            </div>
          ) : (
            <div className="p-10 text-center">
              <CalendarRange className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="font-body text-sm text-text-tertiary">Nenhum contrato de locação ativo</p>
              {isAdmin && (
                <button onClick={() => setShowContrato(true)} className="btn-primary mt-4 text-sm">
                  Criar Contrato
                </button>
              )}
            </div>
          )}

          {/* Histórico accordion */}
          {showHistorico && historicContratos.length > 0 && (
            <div className="border-t border-surface-2 bg-surface-0">
              <div className="px-5 py-2 bg-surface-1 border-b border-surface-2">
                <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest">CONTRATOS ENCERRADOS</p>
              </div>
              <div className="divide-y divide-surface-2">
                {historicContratos.map(c => (
                  <div key={c.id} className="px-5 py-3 flex flex-wrap items-center gap-4">
                    <div>
                      <p className="font-body text-[10px] text-text-tertiary font-semibold tracking-widest mb-0.5">PERÍODO</p>
                      <p className="font-data text-sm text-text-secondary">{formatMesAno(c.mes_inicio, c.ano_inicio)} → {formatMesAno(c.mes_fim, c.ano_fim)}</p>
                    </div>
                    <div>
                      <p className="font-body text-[10px] text-text-tertiary font-semibold tracking-widest mb-0.5">VALOR</p>
                      <p className="font-data text-sm font-semibold text-text-primary">{formatCurrencyBR(Number(c.valor_mensal))}/mês</p>
                    </div>
                    <div>
                      <p className="font-body text-[10px] text-text-tertiary font-semibold tracking-widest mb-0.5">REAJUSTE</p>
                      <span className="font-body text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {INDICE_REAJUSTE_LABEL[c.indice_reajuste] ?? 'Fixo'}
                        {Number(c.percentual_reajuste) > 0 && ` ${Number(c.percentual_reajuste).toFixed(1)}%`}
                      </span>
                    </div>
                    {c.contrato_origem_id && (
                      <span className="font-body text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-text-tertiary border border-surface-3">Reajustado</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Medições table */}
        {!isRelógioProprio && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-2 bg-surface-1 flex items-center justify-between">
              <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">HISTÓRICO DE MEDIÇÕES ({medicoes.length})</p>
              {medicoes.length > PAGE_SIZE && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMedicaoPage(p => Math.max(0, p - 1))}
                    disabled={medicaoPage === 0}
                    className="p-1 rounded hover:bg-surface-2 transition-colors disabled:opacity-30"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-text-secondary" />
                  </button>
                  <span className="font-data text-xs text-text-tertiary">
                    {medicaoPage + 1}/{Math.ceil(medicoes.length / PAGE_SIZE)}
                  </span>
                  <button
                    onClick={() => setMedicaoPage(p => Math.min(Math.ceil(medicoes.length / PAGE_SIZE) - 1, p + 1))}
                    disabled={medicaoPage >= Math.ceil(medicoes.length / PAGE_SIZE) - 1}
                    className="p-1 rounded hover:bg-surface-2 transition-colors disabled:opacity-30"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-text-secondary rotate-180" />
                  </button>
                </div>
              )}
            </div>
            {medicoes.length === 0 ? (
              <div className="p-10 text-center">
                <Zap className="w-10 h-10 text-text-disabled mx-auto mb-3" />
                <p className="font-body text-sm text-text-tertiary">Nenhuma medição registrada</p>
                <button onClick={() => navigate(`/imoveis/medicoes?sala=${id}`)} className="btn-primary mt-4 text-sm">
                  Registrar Primeira Medição
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-2 bg-surface-0">
                      <th className="text-left py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">COMPETÊNCIA</th>
                      <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">LEIT. ANT.</th>
                      <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">LEIT. ATUAL</th>
                      <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">CONSUMO</th>
                      <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">TARIFA</th>
                      <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">VALOR</th>
                      <th className="text-center py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">FOTO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-2">
                    {medicoes.slice(medicaoPage * PAGE_SIZE, (medicaoPage + 1) * PAGE_SIZE).map(m => {
                      const isZero = Number(m.consumo) === 0;
                      return (
                        <tr key={m.id} className={`hover:bg-surface-1/60 transition-colors ${isZero ? 'bg-status-warningLight/40' : ''}`}>
                          <td className="py-3 px-4 font-body text-sm text-text-primary font-medium">{formatMesAno(m.mes, m.ano)}</td>
                          <td className="py-3 px-4 font-data text-sm text-text-secondary text-right">{Number(m.leitura_anterior).toLocaleString('pt-BR')}</td>
                          <td className="py-3 px-4 font-data text-sm text-text-secondary text-right">{Number(m.leitura_atual).toLocaleString('pt-BR')}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isZero && <AlertTriangle className="w-3.5 h-3.5 text-status-warning flex-shrink-0" title="Consumo zerado" />}
                              <span className={`font-data text-sm font-semibold ${isZero ? 'text-status-warning' : 'text-mos-700'}`}>
                                {formatKWh(Number(m.consumo))}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-data text-xs text-text-tertiary text-right">
                            {Number(m.tarifa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-data text-sm text-text-primary font-semibold text-right">{formatCurrencyBR(Number(m.valor_total))}</td>
                          <td className="py-3 px-4 text-center">
                            {m.foto_url ? (
                              <button onClick={() => setFotoModal(m.foto_url)} title="Ver foto" className="inline-block">
                                <img
                                  src={m.foto_url}
                                  alt="Foto medidor"
                                  className="w-9 h-9 object-cover rounded-md border border-surface-3 hover:opacity-80 transition-opacity cursor-pointer mx-auto"
                                />
                              </button>
                            ) : (
                              <span className="font-body text-text-disabled text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Alugueis table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-2 bg-surface-1 flex items-center justify-between">
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">CONTROLE DE ALUGUEL ({alugueis.length})</p>
            {alugueis.length > PAGE_SIZE && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAluguelPage(p => Math.max(0, p - 1))}
                  disabled={aluguelPage === 0}
                  className="p-1 rounded hover:bg-surface-2 transition-colors disabled:opacity-30"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-text-secondary" />
                </button>
                <span className="font-data text-xs text-text-tertiary">
                  {aluguelPage + 1}/{Math.ceil(alugueis.length / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setAluguelPage(p => Math.min(Math.ceil(alugueis.length / PAGE_SIZE) - 1, p + 1))}
                  disabled={aluguelPage >= Math.ceil(alugueis.length / PAGE_SIZE) - 1}
                  className="p-1 rounded hover:bg-surface-2 transition-colors disabled:opacity-30"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-text-secondary rotate-180" />
                </button>
              </div>
            )}
          </div>
          {alugueis.length === 0 ? (
            <div className="p-10 text-center">
              <Home className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="font-body text-sm text-text-tertiary">Nenhum registro de aluguel</p>
              {isAdmin && (
                <p className="font-body text-xs text-text-tertiary mt-1">Crie um contrato de locação para gerar os registros mensais automaticamente.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-2 bg-surface-0">
                    <th className="text-left py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">COMPETÊNCIA</th>
                    <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">ORÇADO</th>
                    <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">REALIZADO</th>
                    <th className="text-center py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">STATUS</th>
                    <th className="text-center py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-2">
                  {alugueis.slice(aluguelPage * PAGE_SIZE, (aluguelPage + 1) * PAGE_SIZE).map(a => (
                    <tr key={a.id} className="hover:bg-surface-1/60 transition-colors">
                      <td className="py-3 px-4 font-body text-sm text-text-primary font-medium">{formatMesAno(a.mes, a.ano)}</td>
                      <td className="py-3 px-4 font-data text-sm text-text-secondary text-right">{formatCurrencyBR(Number(a.valor))}</td>
                      <td className="py-3 px-4 font-data text-sm font-semibold text-right">
                        {a.pago
                          ? <span className="text-status-success">{formatCurrencyBR(Number(a.valor))}</span>
                          : <span className="text-text-disabled">—</span>
                        }
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleTogglePago(a)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                            a.pago
                              ? 'bg-status-successLight text-status-success'
                              : 'bg-status-warningLight text-status-warning'
                          }`}
                        >
                          {a.pago ? <><Check className="w-3 h-3" /> PAGO</> : 'PENDENTE'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isAdmin ? (
                          <button onClick={() => setDeletingAluguelId(a.id)} className="p-1.5 rounded-lg hover:bg-status-errorLight transition-colors group mx-auto" title="Excluir">
                            <Trash2 className="w-3.5 h-3.5 text-text-tertiary group-hover:text-status-error transition-colors" />
                          </button>
                        ) : (
                          <span className="font-body text-text-disabled text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-surface-3 bg-surface-1">
                  <tr>
                    <td className="py-3 px-4 font-body text-xs font-semibold text-text-tertiary tracking-widest">TOTAL</td>
                    <td className="py-3 px-4 font-data text-sm font-bold text-text-secondary text-right">{formatCurrencyBR(totalAluguelOrcado)}</td>
                    <td className="py-3 px-4 font-data text-sm font-bold text-status-success text-right">{formatCurrencyBR(aluguelRealizado)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-data text-sm font-bold ${adimplenciaColor}`}>{adimplenciaPct.toFixed(0)}%</span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Fotos */}
        <SalaFotosGallery salaId={id!} isAdmin={isAdmin} />

        {/* Documentos */}
        <SalaDocumentosCard salaId={id!} isAdmin={isAdmin} />
      </div>

      {/* Contrato Modal */}
      {showContrato && sala && (
        <NovoContratoLocacaoModal
          sala={sala}
          initial={contrato}
          onClose={() => setShowContrato(false)}
          onSaved={() => { setShowContrato(false); fetchData(); }}
        />
      )}

      {/* Reajuste Modal */}
      {showReajuste && sala && contrato && (
        <NovoContratoLocacaoModal
          sala={sala}
          initial={contrato}
          isReajuste
          onClose={() => setShowReajuste(false)}
          onSaved={() => { setShowReajuste(false); fetchData(); }}
        />
      )}

      {/* Contrato PDF */}
      {showContratoPDF && sala && contrato && (
        <ContratoLocacaoPDF
          sala={sala}
          contrato={contrato}
          unidade={unidade}
          onClose={() => setShowContratoPDF(false)}
        />
      )}

      {/* Confirm encerrar contrato */}
      {showConfirmEncerrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowConfirmEncerrar(false)} />
          <div className="relative card p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-warningLight flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-status-warning" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-text-primary">Encerrar contrato</h3>
                <p className="font-body text-xs text-text-tertiary">Os registros futuros não pagos serão removidos</p>
              </div>
            </div>
            <p className="font-body text-sm text-text-secondary">
              Tem certeza que deseja encerrar o contrato de <strong className="text-text-primary">{sala?.nome}</strong>? Os registros de aluguel pendentes a partir do mês atual serão excluídos.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowConfirmEncerrar(false)} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleEncerrarContrato}
                disabled={encerrandoContrato}
                className="inline-flex items-center gap-2 px-4 py-2 bg-status-warning text-white font-body font-semibold text-sm rounded-lg hover:bg-status-warning/90 transition-colors"
              >
                {encerrandoContrato && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Encerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete aluguel */}
      {deletingAluguelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeletingAluguelId(null)} />
          <div className="relative card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-text-primary">Excluir registro</h3>
            <p className="font-body text-sm text-text-secondary">Tem certeza que deseja excluir este registro de aluguel?</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingAluguelId(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDeleteAluguel} className="px-4 py-2 bg-status-error text-white font-body font-semibold text-sm rounded-lg hover:bg-status-error/90 transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Foto modal */}
      {fotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setFotoModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative max-w-lg w-full">
            <img src={fotoModal} alt="Foto do medidor" className="w-full rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      {showConfirmArquivar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowConfirmArquivar(false)} />
          <div className="relative card p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-errorLight flex items-center justify-center flex-shrink-0">
                <Archive className="w-5 h-5 text-status-error" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-text-primary">Arquivar sala</h3>
                <p className="font-body text-xs text-text-tertiary">Esta ação pode ser revertida depois</p>
              </div>
            </div>
            <p className="font-body text-sm text-text-secondary">
              Tem certeza que deseja arquivar <strong className="text-text-primary">{sala?.nome}</strong>? A sala será marcada como desocupada e removida das listagens ativas.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowConfirmArquivar(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleArquivar} className="flex items-center gap-1.5 px-4 py-2 bg-status-error text-white font-body font-semibold text-sm rounded-lg hover:bg-status-error/90 transition-colors">
                <Archive className="w-3.5 h-3.5" />
                Arquivar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditSala && sala && unidade && (
        <NovaSalaModal
          unidadeId={sala.unidade_id}
          initial={sala}
          onClose={() => setShowEditSala(false)}
          onSaved={async () => {
            setShowEditSala(false);
            const { data } = await supabase.from('energia_salas').select('*').eq('id', id!).maybeSingle();
            if (data) setSala(data as EnergiaSala);
          }}
        />
      )}
    </EnergiaLayout>
  );
}
