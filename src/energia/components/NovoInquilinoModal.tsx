import { useState } from 'react';
import { X, User, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EnergiaInquilino } from '../types';

interface Props {
  initial?: EnergiaInquilino;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  'w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors';

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

export function NovoInquilinoModal({ initial, onClose, onSaved }: Props) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [cpfCnpj, setCpfCnpj] = useState(initial?.cpf_cnpj ?? '');
  const [rg, setRg] = useState(initial?.rg ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [emailFatura, setEmailFatura] = useState(initial?.email_fatura ?? '');
  const [telefone, setTelefone] = useState(initial?.telefone ?? '');
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError('Nome é obrigatório'); return; }
    if (!cpfCnpj.trim()) { setError('CPF/CNPJ é obrigatório'); return; }
    setSaving(true);
    setError('');
    const payload = {
      nome: nome.trim(),
      cpf_cnpj: cpfCnpj.trim(),
      rg: rg.trim(),
      email: email.trim(),
      email_fatura: emailFatura.trim(),
      telefone: telefone.trim(),
      ativo,
    };
    if (initial?.id) {
      const { error: err } = await supabase.from('energia_inquilinos').update(payload).eq('id', initial.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('energia_inquilinos').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center">
              <User className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-text-primary">
                {initial ? 'Editar' : 'Novo'} Inquilino
              </h2>
              <p className="font-body text-xs text-text-tertiary">Dados do locatário</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-status-errorLight border border-status-error/20">
              <p className="font-body text-xs text-status-error">{error}</p>
            </div>
          )}

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
              NOME COMPLETO / RAZÃO SOCIAL *
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              autoFocus
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                CPF / CNPJ *
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cpfCnpj}
                onChange={e => setCpfCnpj(maskCpfCnpj(e.target.value))}
                placeholder="000.000.000-00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                RG
              </label>
              <input
                type="text"
                value={rg}
                onChange={e => setRg(e.target.value)}
                placeholder="Opcional"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                E-MAIL DE CONTATO
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                TELEFONE
              </label>
              <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
              E-MAIL PARA FATURA
            </label>
            <input
              type="email"
              value={emailFatura}
              onChange={e => setEmailFatura(e.target.value)}
              className={inputClass}
            />
            <p className="font-body text-[10px] text-text-tertiary mt-1">
              Para onde serão enviadas as cobranças de aluguel
            </p>
          </div>

          {initial && (
            <div className="flex items-center justify-between py-3 px-3.5 bg-surface-1 rounded-lg border border-surface-2">
              <div>
                <p className="font-body text-sm font-semibold text-text-primary">Inquilino ativo</p>
                <p className="font-body text-xs text-text-tertiary">
                  Inativos não aparecem nos dropdowns de novos contratos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAtivo(a => !a)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                  ativo ? 'bg-mos-700' : 'bg-surface-3'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    ativo ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {initial ? 'Salvar' : 'Criar Inquilino'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
