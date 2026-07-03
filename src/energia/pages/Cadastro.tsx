import { useState, useEffect, useMemo } from 'react';
import {
  Building2, DoorOpen, User, FileText, Search, Plus,
  Pencil, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, Archive, ChevronDown, SplitSquareVertical,
} from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { NovaSalaModal } from '../components/NovaSalaModal';
import { NovoInquilinoModal } from '../components/NovoInquilinoModal';
import { NovoContratoLocacaoModal } from '../components/NovoContratoLocacaoModal';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { useTiposSala } from '../hooks/useTiposSala';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatMesAno, getMesAtual, getAnoAtual } from '../utils/calculos';
import { INDICE_REAJUSTE_LABEL } from '../types';
import type {
  EnergiaSala, EnergiaUnidade, EnergiaInquilino,
  EnergiaContratoLocacao,
} from '../types';

type CadastroTab = 'imoveis' | 'inquilinos' | 'contratos';

// ─── Contract status helpers ──────────────────────────────────────────────────

type ContratoStatus = 'ativo' | 'a_vencer' | 'encerrado';

function getContratoStatus(c: EnergiaContratoLocacao): ContratoStatus {
  if (!c.ativo) return 'encerrado';
  const currentValue = getAnoAtual() * 12 + getMesAtual();
  const fimValue = c.ano_fim * 12 + c.mes_fim;
  if (fimValue - currentValue <= 2) return 'a_vencer';
  return 'ativo';
}

const STATUS_CONFIG: Record<ContratoStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  ativo:     { label: 'Ativo',       bg: 'bg-status-successLight', text: 'text-status-success', icon: CheckCircle2 },
  a_vencer:  { label: 'A vencer',    bg: 'bg-status-warningLight', text: 'text-status-warning', icon: Clock         },
  encerrado: { label: 'Encerrado',   bg: 'bg-surface-2',           text: 'text-text-disabled',  icon: Archive        },
};

// ─── Types for joined query ───────────────────────────────────────────────────

type ContratoRow = EnergiaContratoLocacao & {
  sala: (EnergiaSala & { unidade: EnergiaUnidade | null }) | null;
  inquilino: EnergiaInquilino | null;
};

// ─── Sub-tab: Imóveis ─────────────────────────────────────────────────────────

