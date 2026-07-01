import { useState, useEffect } from 'react';
import {
  X, CheckCircle2, Clock, XCircle, Minus, Building2, Phone, Mail,
  MapPin, CreditCard, FileText, ExternalLink, Tag, Loader2,
} from 'lucide-react';
import type { Medicao, Fornecedor, MedicaoAnexo, EapCategoria, MedicaoStatus } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { formatCurrencyFull } from '../../lib/formatters';

interface MedicaoDetalheModalProps {
  medicao: Medicao;
  onClose: () => void;
}

const CAT_LABELS: Record<string, string> = {
  infraestrutura: 'Infraestrutura',
  superestrutura: 'Superestrutura',
  instalacoes: 'Instalações Prediais',
  acabamentos: 'Acabamentos',
  extra: 'Extra',
};

const STATUS_CONFIG: Record<MedicaoStatus, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  aprovada: { label: 'Aprovada', icon: <CheckCircle2 className="w-3.5 h-3.5" />, bg: 'bg-status-successLight', text: 'text-status-success' },
  pendente: { label: 'Pendente', icon: <Clock className="w-3.5 h-3.5" />, bg: 'bg-status-warningLight', text: 'text-status-warning' },
  reprovada: { label: 'Reprovada', icon: <XCircle className="w-3.5 h-3.5" />, bg: 'bg-status-errorLight', text: 'text-status-error' },
  a_medir: { label: 'A Medir', icon: <Minus className="w-3.5 h-3.5" />, bg: 'bg-surface-2', text: 'text-text-disabled' },
};

function computeValorTotal(m: Medicao): number {
  if (m.qtd_medida != null && m.qtd_medida > 0) return m.qtd_medida * (m.valor_unitario || 0);
  if (m.valor_total != null && m.valor_total > 0) return m.valor_total;
  return (m.qtd_orcada || 0) * (m.valor_unitario || 0);
}

