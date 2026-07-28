'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function LancamentosPage() {
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [valor, setValor] = useState('');
  const [historico, setHistorico] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');

  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    // Carregar Categorias ordenadas por tipo e nome
    const { data: catData } = await supabase
      .from('categorias')
      .select('*')
      .order('tipo', { ascending: true })
      .order('nome', { ascending: true });

    if (catData) setCategorias(catData);

    // Carregar Contas
    const { data: contaData } = await supabase
      .from('contas')
      .select('*')
      .order('nome', { ascending: true });

    if (contaData) setContas(contaData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const dataObj = new Date(data);
      const mes = dataObj.getUTCMonth() + 1;
      const ano = dataObj.getUTCFullYear();

      // Buscar o período referente à data informada
      const { data: periodoData, error: errPeriodo } = await supabase
        .from('periodos')
        .select('id, status')
        .eq('mes', mes)
        .eq('ano', ano)
        .single();

      if (errPeriodo || !periodoData) {
        setMensagem({
          tipo: 'erro',
          texto: `Não existe um período cadastrado para ${mes}/${ano}.`,
        });
        setCarregando(false);
        return;
      }

      if (periodoData.status === 'fechado') {
        setMensagem({
          tipo: 'erro',
          texto: `O período ${mes}/${ano} já está FECHADO. Não é possível fazer lançamentos.`,
        });
        setCarregando(false);
        return;
      }

      // Inserir Lançamento
      const { error: errInsert } = await supabase.from('lancamentos').insert({
        periodo_id: periodoData.id,
        data,
        tipo,
        valor: parseFloat(valor.replace(',', '.')),
        historico,
        fornecedor,
        categoria_id: categoriaId,
        conta_id: contaId,
      });

      if (errInsert) {
        setMensagem({ tipo: 'erro', texto: 'Erro ao salvar: ' + errInsert.message });
      } else {
        setMensagem({ tipo: 'sucesso', texto: 'Lançamento cadastrado com sucesso!' });
        setHistorico('');
        setFornecedor('');
        setValor('');
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro inesperado ao processar lançamento.' });
    } finally {
      setCarregando(false);
    }
  };

  // Filtragem única de categorias e contas para evitar redundância visual
  const entradas = Array.from(new Map(categorias.filter((c) => c.tipo === 'entrada').map((c) => [c.nome, c])).values());
  const saidas = Array.from(new Map(categorias.filter((c) => c.tipo === 'saida').map((c) => [c.nome, c])).values());
  const listaContas = Array.from(new Map(contas.map((c) => [c.nome, c])).values());

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Novo Lançamento Financeiro</h1>

        {mensagem.texto && (
          <div
            className={`p-4 rounded-lg mb-6 text-sm font-medium ${
              mensagem.tipo === 'sucesso'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Data</label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'entrada' | 'saida')}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium"
              >
                <option value="entrada">Entrada (+)</option>
                <option value="saida">Saída (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Histórico / Descrição</label>
              <input
                type="text"
                required
                placeholder="Ex: Oferta de Domingo ou Compra de Material"
                value={historico}
                onChange={(e) => setHistorico(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fornecedor / Favorecido</label>
              <input
                type="text"
                placeholder="Ex: Razão Social / Nome do Membro / Empresa"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Categoria</label>
              <select
                required
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
              >
                <option value="">Selecione uma categoria...</option>
                <optgroup label="ENTRADAS">
                  {entradas.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="SAÍDAS">
                  {saidas.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Conta (Origem / Destino)</label>
              <select
                required
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
              >
                <option value="">Selecione uma conta...</option>
                {listaContas.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium p-3 rounded-lg transition mt-4"
          >
            {carregando ? 'Salvando...' : 'Salvar Lançamento'}
          </button>
        </form>
      </div>
    </div>
  );
}
