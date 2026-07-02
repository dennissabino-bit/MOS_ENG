import { useRef } from 'react';
import { X, Printer, Building2, User, Hash, Mail, Phone, Home } from 'lucide-react';
import type { EnergiaSala, EnergiaContratoLocacao, EnergiaUnidade } from '../types';
import { INDICE_REAJUSTE_LABEL } from '../types';
import { formatCurrencyBR, formatMesAno } from '../utils/calculos';

interface Props {
  sala: EnergiaSala;
  contrato: EnergiaContratoLocacao;
  unidade: EnergiaUnidade | null;
  onClose: () => void;
}

export function ContratoLocacaoPDF({ sala, contrato, unidade, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const valorTotal = Number(contrato.valor_mensal) * calcMeses(contrato);
  const periodoMeses = calcMeses(contrato);

  function calcMeses(c: EnergiaContratoLocacao): number {
    return (c.ano_fim - c.ano_inicio) * 12 + (c.mes_fim - c.mes_inicio) + 1;
  }

  return (
    <>
      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto print:hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col">

          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2 flex-shrink-0">
            <div>
              <h2 className="font-display font-bold text-base text-text-primary">Contrato de Locação</h2>
              <p className="font-body text-xs text-text-tertiary">{sala.nome} · Gerado em {hoje}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-surface-3 font-body text-xs text-text-secondary hover:bg-surface-1 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir / PDF
              </button>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
          </div>

          {/* Contract document preview */}
          <div ref={printRef} className="p-8 overflow-y-auto max-h-[calc(100vh-140px)]">
            <ContratoContent
              sala={sala}
              contrato={contrato}
              unidade={unidade}
              hoje={hoje}
              valorTotal={valorTotal}
              periodoMeses={periodoMeses}
            />
          </div>
        </div>
      </div>

      {/* Print layout */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-12 print:z-[999]">
        <ContratoContent
          sala={sala}
          contrato={contrato}
          unidade={unidade}
          hoje={hoje}
          valorTotal={valorTotal}
          periodoMeses={periodoMeses}
        />
      </div>
    </>
  );
}

function ContratoContent({ sala, contrato, unidade, hoje, valorTotal, periodoMeses }: {
  sala: EnergiaSala;
  contrato: EnergiaContratoLocacao;
  unidade: EnergiaUnidade | null;
  hoje: string;
  valorTotal: number;
  periodoMeses: number;
}) {
  const indiceLabel = INDICE_REAJUSTE_LABEL[contrato.indice_reajuste] ?? 'Percentual Fixo';

  return (
    <div className="space-y-6 font-body text-sm text-gray-800">

      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">CONTRATO DE LOCAÇÃO COMERCIAL</p>
        <h1 className="text-xl font-bold text-gray-900">CONTRATO N.º {contrato.id.slice(0, 8).toUpperCase()}</h1>
        <p className="text-xs text-gray-500 mt-1">{unidade?.nome}{unidade?.cidade ? ` — ${unidade.cidade}` : ''}{unidade?.estado ? `/${unidade.estado}` : ''}</p>
      </div>

      {/* Partes */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-1">DAS PARTES</h2>

        <div className="bg-gray-50 rounded-lg p-4 space-y-1">
          <p className="text-xs font-bold text-gray-500 uppercase">LOCADOR</p>
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="font-semibold text-gray-900">{unidade?.nome || 'Administração'}</span>
          </div>
          {unidade?.endereco && <p className="text-xs text-gray-600 ml-5">{unidade.endereco}</p>}
          {unidade?.gerente_nome && (
            <p className="text-xs text-gray-600 ml-5">Responsável: <span className="font-medium">{unidade.gerente_nome}</span></p>
          )}
          {unidade?.gerente_email && <p className="text-xs text-gray-600 ml-5">{unidade.gerente_email}</p>}
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-1">
          <p className="text-xs font-bold text-gray-500 uppercase">LOCATÁRIO</p>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="font-semibold text-gray-900">{sala.responsavel || '___________________________'}</span>
          </div>
          {sala.cpf_cnpj && (
            <div className="flex items-center gap-2 ml-0">
              <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-700 font-mono">{sala.cpf_cnpj}</span>
            </div>
          )}
          {sala.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-700">{sala.email}</span>
            </div>
          )}
          {sala.telefone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-700">{sala.telefone}</span>
            </div>
          )}
        </div>
      </section>

      {/* Objeto */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-1">DO OBJETO</h2>
        <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
          <Home className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900">Sala: {sala.nome}</p>
            {unidade && <p className="text-xs text-gray-600 mt-0.5">Unidade: {unidade.nome}</p>}
            {unidade?.endereco && <p className="text-xs text-gray-600">{unidade.endereco}</p>}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-gray-700 mt-2">
          O LOCADOR cede ao LOCATÁRIO, para uso exclusivo comercial, o imóvel descrito acima, pelo prazo e condições estabelecidos neste instrumento.
        </p>
      </section>

      {/* Prazo */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-1">DO PRAZO</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Início</p>
            <p className="font-bold text-gray-900">{formatMesAno(contrato.mes_inicio, contrato.ano_inicio)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Término</p>
            <p className="font-bold text-gray-900">{formatMesAno(contrato.mes_fim, contrato.ano_fim)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Duração</p>
            <p className="font-bold text-gray-900">{periodoMeses} {periodoMeses === 1 ? 'mês' : 'meses'}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-gray-700">
          O presente contrato tem duração de <strong>{periodoMeses} (${periodoMeses === 1 ? 'um mês' : `${periodoMeses} meses`})</strong>, com início em{' '}
          <strong>{formatMesAno(contrato.mes_inicio, contrato.ano_inicio)}</strong> e término em{' '}
          <strong>{formatMesAno(contrato.mes_fim, contrato.ano_fim)}</strong>.
        </p>
      </section>

      {/* Valor */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-1">DO VALOR E PAGAMENTO</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Valor mensal</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrencyBR(Number(contrato.valor_mensal))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Valor total do contrato</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrencyBR(valorTotal)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            O pagamento deverá ser efetuado mensalmente, juntamente com a fatura de energia elétrica emitida pelo LOCADOR,
            com vencimento conforme definido na fatura.
          </p>
        </div>
      </section>

      {/* Reajuste */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-1">DO REAJUSTE</h2>
        <p className="text-sm leading-relaxed text-gray-700">
          O valor do aluguel será reajustado anualmente de acordo com o índice <strong>{indiceLabel}</strong>
          {Number(contrato.percentual_reajuste) > 0 && (
            <>, com percentual aplicado de <strong>{Number(contrato.percentual_reajuste).toFixed(2)}%</strong></>
          )}.
          O reajuste será aplicado no vencimento de cada período contratual.
        </p>
      </section>

      {/* Clausulas */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-1">DAS OBRIGAÇÕES</h2>
        <div className="space-y-2 text-sm leading-relaxed text-gray-700">
          <p><strong>Cláusula 1ª</strong> — O LOCATÁRIO se compromete a utilizar o imóvel exclusivamente para fins comerciais lícitos, mantendo-o em bom estado de conservação e higiene.</p>
          <p><strong>Cláusula 2ª</strong> — O LOCATÁRIO arcará com o pagamento do aluguel e demais encargos previstos neste contrato, nas datas acordadas, sob pena de multa e acréscimos legais previstos na legislação.</p>
          <p><strong>Cláusula 3ª</strong> — Qualquer benfeitoria realizada pelo LOCATÁRIO no imóvel deverá ser previamente autorizada pelo LOCADOR por escrito.</p>
          <p><strong>Cláusula 4ª</strong> — Em caso de rescisão antecipada por iniciativa do LOCATÁRIO, sem justa causa, será devida multa equivalente a 3 (três) aluguéis vigentes à época da rescisão.</p>
          <p><strong>Cláusula 5ª</strong> — O LOCATÁRIO deverá desocupar o imóvel ao término do contrato, entregando-o nas mesmas condições em que o recebeu, exceto desgaste natural de uso.</p>
        </div>
      </section>

      {/* Observacoes */}
      {contrato.observacoes && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-1">OBSERVAÇÕES</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{contrato.observacoes}</p>
        </section>
      )}

      {/* Assinaturas */}
      <section className="space-y-4 pt-4">
        <p className="text-sm text-gray-700 text-center">
          Por estarem justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor e forma,
          na cidade de {unidade?.cidade || '_______________'}, em <strong>{hoje}</strong>.
        </p>
        <div className="grid grid-cols-2 gap-12 pt-6">
          <div className="text-center">
            <div className="border-b border-gray-400 mb-2 pb-6" />
            <p className="text-xs font-bold text-gray-700">{unidade?.nome || 'LOCADOR'}</p>
            {unidade?.gerente_nome && <p className="text-xs text-gray-500">{unidade.gerente_nome}</p>}
          </div>
          <div className="text-center">
            <div className="border-b border-gray-400 mb-2 pb-6" />
            <p className="text-xs font-bold text-gray-700">{sala.responsavel || 'LOCATÁRIO'}</p>
            {sala.cpf_cnpj && <p className="text-xs text-gray-500">{sala.cpf_cnpj}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