function AnexoCard({ anexo }: { anexo: MedicaoAnexo }) {
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(anexo.tipo);
  return (
    <a
      href={anexo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2.5 p-3 rounded-lg border border-surface-2 hover:border-mos-700 hover:bg-surface-1 transition-all group"
    >
      {isImage ? (
        <img src={anexo.url} alt={anexo.nome} className="w-10 h-10 rounded object-cover flex-shrink-0 border border-surface-2" />
      ) : (
        <div className="w-10 h-10 rounded bg-status-errorLight flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-status-error" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-body text-xs text-text-primary truncate leading-tight">{anexo.nome}</p>
        <p className="font-data text-[10px] text-text-tertiary uppercase mt-0.5">{anexo.tipo || 'arquivo'}</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-text-disabled group-hover:text-mos-700 flex-shrink-0 mt-0.5 transition-colors" />
    </a>
  );
}

export function MedicaoDetalheModal({ medicao, onClose }: MedicaoDetalheModalProps) {
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [cotacaoTitulo, setCotacaoTitulo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const promises: Promise<void>[] = [];

      if (medicao.fornecedor_id) {
        promises.push(
          supabase.from('fornecedores').select('*').eq('id', medicao.fornecedor_id).maybeSingle()
            .then(({ data }) => { if (data) setFornecedor(data as Fornecedor); })
        );
      }
      if (medicao.cotacao_grupo_id) {
        promises.push(
          supabase.from('cotacao_grupos').select('titulo').eq('id', medicao.cotacao_grupo_id).maybeSingle()
            .then(({ data }) => { if (data) setCotacaoTitulo((data as { titulo: string }).titulo); })
        );
      }
      await Promise.all(promises);
      setLoading(false);
    }
    load();
  }, [medicao.fornecedor_id, medicao.cotacao_grupo_id]);

  const statusCfg = STATUS_CONFIG[medicao.status];
  const valorTotal = computeValorTotal(medicao);
  const medPercent = medicao.qtd_orcada > 0 && medicao.qtd_medida != null
    ? Math.min((medicao.qtd_medida / medicao.qtd_orcada) * 100, 100)
    : 0;
  const anexos: MedicaoAnexo[] = Array.isArray(medicao.notas_fiscais) ? medicao.notas_fiscais : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-data text-xs text-text-tertiary bg-surface-1 border border-surface-2 px-2 py-0.5 rounded">{medicao.codigo}</span>
              {medicao.categoria && (
                <span className="flex items-center gap-1 font-body text-xs text-text-secondary bg-surface-1 border border-surface-2 px-2 py-0.5 rounded">
                  <Tag className="w-3 h-3" />
                  {CAT_LABELS[medicao.categoria] ?? medicao.categoria}
                </span>
              )}
              <span className={`flex items-center gap-1 font-body text-xs font-medium px-2 py-0.5 rounded ${statusCfg.bg} ${statusCfg.text}`}>
                {statusCfg.icon}
                {statusCfg.label}
              </span>
            </div>
            <h2 className="font-display font-bold text-base text-text-primary leading-snug">{medicao.descricao}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
            </div>
          )}

          {/* Resumo financeiro */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-surface-2 px-3 py-2.5">
              <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Unidade</p>
              <p className="font-data text-sm font-semibold text-text-primary mt-0.5">{medicao.unidade}</p>
            </div>
            <div className="rounded-lg border border-surface-2 px-3 py-2.5">
              <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Qtd. Orçada</p>
              <p className="font-data text-sm font-semibold text-text-primary mt-0.5">
                {medicao.qtd_orcada.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="rounded-lg border border-surface-2 px-3 py-2.5">
              <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Qtd. Medida</p>
              <p className="font-data text-sm font-semibold text-text-primary mt-0.5">
                {medicao.qtd_medida != null ? medicao.qtd_medida.toLocaleString('pt-BR') : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-surface-2 px-3 py-2.5">
              <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Valor Unit.</p>
              <p className="font-data text-sm font-semibold text-text-primary mt-0.5">
                {formatCurrencyFull(medicao.valor_unitario)}
              </p>
            </div>
          </div>

          {/* Valor total destaque */}
          <div className="rounded-xl bg-mos-700 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-body text-xs text-white/70 uppercase tracking-wider">Valor Total da Medição</p>
              <p className="font-data font-bold text-2xl text-white mt-0.5">
                {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            {medPercent > 0 && (
              <div className="text-right">
                <p className="font-data font-bold text-xl text-white">{medPercent.toFixed(0)}%</p>
                <p className="font-body text-xs text-white/70">avançado</p>
              </div>
            )}
          </div>

          {/* Descricao do servico */}
          {medicao.descricao_servico && (
            <div>
              <h3 className="font-display font-semibold text-sm text-text-primary mb-2">Descrição do Serviço</h3>
              <p className="font-body text-sm text-text-secondary leading-relaxed whitespace-pre-wrap bg-surface-1 rounded-lg px-4 py-3 border border-surface-2">
                {medicao.descricao_servico}
              </p>
            </div>
          )}

          {/* Fornecedor */}
          {(fornecedor || medicao.fornecedor_nome) && (
            <div>
              <h3 className="font-display font-semibold text-sm text-text-primary mb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                Fornecedor
              </h3>
              <div className="rounded-lg border border-surface-2 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-body font-semibold text-sm text-text-primary">{fornecedor?.nome ?? medicao.fornecedor_nome}</p>
                    {fornecedor?.categoria && (
                      <p className="font-body text-xs text-text-tertiary mt-0.5">{fornecedor.categoria}</p>
                    )}
                  </div>
                  {fornecedor?.cnpj && (
                    <p className="font-data text-xs text-text-tertiary">{fornecedor.cnpj}</p>
                  )}
                </div>

                {(fornecedor?.telefone || fornecedor?.email || fornecedor?.cidade) && (
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-surface-2">
                    {fornecedor.telefone && (
                      <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
                        <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                        {fornecedor.telefone}
                      </span>
                    )}
                    {fornecedor.email && (
                      <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
                        <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                        {fornecedor.email}
                      </span>
                    )}
                    {fornecedor.cidade && (
                      <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
                        <MapPin className="w-3.5 h-3.5 text-text-tertiary" />
                        {fornecedor.cidade}{fornecedor.estado ? `, ${fornecedor.estado}` : ''}
                      </span>
                    )}
                  </div>
                )}

                {fornecedor?.dados_bancarios && (
                  <div className="bg-surface-1 rounded-lg px-3 py-2.5 border border-surface-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-text-tertiary" />
                      <p className="font-body text-xs font-semibold text-text-secondary">Dados Bancários</p>
                    </div>
                    <p className="font-body text-xs text-text-primary whitespace-pre-wrap">{fornecedor.dados_bancarios}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cotacao vinculada */}
          {cotacaoTitulo && (
            <div>
              <h3 className="font-display font-semibold text-sm text-text-primary mb-2">Cotação Vinculada</h3>
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-surface-2 bg-surface-1">
                <Tag className="w-4 h-4 text-mos-700 flex-shrink-0" />
                <p className="font-body text-sm text-text-primary flex-1">{cotacaoTitulo}</p>
              </div>
            </div>
          )}

          {/* Anexos */}
          {anexos.length > 0 && (
            <div>
              <h3 className="font-display font-semibold text-sm text-text-primary mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Notas Fiscais / Anexos
                <span className="ml-1 font-body text-xs text-text-tertiary">({anexos.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {anexos.map((a, i) => <AnexoCard key={i} anexo={a} />)}
              </div>
            </div>
          )}

          {/* Data medicao */}
          {medicao.data_medicao && (
            <div className="text-right">
              <p className="font-body text-xs text-text-tertiary">
                Data da medição:{' '}
                <span className="text-text-secondary font-medium">
                  {new Date(medicao.data_medicao + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
