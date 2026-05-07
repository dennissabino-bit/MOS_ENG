import { useState, useEffect } from 'react';
import { X, Building2, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EnergiaUsuario } from '../types';

interface Props {
  onClose: () => void;
  onSaved: () => void;
  initial?: { id: string; nome: string; codigo: string; endereco: string; cidade: string; estado: string; gerente_nome: string; gerente_email: string; gerente_telefone: string; tarifa?: number };
}

export function NovaUnidadeModal({ onClose, onSaved, initial }: Props) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [codigo, setCodigo] = useState(initial?.codigo ?? '');
  const [endereco, setEndereco] = useState(initial?.endereco ?? '');
  const [cidade, setCidade] = useState(initial?.cidade ?? '');
  const [estado, setEstado] = useState(initial?.estado ?? '');
  const [gerenteNome, setGerenteNome] = useState(initial?.gerente_nome ?? '');
  const [gerenteEmail, setGerenteEmail] = useState(initial?.gerente_email ?? '');
  const [gerenteTelefone, setGerenteTelefone] = useState(initial?.gerente_telefone ?? '');
  const [tarifa, setTarifa] = useState(initial?.tarifa != null ? String(initial.tarifa) : '0.85');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [gerentes, setGerentes] = useState<EnergiaUsuario[]>([]);
  const [selectedGerenteId, setSelectedGerenteId] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('energia_usuarios')
        .select('*')
        .eq('perfil', 'gerente')
        .eq('ativo', true)
        .order('nome');
      setGerentes((data as EnergiaUsuario[]) || []);

      // Try to match initial gerente by email
      if (initial?.gerente_email && data) {
        const match = (data as EnergiaUsuario[]).find(g => g.email === initial.gerente_email);
        if (match) setSelectedGerenteId(match.id);
      }
    })();
  }, [initial?.gerente_email]);

  function handleGerenteSelect(id: string) {
    setSelectedGerenteId(id);
    if (!id) {
      setGerenteNome('');
      setGerenteEmail('');
      return;
    }
    const g = gerentes.find(u => u.id === id);
    if (g) {
      setGerenteNome(g.nome);
      setGerenteEmail(g.email);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !codigo.trim()) { setError('Nome e código são obrigatórios'); return; }
    setSaving(true);
    setError('');
    const tarifaNum = Number(tarifa.replace(',', '.')) || 0.85;
    const payload = {
      nome: nome.trim(), codigo: codigo.trim(), endereco: endereco.trim(),
      cidade: cidade.trim(), estado: estado.trim().toUpperCase(),
      gerente_nome: gerenteNome.trim(), gerente_email: gerenteEmail.trim(), gerente_telefone: gerenteTelefone.trim(),
      tarifa: tarifaNum,
    };
    if (initial?.id) {
      const { error: err } = await supabase.from('energia_unidades').update(payload).eq('id', initial.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('energia_unidades').insert(payload);
      if (err) { setError(err.message.includes('duplicate') ? 'Código já existe' : err.message); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
  }

  const inputClass = "w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-text-primary">{initial ? 'Editar' : 'Nova'} Unidade</h2>
              <p className="font-body text-xs text-text-tertiary">Preencha os dados da unidade</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-status-errorLight border border-status-error/20">
              <p className="font-body text-xs text-status-error">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">NOME *</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} required autoFocus className={inputClass} />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">CÓDIGO *</label>
              <input type="text" value={codigo} onChange={e => setCodigo(e.target.value)} required className={`${inputClass} font-data`} />
            </div>
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">ENDEREÇO</label>
            <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">CIDADE</label>
              <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="São Paulo" className={inputClass} />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">ESTADO</label>
              <input
                type="text"
                value={estado}
                onChange={e => setEstado(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase())}
                placeholder="SP"
                maxLength={2}
                className={`${inputClass} font-data uppercase tracking-widest`}
              />
            </div>
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">TARIFA DE ENERGIA (R$/kWh) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={tarifa}
              onChange={e => setTarifa(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="0.85"
              className={`${inputClass} font-data`}
            />
            <p className="font-body text-[10px] text-text-tertiary mt-1">Aplicada automaticamente a todas as medições desta unidade.</p>
          </div>

          <div className="pt-1 border-t border-surface-2">
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-3 pt-3">GERENTE RESPONSÁVEL</p>
            <div className="space-y-3">
              {/* Dropdown of gerentes from usuarios */}
              <div>
                <label className="block font-body text-xs text-text-tertiary mb-1.5">Selecionar gerente cadastrado</label>
                <div className="relative">
                  <select
                    value={selectedGerenteId}
                    onChange={e => handleGerenteSelect(e.target.value)}
                    className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                  >
                    <option value="">— Selecione um gerente —</option>
                    {gerentes.map(g => (
                      <option key={g.id} value={g.id}>{g.nome} · {g.email}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                </div>
                {gerentes.length === 0 && (
                  <p className="font-body text-[10px] text-status-warning mt-1">Nenhum gerente ativo encontrado. Cadastre um usuário com perfil Gerente primeiro.</p>
                )}
              </div>

              {/* Name + phone row — name auto-filled, phone still editable */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-body text-xs text-text-tertiary mb-1.5">Nome</label>
                  <input
                    type="text"
                    value={gerenteNome}
                    readOnly={!!selectedGerenteId}
                    tabIndex={selectedGerenteId ? -1 : undefined}
                    onChange={e => !selectedGerenteId && setGerenteNome(e.target.value)}
                    placeholder="Nome completo"
                    className={`${inputClass} ${selectedGerenteId ? 'bg-surface-1 text-text-tertiary cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block font-body text-xs text-text-tertiary mb-1.5">Telefone</label>
                  <input
                    type="text"
                    value={gerenteTelefone}
                    onChange={e => setGerenteTelefone(e.target.value)}
                    placeholder="Telefone"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Email — auto-filled and locked when gerente selected */}
              <div>
                <label className="block font-body text-xs text-text-tertiary mb-1.5">Email</label>
                <input
                  type="email"
                  value={gerenteEmail}
                  readOnly={!!selectedGerenteId}
                  tabIndex={selectedGerenteId ? -1 : undefined}
                  onChange={e => !selectedGerenteId && setGerenteEmail(e.target.value)}
                  placeholder="Email"
                  className={`${inputClass} ${selectedGerenteId ? 'bg-surface-1 text-text-tertiary cursor-not-allowed' : ''}`}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {initial ? 'Salvar' : 'Criar Unidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
