import { useState, useEffect } from 'react';
import {
  X, Printer, Copy, Check, CheckCircle2, Zap, Home,
  Building2, ChevronRight, Loader2, AlertTriangle, User,
  Phone, Mail, Hash, Camera, FileText, LayoutList,
} from 'lucide-react';
import type {
  EnergiaFatura, EnergiaFaturaItem, EnergiaFaturaStatus,
  EnergiaUnidade, EnergiaSala, EnergiaMedicao,
} from '../types';
import { FATURA_STATUS_CONFIG, MESES_ABREV } from '../types';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR } from '../utils/calculos';

interface EnrichedItem extends EnergiaFaturaItem {
  sala?: EnergiaSala;
  medicao?: EnergiaMedicao;
}

interface Props {
  fatura: EnergiaFatura;
  unidade: EnergiaUnidade | undefined;
  onClose: () => void;
  onStatusChanged: (updated: EnergiaFatura) => void;
}

const STATUS_ORDER: EnergiaFaturaStatus[] = ['rascunho', 'enviada', 'visualizada', 'paga'];

function StatusPipeline({ current }: { current: EnergiaFaturaStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(current === 'vencida' ? 'enviada' : current);
  return (
    <div className="flex items-center">
      {STATUS_ORDER.map((s, i) => {
        const cfg = FATURA_STATUS_CONFIG[s];
        const done = i < currentIdx || (current === 'paga' && s !== 'paga');
        const active = s === current || (current === 'vencida' && s === 'enviada');
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                active ? `${cfg.bg} ${cfg.border} ${cfg.text} ring-2 ring-offset-2 ${cfg.border}` :
                done   ? 'bg-status-successLight border-status-success/40 text-status-success' :
                         'bg-surface-2 border-surface-3 text-text-secondary'
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`font-body text-[11px] font-semibold text-center whitespace-nowrap ${active ? cfg.text : done ? 'text-status-success' : 'text-text-secondary'}`}>
                {cfg.label}
              </span>
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1.5 mb-6 rounded-full ${done ? 'bg-status-success' : 'bg-surface-3'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Barcode display
function BarcodeStripes() {
  return (
    <div className="flex items-end gap-px h-10 px-1">
      {Array.from({ length: 80 }, (_, i) => (
        <div
          key={i}
          className="bg-gray-900 rounded-[1px]"
          style={{
            width: `${[1,2,1,3,2,1,2,1,3,2][i % 10]}px`,
            height: `${60 + (i % 3) * 20}%`,
          }}
        />
      ))}
    </div>
  );
}

export function FaturaDetalheModal({ fatura, unidade, onClose, onStatusChanged }: Props) {
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [savingStatus, setSavingStatus] = useState<EnergiaFaturaStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'resumo' | 'boleto'>('resumo');
  const [photoId, setPhotoId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoadingItems(true);
      const { data: itensData } = await supabase
        .from('energia_fatura_itens')
        .select('*')
        .eq('fatura_id', fatura.id)
        .order('tipo');

      const itens = (itensData as EnergiaFaturaItem[]) || [];
      if (itens.length === 0) { setItems([]); setLoadingItems(false); return; }

      const salaIds = [...new Set(itens.map(i => i.sala_id).filter(Boolean))] as string[];
      const medicaoIds = [...new Set(itens.map(i => i.medicao_id).filter(Boolean))] as string[];

      const [salasRes, medicoesRes] = await Promise.all([
        salaIds.length > 0
          ? supabase.from('energia_salas').select('*').in('id', salaIds)
          : Promise.resolve({ data: [] }),
        medicaoIds.length > 0
          ? supabase.from('energia_medicoes').select('*').in('id', medicaoIds)
          : Promise.resolve({ data: [] }),
      ]);

      const salaMap = new Map(((salasRes.data as EnergiaSala[]) || []).map(s => [s.id, s]));
      const medicaoMap = new Map(((medicoesRes.data as EnergiaMedicao[]) || []).map(m => [m.id, m]));

      setItems(itens.map(item => ({
        ...item,
        sala: item.sala_id ? salaMap.get(item.sala_id) : undefined,
        medicao: item.medicao_id ? medicaoMap.get(item.medicao_id) : undefined,
      })));
      setLoadingItems(false);
    }
    load();
  }, [fatura.id]);

  async function changeStatus(status: EnergiaFaturaStatus) {
    setSavingStatus(status);
    const extra: Record<string, string | null> = {};
    if (status === 'enviada') extra.data_envio = new Date().toISOString();
    if (status === 'paga') extra.data_pagamento = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('energia_faturas')
      .update({ status, ...extra })
      .eq('id', fatura.id)
      .select()
      .single();
    setSavingStatus(null);
    if (!error && data) onStatusChanged(data as EnergiaFatura);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const statusCfg = FATURA_STATUS_CONFIG[fatura.status];
  const competencia = `${MESES_ABREV[fatura.mes - 1]}/${fatura.ano}`;
  const currentIdx = STATUS_ORDER.indexOf(fatura.status === 'vencida' ? 'enviada' : fatura.status);
  const nextStatus = fatura.status !== 'vencida' && currentIdx < STATUS_ORDER.length - 1
    ? STATUS_ORDER[currentIdx + 1] : null;
  const nextCfg = nextStatus ? FATURA_STATUS_CONFIG[nextStatus] : null;

  const itensEnergia = items.filter(i => i.tipo === 'energia');
  const itensAluguel = items.filter(i => i.tipo === 'aluguel');

  const qrUrl = fatura.pix_chave
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(fatura.pix_chave)}&color=000000&bgcolor=ffffff`
    : null;

  // Primary locatario from the first sala with data (energia items have sala data)
  const primarySala = itensEnergia[0]?.sala ?? itensAluguel[0]?.sala;

  return (
    <>
      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto print:hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col">

          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2 flex-shrink-0">
            <div>
              <h2 className="font-display font-bold text-base text-text-primary">Fatura {competencia}</h2>
              <span className={`inline-flex items-center gap-1 font-body text-xs font-semibold px-2 py-0.5 rounded-full border mt-1 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg border border-surface-3 overflow-hidden">
                <button
                  onClick={() => setViewMode('resumo')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-body text-xs font-semibold transition-colors ${viewMode === 'resumo' ? 'bg-mos-700 text-white' : 'text-text-secondary hover:bg-surface-1'}`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  Resumo
                </button>
                <button
                  onClick={() => setViewMode('boleto')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-body text-xs font-semibold transition-colors ${viewMode === 'boleto' ? 'bg-mos-700 text-white' : 'text-text-secondary hover:bg-surface-1'}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Boleto
                </button>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-surface-3 font-body text-xs text-text-secondary hover:bg-surface-1 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
          </div>

          {/* Pipeline */}
          <div className="px-6 py-4 border-b border-surface-2">
            <p className="font-body text-xs font-bold text-text-secondary tracking-widest mb-4">CICLO DA FATURA</p>
            <StatusPipeline current={fatura.status} />
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {viewMode === 'resumo' ? (
              <ResumoView
                fatura={fatura}
                unidade={unidade}
                competencia={competencia}
                itensEnergia={itensEnergia}
                itensAluguel={itensAluguel}
                loadingItems={loadingItems}
                qrUrl={qrUrl}
                copied={copied}
                onCopy={copyText}
                onViewPhoto={setPhotoId}
              />
            ) : (
              <BoletoView
                fatura={fatura}
                unidade={unidade}
                competencia={competencia}
                primarySala={primarySala}
                itensEnergia={itensEnergia}
                itensAluguel={itensAluguel}
                loadingItems={loadingItems}
                qrUrl={qrUrl}
                copied={copied}
                onCopy={copyText}
                onViewPhoto={setPhotoId}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors"
            >
              Fechar
            </button>
            <div className="flex items-center gap-2">
              {fatura.status === 'vencida' && (
                <button
                  onClick={() => changeStatus('paga')}
                  disabled={savingStatus !== null}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-status-success text-white font-body text-sm font-medium hover:bg-status-success/90 transition-colors disabled:opacity-50"
                >
                  {savingStatus === 'paga' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Marcar como Paga
                </button>
              )}
              {nextStatus && nextCfg && fatura.status !== 'vencida' && (
                <button
                  onClick={() => changeStatus(nextStatus)}
                  disabled={savingStatus !== null}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-body text-sm font-medium transition-colors disabled:opacity-50 border ${nextCfg.bg} ${nextCfg.text} ${nextCfg.border} hover:brightness-95`}
                >
                  {savingStatus === nextStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Avançar para {nextCfg.label}
                </button>
              )}
              {fatura.status === 'paga' && (
                <span className="flex items-center gap-1.5 font-body text-sm text-status-success font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Paga
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photo lightbox */}
      {photoId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
          onClick={() => setPhotoId(null)}
        >
          <img src={photoId} alt="Foto do medidor" className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain" />
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            onClick={() => setPhotoId(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Print layout */}
      <PrintLayout
        fatura={fatura}
        unidade={unidade}
        competencia={competencia}
        primarySala={primarySala}
        itensEnergia={itensEnergia}
        itensAluguel={itensAluguel}
        qrUrl={qrUrl}
      />
    </>
  );
}

// ─── Resumo View ─────────────────────────────────────────────────────────────

interface ViewProps {
  fatura: EnergiaFatura;
  unidade: EnergiaUnidade | undefined;
  competencia: string;
  itensEnergia: EnrichedItem[];
  itensAluguel: EnrichedItem[];
  loadingItems: boolean;
  qrUrl: string | null;
  copied: boolean;
  onCopy: (text: string) => void;
  onViewPhoto: (url: string) => void;
}

function ResumoView({ fatura, unidade, competencia, itensEnergia, itensAluguel, loadingItems, qrUrl, copied, onCopy, onViewPhoto }: ViewProps) {
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-mos-700">
        <div>
          <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest">FATURA DE COBRANÇA</p>
          <h1 className="font-display font-extrabold text-2xl text-mos-700 mt-0.5">Competência {competencia}</h1>
          {unidade && (
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 className="w-3.5 h-3.5 text-text-tertiary" />
              <span className="font-body text-sm text-text-secondary">{unidade.nome}</span>
              {(unidade.cidade || unidade.estado) && (
                <span className="font-body text-sm text-text-tertiary">— {[unidade.cidade, unidade.estado].filter(Boolean).join(', ')}</span>
              )}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-body text-xs font-bold text-text-secondary">Emitida em</p>
          <p className="font-data text-xs font-semibold text-text-primary">{new Date(fatura.created_at).toLocaleDateString('pt-BR')}</p>
          {fatura.data_vencimento && (
            <>
              <p className="font-body text-xs font-bold text-text-secondary mt-1.5">Vencimento</p>
              <p className={`font-data text-xs font-semibold ${fatura.status === 'vencida' ? 'text-status-error' : 'text-text-primary'}`}>
                {new Date(fatura.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Destinatário */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Destinatário</p>
          <p className="font-body text-sm font-semibold text-text-primary">{fatura.destinatario_nome || '—'}</p>
          {fatura.destinatario_cpf_cnpj && <p className="font-data text-xs text-text-secondary">{fatura.destinatario_cpf_cnpj}</p>}
          {fatura.destinatario_email && <p className="font-body text-xs text-text-tertiary">{fatura.destinatario_email}</p>}
        </div>
        <div className="text-right">
          <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Total a Pagar</p>
          <p className="font-data font-extrabold text-2xl text-mos-700">{formatCurrencyBR(Number(fatura.valor_total))}</p>
        </div>
      </div>

      {/* Items */}
      {loadingItems ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-text-tertiary" /></div>
      ) : (
        <div className="space-y-4">
          {itensEnergia.length > 0 && (
            <ItemSection
              icon={<Zap className="w-3.5 h-3.5 text-mos-700" />}
              title="Energia Elétrica"
              items={itensEnergia}
              subtotal={Number(fatura.valor_energia)}
              showDetails
              onViewPhoto={onViewPhoto}
            />
          )}
          {itensAluguel.length > 0 && (
            <ItemSection
              icon={<Home className="w-3.5 h-3.5 text-text-secondary" />}
              title="Aluguel"
              items={itensAluguel}
              subtotal={Number(fatura.valor_aluguel)}
              showDetails={false}
              onViewPhoto={onViewPhoto}
            />
          )}

          {/* Total */}
          <div className="rounded-xl bg-mos-700 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-body text-xs text-white/80 uppercase tracking-wider font-semibold">Total Geral</p>
              {Number(fatura.valor_energia) > 0 && Number(fatura.valor_aluguel) > 0 && (
                <p className="font-body text-xs text-white/70 mt-0.5">
                  Energia {formatCurrencyBR(Number(fatura.valor_energia))} + Aluguel {formatCurrencyBR(Number(fatura.valor_aluguel))}
                </p>
              )}
            </div>
            <p className="font-data font-extrabold text-3xl text-white">{formatCurrencyBR(Number(fatura.valor_total))}</p>
          </div>
        </div>
      )}

      {/* Payment */}
      <PaymentSection fatura={fatura} qrUrl={qrUrl} copied={copied} onCopy={onCopy} />

      {/* Overdue alert */}
      {fatura.status === 'vencida' && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-status-errorLight border border-status-error/30">
          <AlertTriangle className="w-4 h-4 text-status-error flex-shrink-0" />
          <p className="font-body text-sm text-status-error font-medium">Esta fatura está vencida. Regularize o pagamento.</p>
        </div>
      )}

      {fatura.observacoes && (
        <div className="bg-surface-1 rounded-lg px-4 py-3 border border-surface-2">
          <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Observações</p>
          <p className="font-body text-sm text-text-primary whitespace-pre-wrap">{fatura.observacoes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Boleto View ─────────────────────────────────────────────────────────────

interface BoletoViewProps extends ViewProps {
  primarySala: EnergiaSala | undefined;
}

function BoletoView({ fatura, unidade, competencia, primarySala, itensEnergia, itensAluguel, loadingItems, qrUrl, copied, onCopy, onViewPhoto }: BoletoViewProps) {
  return (
    <div className="p-6 space-y-0 font-body">

      {/* Boleto header band */}
      <div className="flex items-stretch border border-gray-300 rounded-t-lg overflow-hidden">
        <div className="bg-mos-700 px-4 py-3 flex items-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 px-4 py-2 bg-gray-50 flex items-center justify-between gap-4 border-l border-gray-300">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Beneficiário</p>
            <p className="text-sm font-bold text-gray-900">{unidade?.nome || 'Administração'}</p>
            {unidade && (unidade.cidade || unidade.estado) && (
              <p className="text-xs text-gray-500">{[unidade.cidade, unidade.estado].filter(Boolean).join(' — ')}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Competência</p>
            <p className="text-base font-extrabold text-mos-700">{competencia}</p>
            <p className="text-[10px] text-gray-500">Emitida em {new Date(fatura.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Vencimento + Valor strip */}
      <div className="flex border-x border-b border-gray-300 divide-x divide-gray-300">
        <div className="flex-1 px-4 py-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vencimento</p>
          <p className={`text-sm font-bold ${fatura.status === 'vencida' ? 'text-red-600' : 'text-gray-900'}`}>
            {fatura.data_vencimento
              ? new Date(fatura.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')
              : 'A vista'}
          </p>
        </div>
        <div className="flex-1 px-4 py-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">N° Documento</p>
          <p className="text-sm font-mono text-gray-700">{fatura.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="px-4 py-2 text-right">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Valor do Documento</p>
          <p className="text-xl font-extrabold text-mos-700">{formatCurrencyBR(Number(fatura.valor_total))}</p>
        </div>
      </div>

      {/* Pagador */}
      <div className="border-x border-b border-gray-300 px-4 py-3">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Pagador (Locatário)</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900">
              {primarySala?.responsavel || fatura.destinatario_nome || '—'}
            </span>
          </div>
          {(primarySala?.cpf_cnpj || fatura.destinatario_cpf_cnpj) && (
            <div className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-mono text-gray-700">
                {primarySala?.cpf_cnpj || fatura.destinatario_cpf_cnpj}
              </span>
            </div>
          )}
          {(primarySala?.email || fatura.destinatario_email) && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600">{primarySala?.email || fatura.destinatario_email}</span>
            </div>
          )}
          {primarySala?.telefone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600">{primarySala.telefone}</span>
            </div>
          )}
          {primarySala && (
            <div className="flex items-center gap-1.5 col-span-2 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Sala: <span className="font-semibold text-gray-800">{primarySala.nome}</span>
                {unidade && <> — {unidade.nome}</>}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Items detail */}
      {loadingItems ? (
        <div className="border-x border-b border-gray-300 flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {itensEnergia.length > 0 && (
            <div className="border-x border-b border-gray-300">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-mos-700" />
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Energia Elétrica</p>
              </div>
              {itensEnergia.map(item => (
                <BoletoEnergiaRow key={item.id} item={item} onViewPhoto={onViewPhoto} />
              ))}
              <div className="flex justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
                <span className="text-xs font-bold text-gray-600 uppercase">Subtotal Energia</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrencyBR(Number(fatura.valor_energia))}</span>
              </div>
            </div>
          )}

          {itensAluguel.length > 0 && (
            <div className="border-x border-b border-gray-300">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Home className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Aluguel</p>
              </div>
              {itensAluguel.map(item => (
                <BoletoAluguelRow key={item.id} item={item} />
              ))}
              <div className="flex justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
                <span className="text-xs font-bold text-gray-600 uppercase">Subtotal Aluguel</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrencyBR(Number(fatura.valor_aluguel))}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Total geral */}
      <div className="flex items-center justify-between px-4 py-4 bg-mos-700 border border-mos-700 rounded-b-none">
        <div>
          <p className="text-xs text-white/80 font-bold uppercase tracking-wider">Total a Pagar</p>
          {Number(fatura.valor_energia) > 0 && Number(fatura.valor_aluguel) > 0 && (
            <p className="text-xs text-white/60 mt-0.5">
              Energia {formatCurrencyBR(Number(fatura.valor_energia))} + Aluguel {formatCurrencyBR(Number(fatura.valor_aluguel))}
            </p>
          )}
        </div>
        <p className="font-data font-extrabold text-3xl text-white">{formatCurrencyBR(Number(fatura.valor_total))}</p>
      </div>

      {/* Corte boleto */}
      <div className="flex items-center gap-2 py-3">
        <div className="flex-1 border-t border-dashed border-gray-400" />
        <span className="text-[10px] text-gray-400 font-body select-none">RECIBO DO PAGADOR</span>
        <div className="flex-1 border-t border-dashed border-gray-400" />
      </div>

      {/* Payment section */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Instruções de Pagamento</p>
        </div>
        <div className="p-4">
          {fatura.status === 'vencida' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 font-medium">Esta fatura está vencida. Entre em contato para regularização.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fatura.pix_chave && qrUrl && (
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-gray-200 bg-white">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Pague via PIX</p>
                <img src={qrUrl} alt="QR Code PIX" className="w-36 h-36 border border-gray-200 rounded-lg" loading="lazy" />
                <div className="w-full">
                  <p className="text-[10px] font-bold text-gray-500 mb-1">Chave PIX</p>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
                    <span className="font-mono text-xs text-gray-800 flex-1 truncate">{fatura.pix_chave}</span>
                    <button
                      onClick={() => onCopy(fatura.pix_chave!)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {fatura.codigo_barras && (
              <div className="flex flex-col gap-3 p-4 rounded-lg border border-gray-200 bg-white justify-center">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Boleto Bancário</p>
                <div className="bg-white border border-gray-200 rounded-lg py-3 px-4 flex justify-center overflow-hidden">
                  <BarcodeStripes />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 mb-1">Linha Digitável</p>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
                    <span className="font-mono text-[10px] text-gray-800 flex-1 break-all leading-relaxed">{fatura.codigo_barras}</span>
                    <button
                      onClick={() => onCopy(fatura.codigo_barras!)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>
                  {copied && <p className="text-[10px] text-green-600 mt-1">Copiado!</p>}
                </div>
              </div>
            )}
            {!fatura.pix_chave && !fatura.codigo_barras && (
              <p className="col-span-2 text-sm text-gray-500 text-center py-4">
                Nenhuma forma de pagamento configurada nesta fatura.
              </p>
            )}
          </div>
        </div>
      </div>

      {fatura.observacoes && (
        <div className="mt-4 p-4 rounded-lg bg-surface-1 border border-surface-2">
          <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Observações</p>
          <p className="font-body text-sm text-text-primary whitespace-pre-wrap">{fatura.observacoes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Boleto row components ────────────────────────────────────────────────────

function BoletoEnergiaRow({ item, onViewPhoto }: { item: EnrichedItem; onViewPhoto: (url: string) => void }) {
  const m = item.medicao;
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{item.descricao}</p>
          {m && (
            <div className="mt-1.5 grid grid-cols-4 gap-x-4 gap-y-0.5">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Leit. Ant.</p>
                <p className="text-xs font-mono text-gray-700">{Number(m.leitura_anterior).toLocaleString('pt-BR')} kWh</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Leit. Atual</p>
                <p className="text-xs font-mono text-gray-700">{Number(m.leitura_atual).toLocaleString('pt-BR')} kWh</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Consumo</p>
                <p className="text-xs font-mono font-semibold text-gray-900">{Number(m.consumo).toLocaleString('pt-BR')} kWh</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tarifa</p>
                <p className="text-xs font-mono text-gray-700">R$ {Number(m.tarifa).toFixed(4)}/kWh</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-start gap-2 flex-shrink-0">
          {m?.foto_url && (
            <button
              onClick={() => onViewPhoto(m.foto_url)}
              className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Ver foto do medidor"
            >
              <Camera className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-500">Foto</span>
            </button>
          )}
          <p className="text-sm font-bold text-gray-900 pt-0.5 min-w-[80px] text-right">{formatCurrencyBR(Number(item.valor))}</p>
        </div>
      </div>
    </div>
  );
}

function BoletoAluguelRow({ item }: { item: EnrichedItem }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-gray-900">{item.descricao}</p>
        {item.sala?.valor_aluguel != null && (
          <p className="text-xs text-gray-500 mt-0.5">
            Valor mensal da sala: {formatCurrencyBR(Number(item.sala.valor_aluguel))}
          </p>
        )}
      </div>
      <p className="text-sm font-bold text-gray-900 flex-shrink-0 ml-4">{formatCurrencyBR(Number(item.valor))}</p>
    </div>
  );
}

// ─── Shared ItemSection (Resumo) ─────────────────────────────────────────────

function ItemSection({
  icon, title, items, subtotal, showDetails, onViewPhoto,
}: {
  icon: React.ReactNode;
  title: string;
  items: EnrichedItem[];
  subtotal: number;
  showDetails: boolean;
  onViewPhoto: (url: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="font-body text-xs font-bold text-text-primary uppercase tracking-wider">{title}</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-2">
            <th className="text-left py-1.5 font-body text-xs font-bold text-text-secondary uppercase">Descrição</th>
            {showDetails && <th className="text-center py-1.5 font-body text-xs font-bold text-text-secondary uppercase hidden sm:table-cell">Consumo / Tarifa</th>}
            <th className="text-center py-1.5 font-body text-xs font-bold text-text-secondary uppercase w-10">Foto</th>
            <th className="text-right py-1.5 font-body text-xs font-bold text-text-secondary uppercase">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-1">
          {items.map(item => {
            const m = item.medicao;
            return (
              <tr key={item.id}>
                <td className="py-2">
                  <p className="font-body text-sm text-text-primary">{item.descricao}</p>
                  {showDetails && m && (
                    <p className="font-data text-[10px] text-text-tertiary mt-0.5">
                      {Number(m.leitura_anterior).toLocaleString('pt-BR')} → {Number(m.leitura_atual).toLocaleString('pt-BR')} kWh = {Number(m.consumo).toLocaleString('pt-BR')} kWh × R$ {Number(m.tarifa).toFixed(4)}
                    </p>
                  )}
                  {!showDetails && item.sala?.valor_aluguel != null && (
                    <p className="font-data text-[10px] text-text-tertiary mt-0.5">
                      Aluguel mensal: {formatCurrencyBR(Number(item.sala.valor_aluguel))}
                    </p>
                  )}
                </td>
                {showDetails && (
                  <td className="py-2 text-center hidden sm:table-cell">
                    {m && (
                      <span className="font-data text-xs text-text-secondary">
                        {Number(m.consumo).toLocaleString('pt-BR')} kWh
                      </span>
                    )}
                  </td>
                )}
                <td className="py-2 text-center">
                  {m?.foto_url ? (
                    <button
                      onClick={() => onViewPhoto(m.foto_url)}
                      className="mx-auto flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden border border-surface-3 hover:border-mos-700/40 transition-colors"
                      title="Ver foto"
                    >
                      <img src={m.foto_url} alt="medidor" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <span className="font-body text-xs text-text-disabled">—</span>
                  )}
                </td>
                <td className="py-2 text-right font-data text-sm font-semibold text-text-primary">
                  {formatCurrencyBR(Number(item.valor))}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-surface-2">
            <td colSpan={showDetails ? 3 : 2} className="py-2 font-body text-sm font-bold text-text-primary">Subtotal {title}</td>
            <td className="py-2 text-right font-data text-sm font-bold text-text-primary">{formatCurrencyBR(subtotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Payment section (Resumo) ─────────────────────────────────────────────────

function PaymentSection({ fatura, qrUrl, copied, onCopy }: {
  fatura: EnergiaFatura;
  qrUrl: string | null;
  copied: boolean;
  onCopy: (text: string) => void;
}) {
  if (!fatura.pix_chave && !fatura.codigo_barras) return null;
  return (
    <div className="border-t border-surface-2 pt-4">
      <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Como Pagar</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fatura.pix_chave && qrUrl && (
          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-surface-2 bg-surface-1">
            <p className="font-body text-xs font-semibold text-text-primary">Pague via PIX</p>
            <img src={qrUrl} alt="QR Code PIX" className="w-40 h-40 rounded-lg border border-surface-3" loading="lazy" />
            <div className="w-full">
              <p className="font-body text-xs font-bold text-text-secondary mb-1">Chave PIX</p>
              <div className="flex items-center gap-2 bg-white border border-surface-3 rounded-md px-3 py-1.5">
                <span className="font-data text-xs text-text-primary flex-1 truncate">{fatura.pix_chave}</span>
                <button onClick={() => onCopy(fatura.pix_chave!)} className="flex-shrink-0 p-0.5 rounded hover:bg-surface-2 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3 text-text-tertiary" />}
                </button>
              </div>
            </div>
          </div>
        )}
        {fatura.codigo_barras && (
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-surface-2 bg-surface-1 justify-center">
            <p className="font-body text-xs font-semibold text-text-primary">Boleto Bancário</p>
            <div className="h-16 bg-white border border-surface-3 rounded-lg flex items-center justify-center overflow-hidden">
              <BarcodeStripes />
            </div>
            <div>
              <p className="font-body text-xs font-bold text-text-secondary mb-1">Linha digitável</p>
              <div className="flex items-center gap-2 bg-white border border-surface-3 rounded-md px-3 py-1.5">
                <span className="font-data text-[10px] text-text-primary flex-1 break-all leading-relaxed">{fatura.codigo_barras}</span>
                <button onClick={() => onCopy(fatura.codigo_barras!)} className="flex-shrink-0 p-0.5 rounded hover:bg-surface-2 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3 text-text-tertiary" />}
                </button>
              </div>
              {copied && <p className="font-body text-xs text-status-success mt-1">Copiado!</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Print Layout ─────────────────────────────────────────────────────────────

function PrintLayout({
  fatura, unidade, competencia, primarySala, itensEnergia, itensAluguel, qrUrl,
}: {
  fatura: EnergiaFatura;
  unidade: EnergiaUnidade | undefined;
  competencia: string;
  primarySala: EnergiaSala | undefined;
  itensEnergia: EnrichedItem[];
  itensAluguel: EnrichedItem[];
  qrUrl: string | null;
}) {
  return (
    <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:z-[999] print:overflow-auto">
      <div className="max-w-2xl mx-auto space-y-0 text-sm">

        {/* Header */}
        <div className="flex items-stretch border border-gray-300 overflow-hidden">
          <div className="bg-gray-900 px-4 py-3 flex items-center flex-shrink-0">
            <span className="text-white font-bold text-sm">⚡</span>
          </div>
          <div className="flex-1 px-4 py-2 bg-gray-50 flex items-center justify-between border-l border-gray-300">
            <div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Beneficiário</p>
              <p className="text-sm font-bold text-gray-900">{unidade?.nome || 'Administração'}</p>
              {unidade && (unidade.cidade || unidade.estado) && (
                <p className="text-xs text-gray-500">{[unidade.cidade, unidade.estado].filter(Boolean).join(' — ')}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-gray-500 uppercase">Competência</p>
              <p className="text-base font-extrabold" style={{ color: '#610000' }}>{competencia}</p>
              {fatura.data_vencimento && (
                <>
                  <p className="text-[9px] text-gray-500">Vencimento</p>
                  <p className="text-xs font-bold text-gray-900">
                    {new Date(fatura.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="px-4 py-2 border-l border-gray-300 flex flex-col justify-center items-end">
            <p className="text-[9px] font-bold text-gray-500 uppercase">Valor</p>
            <p className="text-xl font-extrabold" style={{ color: '#610000' }}>{formatCurrencyBR(Number(fatura.valor_total))}</p>
          </div>
        </div>

        {/* Pagador */}
        <div className="border-x border-b border-gray-300 px-4 py-2">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Pagador</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="font-semibold text-gray-900">{primarySala?.responsavel || fatura.destinatario_nome}</span>
            {(primarySala?.cpf_cnpj || fatura.destinatario_cpf_cnpj) && (
              <span className="font-mono text-gray-700">{primarySala?.cpf_cnpj || fatura.destinatario_cpf_cnpj}</span>
            )}
            {primarySala && (
              <span className="col-span-2 text-gray-600">Sala: {primarySala.nome}{unidade ? ` — ${unidade.nome}` : ''}</span>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="w-full border-collapse text-xs border-x border-b border-gray-300">
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th className="text-left px-4 py-2 text-gray-500 font-bold uppercase text-[9px] tracking-wider">Descrição</th>
              <th className="text-center px-2 py-2 text-gray-500 font-bold uppercase text-[9px]">Leit. Ant.</th>
              <th className="text-center px-2 py-2 text-gray-500 font-bold uppercase text-[9px]">Leit. Atual</th>
              <th className="text-center px-2 py-2 text-gray-500 font-bold uppercase text-[9px]">Consumo</th>
              <th className="text-center px-2 py-2 text-gray-500 font-bold uppercase text-[9px]">Tarifa</th>
              <th className="text-right px-4 py-2 text-gray-500 font-bold uppercase text-[9px]">Valor</th>
            </tr>
          </thead>
          <tbody>
            {itensEnergia.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td className="px-4 py-2 text-gray-800">{item.descricao}</td>
                <td className="px-2 py-2 text-center font-mono text-gray-600">{item.medicao ? Number(item.medicao.leitura_anterior).toLocaleString('pt-BR') : '—'}</td>
                <td className="px-2 py-2 text-center font-mono text-gray-600">{item.medicao ? Number(item.medicao.leitura_atual).toLocaleString('pt-BR') : '—'}</td>
                <td className="px-2 py-2 text-center font-mono font-semibold text-gray-900">{item.medicao ? `${Number(item.medicao.consumo).toLocaleString('pt-BR')} kWh` : '—'}</td>
                <td className="px-2 py-2 text-center font-mono text-gray-600">{item.medicao ? `R$ ${Number(item.medicao.tarifa).toFixed(4)}` : '—'}</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatCurrencyBR(Number(item.valor))}</td>
              </tr>
            ))}
            {itensAluguel.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td className="px-4 py-2 text-gray-800">{item.descricao}</td>
                <td colSpan={4} className="px-2 py-2 text-center text-gray-400 text-[10px]">
                  {item.sala?.valor_aluguel != null ? `Aluguel mensal: ${formatCurrencyBR(Number(item.sala.valor_aluguel))}` : ''}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatCurrencyBR(Number(item.valor))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: '#610000', borderRadius: '0 0 4px 4px' }}>
          <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Total a Pagar</span>
          <span className="text-white text-2xl font-extrabold">{formatCurrencyBR(Number(fatura.valor_total))}</span>
        </div>

        {/* Corte */}
        <div className="flex items-center gap-2 py-3">
          <div className="flex-1" style={{ borderTop: '1px dashed #9ca3af' }} />
          <span className="text-[9px] text-gray-400">RECIBO DO PAGADOR</span>
          <div className="flex-1" style={{ borderTop: '1px dashed #9ca3af' }} />
        </div>

        {/* Payment */}
        {(fatura.pix_chave || fatura.codigo_barras) && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: '12px' }}>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Pagamento</p>
            <div className="flex gap-6">
              {fatura.pix_chave && qrUrl && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs font-semibold text-gray-700">PIX</p>
                  <img src={qrUrl} alt="QR Code" style={{ width: 100, height: 100 }} />
                  <p className="font-mono text-[9px] text-gray-600 max-w-[100px] break-all text-center">{fatura.pix_chave}</p>
                </div>
              )}
              {fatura.codigo_barras && (
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Linha Digitável</p>
                  <p className="font-mono text-xs text-gray-800 break-all">{fatura.codigo_barras}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {fatura.observacoes && (
          <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Observações</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{fatura.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