function ImoveisTab({
  salas,
  unidades,
  loading,
  onRefresh,
}: {
  salas: EnergiaSala[];
  unidades: EnergiaUnidade[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const { isAdmin } = useEnergiaAuth();
  const { getLabel } = useTiposSala();
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<'todas' | 'ocupadas' | 'desocupadas'>('todas');
  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSala, setEditSala] = useState<EnergiaSala | null>(null);

  const unidadeMap = new Map(unidades.map(u => [u.id, u]));
  const ativas = salas.filter(s => !s.arquivada);

  const filtered = ativas.filter(s => {
    const unidade = unidadeMap.get(s.unidade_id);
    if (search && !s.nome.toLowerCase().includes(search.toLowerCase()) &&
        !(unidade?.nome ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAtivo === 'ocupadas' && !s.ativo) return false;
    if (filterAtivo === 'desocupadas' && s.ativo) return false;
    if (filterUnidadeId && s.unidade_id !== filterUnidadeId) return false;
    return true;
  });

  const ocupadas = ativas.filter(s => s.ativo).length;

  function openNew() {
    setEditSala(null);
    setShowModal(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">IMÓVEIS</h2>
          <p className="font-body text-sm text-text-tertiary mt-0.5">
            {ocupadas} ocupados · {ativas.length - ocupadas} disponíveis
          </p>
        </div>
        <button
          onClick={openNew}
          disabled={unidades.length === 0}
          className="flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-2.5 rounded-xl shadow-modal transition-transform duration-[120ms] hover:scale-[1.03] active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Novo Imóvel
        </button>
      </div>

      {unidades.length === 0 && !loading && (
        <div className="flex items-start gap-3 px-4 py-3 bg-status-warningLight border border-status-warning/30 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-status-warning mt-0.5 flex-shrink-0" />
          <p className="font-body text-sm text-status-warning">
            Cadastre pelo menos uma Unidade (prédio) em{' '}
            <a href="/imoveis/unidades" className="font-semibold underline">Unidades</a>{' '}
            antes de adicionar imóveis.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar imóvel ou unidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 shadow-card"
          />
        </div>
        {isAdmin && unidades.length > 1 && (
          <div className="relative">
            <select
              value={filterUnidadeId}
              onChange={e => setFilterUnidadeId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none shadow-card cursor-pointer"
            >
              <option value="">Todas Unidades</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          </div>
        )}
        <div className="flex items-center gap-1">
          {(['todas', 'ocupadas', 'desocupadas'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterAtivo(f)}
              className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
                filterAtivo === f
                  ? 'bg-text-primary text-white'
                  : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'
              }`}
            >
              {f === 'todas' ? 'Todas' : f === 'ocupadas' ? 'Ocupadas' : 'Disponíveis'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <DoorOpen className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="font-body text-sm text-text-tertiary">
            {ativas.length === 0 ? 'Nenhum imóvel cadastrado' : 'Nenhum imóvel encontrado'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-surface-2">
          {filtered.map(sala => {
            const unidade = unidadeMap.get(sala.unidade_id);
            return (
              <div key={sala.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-1 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                    <DoorOpen className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-body font-medium text-sm text-text-primary truncate">{sala.nome}</p>
                      {(sala.medicao_tipo ?? 'medido') === 'relogio_proprio' && (
                        <span className="hidden sm:inline-flex items-center gap-1 font-body text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                          <SplitSquareVertical className="w-2.5 h-2.5" />REL. PRÓPRIO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs text-text-tertiary">{getLabel(sala.tipo_sala)}</span>
                      {unidade && (
                        <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                          <Building2 className="w-3 h-3" />{unidade.nome}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`font-body text-[10px] font-semibold px-2 py-0.5 rounded tracking-wider ${
                    sala.ativo ? 'badge-saudavel' : 'text-text-tertiary bg-surface-2'
                  }`}>
                    {sala.ativo ? 'OCUPADO' : 'DISPONÍVEL'}
                  </span>
                  <button
                    onClick={() => { setEditSala(sala); setShowModal(true); }}
                    className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors opacity-0 group-hover:opacity-100"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-text-disabled group-hover:text-text-secondary transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        unidades.length === 0 ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative card p-6 max-w-sm w-full text-center">
              <DoorOpen className="w-8 h-8 text-text-disabled mx-auto mb-3" />
              <p className="font-body text-sm text-text-secondary mb-4">
                Cadastre uma unidade antes de adicionar imóveis.
              </p>
              <button onClick={() => setShowModal(false)} className="btn-primary">Fechar</button>
            </div>
          </div>
        ) : (
          <NovaSalaModal
            unidadeId={editSala?.unidade_id ?? unidades[0]?.id}
            unidades={!editSala ? unidades : undefined}
            initial={editSala ?? undefined}
            onClose={() => setShowModal(false)}
            onSaved={() => { setShowModal(false); onRefresh(); }}
          />
        )
      )}
    </div>
  );
}

// ─── Sub-tab: Inquilinos ──────────────────────────────────────────────────────

function InquilinosTab({
  inquilinos,
  contratos,
  loading,
  onRefresh,
}: {
  inquilinos: EnergiaInquilino[];
  contratos: ContratoRow[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [showModal, setShowModal] = useState(false);
  const [editInquilino, setEditInquilino] = useState<EnergiaInquilino | null>(null);

  const contratosAtivosMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contratos) {
      if (c.ativo && c.inquilino_id) {
        map.set(c.inquilino_id, (map.get(c.inquilino_id) ?? 0) + 1);
      }
    }
    return map;
  }, [contratos]);

  const filtered = inquilinos.filter(i => {
    if (search && !i.nome.toLowerCase().includes(search.toLowerCase()) &&
        !i.cpf_cnpj.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAtivo === 'ativos' && !i.ativo) return false;
    if (filterAtivo === 'inativos' && i.ativo) return false;
    return true;
  });

  const ativos = inquilinos.filter(i => i.ativo).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">INQUILINOS</h2>
          <p className="font-body text-sm text-text-tertiary mt-0.5">
            {ativos} ativos · {inquilinos.length - ativos} inativos
          </p>
        </div>
        <button
          onClick={() => { setEditInquilino(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-2.5 rounded-xl shadow-modal transition-transform duration-[120ms] hover:scale-[1.03] active:scale-[0.95]"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Novo Inquilino
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar nome ou CPF/CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 shadow-card"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['todos', 'ativos', 'inativos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterAtivo(f)}
              className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 capitalize ${
                filterAtivo === f
                  ? 'bg-text-primary text-white'
                  : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <User className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="font-body text-sm text-text-tertiary">
            {inquilinos.length === 0 ? 'Nenhum inquilino cadastrado' : 'Nenhum inquilino encontrado'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-surface-2">
          {filtered.map(inq => {
            const contratosAtivos = contratosAtivosMap.get(inq.id) ?? 0;
            return (
              <div key={inq.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-1 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-surface-1 flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-bold text-[11px] text-text-secondary">
                      {inq.nome.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-body font-medium text-sm text-text-primary truncate">{inq.nome}</p>
                      {!inq.ativo && (
                        <span className="font-body text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-2 text-text-disabled tracking-wider flex-shrink-0">
                          INATIVO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-body text-xs text-text-tertiary font-data">{inq.cpf_cnpj || '—'}</span>
                      {inq.email && (
                        <span className="font-body text-xs text-text-tertiary truncate hidden sm:block">{inq.email}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {contratosAtivos > 0 && (
                    <span className="font-body text-xs text-text-secondary hidden sm:block">
                      {contratosAtivos} contrato{contratosAtivos > 1 ? 's' : ''} ativo{contratosAtivos > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className={`font-body text-[10px] font-semibold px-2 py-0.5 rounded tracking-wider ${
                    inq.ativo ? 'badge-saudavel' : 'text-text-disabled bg-surface-2'
                  }`}>
                    {inq.ativo ? 'ATIVO' : 'INATIVO'}
                  </span>
                  <button
                    onClick={() => { setEditInquilino(inq); setShowModal(true); }}
                    className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors opacity-0 group-hover:opacity-100"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NovoInquilinoModal
          initial={editInquilino ?? undefined}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Sub-tab: Contratos ───────────────────────────────────────────────────────

function ContratosTab({
  contratos,
  salas,
  unidades,
  inquilinos,
  loading,
  onRefresh,
}: {
  contratos: ContratoRow[];
  salas: EnergiaSala[];
  unidades: EnergiaUnidade[];
  inquilinos: EnergiaInquilino[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'encerrados'>('todos');
  const [filterInquilinoId, setFilterInquilinoId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editContrato, setEditContrato] = useState<ContratoRow | null>(null);

  const salasFiltradas = salas.filter(s => !s.arquivada);

  const filtered = contratos.filter(c => {
    const salaNome = c.sala?.nome ?? '';
    const inquilinoNome = c.inquilino?.nome ?? '';
    if (search &&
        !salaNome.toLowerCase().includes(search.toLowerCase()) &&
        !inquilinoNome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === 'ativos' && !c.ativo) return false;
    if (filterStatus === 'encerrados' && c.ativo) return false;
    if (filterInquilinoId && c.inquilino_id !== filterInquilinoId) return false;
    return true;
  });

  const ativos = contratos.filter(c => c.ativo).length;
  const aVencer = contratos.filter(c => getContratoStatus(c) === 'a_vencer').length;
  const canCreate = salasFiltradas.length > 0 && inquilinos.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">CONTRATOS</h2>
          <p className="font-body text-sm text-text-tertiary mt-0.5">
            {ativos} ativos
            {aVencer > 0 && <span className="text-status-warning"> · {aVencer} a vencer</span>}
          </p>
        </div>
        <button
          onClick={() => { setEditContrato(null); setShowModal(true); }}
          disabled={!canCreate}
          title={!canCreate ? 'Cadastre imóveis e inquilinos primeiro' : undefined}
          className="flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-2.5 rounded-xl shadow-modal transition-transform duration-[120ms] hover:scale-[1.03] active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Novo Contrato
        </button>
      </div>

      {/* Prerequisites warning */}
      {!loading && (salasFiltradas.length === 0 || inquilinos.length === 0) && (
        <div className="flex items-start gap-3 px-4 py-3 bg-status-warningLight border border-status-warning/30 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-status-warning mt-0.5 flex-shrink-0" />
          <p className="font-body text-sm text-status-warning">
            Para criar contratos, você precisa ter{' '}
            {salasFiltradas.length === 0 && <strong>pelo menos um imóvel cadastrado</strong>}
            {salasFiltradas.length === 0 && inquilinos.length === 0 && ' e '}
            {inquilinos.length === 0 && <strong>pelo menos um inquilino cadastrado</strong>}.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar imóvel ou inquilino..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 shadow-card"
          />
        </div>
        {inquilinos.length > 0 && (
          <div className="relative">
            <select
              value={filterInquilinoId}
              onChange={e => setFilterInquilinoId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none shadow-card cursor-pointer"
            >
              <option value="">Todos Inquilinos</option>
              {inquilinos.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
            <User className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          </div>
        )}
        <div className="flex items-center gap-1">
          {(['todos', 'ativos', 'encerrados'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
                filterStatus === f
                  ? 'bg-text-primary text-white'
                  : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : 'Encerrados'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="font-body text-sm text-text-tertiary">
            {contratos.length === 0 ? 'Nenhum contrato cadastrado' : 'Nenhum contrato encontrado'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-surface-2">
          {filtered.map(c => {
            const status = getContratoStatus(c);
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;
            return (
              <div key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-1 transition-colors group">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${cfg.text}`} />
                  </div>
                  <div className="min-w-0">
                    {/* Sala + Unidade */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-body font-semibold text-sm text-text-primary">
                        {c.sala?.nome ?? '—'}
                      </p>
                      {c.sala?.unidade && (
                        <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                          <Building2 className="w-3 h-3" />
                          {c.sala.unidade.nome}
                        </span>
                      )}
                    </div>
                    {/* Inquilino */}
                    {c.inquilino && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-text-tertiary flex-shrink-0" />
                        <span className="font-body text-xs text-text-secondary">{c.inquilino.nome}</span>
                      </div>
                    )}
                    {/* Contract meta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className="font-data text-sm font-semibold text-text-primary">
                        {formatCurrencyBR(Number(c.valor_mensal))}<span className="font-body text-xs text-text-tertiary font-normal">/mês</span>
                      </span>
                      <span className="font-body text-xs text-text-tertiary">
                        {formatMesAno(c.mes_inicio, c.ano_inicio)} → {formatMesAno(c.mes_fim, c.ano_fim)}
                      </span>
                      <span className="font-body text-xs text-text-tertiary hidden sm:inline">
                        Vence dia {c.dia_vencimento} · {INDICE_REAJUSTE_LABEL[c.indice_reajuste]}
                        {c.percentual_reajuste > 0 ? ` ${c.percentual_reajuste}%` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className={`font-body text-[10px] font-semibold px-2 py-0.5 rounded tracking-wider ${cfg.bg} ${cfg.text}`}>
                    {cfg.label.toUpperCase()}
                  </span>
                  <button
                    onClick={() => { setEditContrato(c); setShowModal(true); }}
                    className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors opacity-0 group-hover:opacity-100"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NovoContratoLocacaoModal
          sala={editContrato?.sala ?? null}
          salas={!editContrato ? salasFiltradas : undefined}
          unidades={!editContrato ? unidades : undefined}
          inquilinos={inquilinos}
          initial={editContrato}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Cadastro() {
  const { user, isAdmin } = useEnergiaAuth();
  const [tab, setTab] = useState<CadastroTab>('imoveis');
  const [salas, setSalas] = useState<EnergiaSala[]>([]);
  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [inquilinos, setInquilinos] = useState<EnergiaInquilino[]>([]);
  const [contratos, setContratos] = useState<ContratoRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    let sQuery = supabase.from('energia_salas').select('*').order('nome');
    if (!isAdmin && user?.unidade_id) sQuery = sQuery.eq('unidade_id', user.unidade_id);

    const [sRes, uRes, iRes, cRes] = await Promise.all([
      sQuery,
      supabase.from('energia_unidades').select('*').order('nome'),
      supabase.from('energia_inquilinos').select('*').order('nome'),
      supabase
        .from('energia_contratos_locacao')
        .select('*, sala:energia_salas(*, unidade:energia_unidades(*)), inquilino:energia_inquilinos(*)')
        .order('created_at', { ascending: false }),
    ]);

    setSalas((sRes.data as EnergiaSala[]) || []);
    setUnidades((uRes.data as EnergiaUnidade[]) || []);
    setInquilinos((iRes.data as EnergiaInquilino[]) || []);
    setContratos((cRes.data as ContratoRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [isAdmin, user]);

  const TABS: { key: CadastroTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'imoveis',    label: 'Imóveis',   icon: DoorOpen,   count: salas.filter(s => !s.arquivada).length },
    { key: 'inquilinos', label: 'Inquilinos', icon: User,       count: inquilinos.length },
    { key: 'contratos',  label: 'Contratos',  icon: FileText,   count: contratos.filter(c => c.ativo).length },
  ];

  return (
    <EnergiaLayout title="Cadastro" subtitle="Imóveis, inquilinos e contratos">
      <div className="p-6 space-y-6">
        {/* Page header */}
        <div>
          <p className="font-body text-xs font-bold text-text-secondary tracking-widest mb-1">GESTÃO</p>
          <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">CADASTRO</h1>
          <p className="font-body text-sm text-text-tertiary mt-1">
            Registre imóveis, inquilinos e contratos em sequência
          </p>
        </div>

        {/* Flow indicator */}
        <div className="flex items-center gap-2 text-sm font-body text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-mos-700 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">1</span>
            Imóvel
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-text-disabled" />
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-mos-700 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">2</span>
            Inquilino
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-text-disabled" />
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-mos-700 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">3</span>
            Contrato
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface-1 rounded-xl p-1 border border-surface-2 w-fit flex-wrap">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-text-primary shadow-card border border-surface-2'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full font-data text-[10px] font-bold ${
                    isActive ? 'bg-mos-700 text-white' : 'bg-surface-3 text-text-secondary'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === 'imoveis' && (
          <ImoveisTab
            salas={salas}
            unidades={unidades}
            loading={loading}
            onRefresh={fetchData}
          />
        )}
        {tab === 'inquilinos' && (
          <InquilinosTab
            inquilinos={inquilinos}
            contratos={contratos}
            loading={loading}
            onRefresh={fetchData}
          />
        )}
        {tab === 'contratos' && (
          <ContratosTab
            contratos={contratos}
            salas={salas}
            unidades={unidades}
            inquilinos={inquilinos}
            loading={loading}
            onRefresh={fetchData}
          />
        )}
      </div>
    </EnergiaLayout>
  );
}
