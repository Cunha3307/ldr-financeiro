'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function LancamentosPage() {
  const [contas, setContas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  
  // Form State
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [historico, setHistorico] = useState('');
  const [contaId, setContaId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [valor, setValor] = useState('');
  const [nomeDizimista, setNomeDizimista] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const { data: c } = await supabase.from('contas').select('*').eq('ativo', true);
    const { data: cat } = await supabase.from('categorias').select('*').eq('ativo', true);
    if (c) setContas(c);
    if (cat) setCategorias(cat);

    const { data: l } = await supabase
      .from('lancamentos')
      .select('*, contas(nome), categorias(nome, tipo)')
      .order('data', { ascending: false })
      .limit(20);

    if (l) setLancamentos(l);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data?.user?.id || null;

      const categoriaSel = categorias.find((c) => c.id === categoriaId);
      if (!categoriaSel) {
        setMensagem({ tipo: 'erro', texto: 'Selecione uma categoria válida.' });
        return;
      }

      // Buscar ou criar o período aberto correspondente à data
      const [ano, mes] = data.split('-').map(Number);
      let { data: periodo } = await supabase
        .from('periodos')
        .select('*')
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle();

      if (!periodo) {
        const { data: novoPeriodo, error: errP } = await supabase
          .from('periodos')
          .insert({ mes, ano, status: 'aberto' })
          .select()
          .single();
          
        if (errP) {
          setMensagem({ tipo: 'erro', texto: 'Erro ao abrir novo período financeiro: ' + errP.message });
          return;
        }
        periodo = novoPeriodo;
      }

      if (periodo && periodo.status === 'fechado') {
        setMensagem({ tipo: 'erro', texto: 'Este mês já foi FECHADO. Não é possível realizar novos lançamentos.' });
        return;
      }

      const valorNum = parseFloat(valor.toString().replace(',', '.'));
      if (isNaN(valorNum) || valorNum <= 0) {
        setMensagem({ tipo: 'erro', texto: 'Informe um valor numérico válido maior que zero.' });
        return;
      }

      const { error } = await supabase.from('lancamentos').insert({
        data,
        historico,
        conta_id: contaId,
        categoria_id: categoriaId,
        tipo: categoriaSel.tipo,
        valor: valorNum,
        nome_dizimista: nomeDizimista || null,
        usuario_id: userId,
        periodo_id: periodo?.id || null,
      });

      if (error) {
        setMensagem({ tipo: 'erro', texto: 'Erro ao salvar o lançamento: ' + error.message });
      } else {
        setMensagem({ tipo: 'sucesso', texto: 'Lançamento registrado com sucesso!' });
        setHistorico('');
        setValor('');
        setNomeDizimista('');
        carregarDados();
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Ocorreu um erro inesperado: ' + (err.message || err) });
    } finally {
      setCarregando(false);
    }
  };

  // Função para excluir um lançamento
  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza de que deseja excluir este lançamento?')) {
      return;
    }

    const { error } = await supabase.from('lancamentos').delete().eq('id', id);

    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir o lançamento: ' + error.message });
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Lançamento excluído com sucesso!' });
      carregarDados();
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
    Conta (Origem / Destino)
  </label>
  <select
    required
    value={contaId}
    onChange={(e) => setContaId(e.target.value)}
    className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
  >
    <option value="">Selecione uma conta...</option>
    {Array.from(new Map(contas.map(c => [c.nome, c])).values()).map((conta) => (
      <option key={conta.id} value={conta.id}>
        {conta.nome}
      </option>
    ))}
  </select>
</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
    Categoria
  </label>
  <select
    required
    value={categoriaId}
    onChange={(e) => setCategoriaId(e.target.value)}
    className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
  >
    <option value="">Selecione uma categoria...</option>

    {/* GRUPO DE ENTRADAS */}
    <optgroup label="--- ENTRADAS ---">
      {categorias
        .filter((cat) => cat.tipo === 'entrada')
        .map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.nome}
          </option>
        ))}
    </optgroup>

    {/* GRUPO DE SAÍDAS */}
    <optgroup label="--- SAÍDAS ---">
      {categorias
        .filter((cat) => cat.tipo === 'saida')
        .map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.nome}
          </option>
        ))}
    </optgroup>
  </select>
</div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Histórico / Descrição</label>
            <input
              type="text"
              required
              placeholder="Ex: Oferta de Culto de Domingo, Aluguel do Templo..."
              value={historico}
              onChange={(e) => setHistorico(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Nome do Dizimista / Membro <span className="text-slate-400 font-normal">(Opcional - Protegido LGPD)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: João da Silva"
              value={nomeDizimista}
              onChange={(e) => setNomeDizimista(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium p-3 rounded-lg transition"
          >
            {carregando ? 'Salvando...' : 'Salvar Lançamento'}
          </button>
        </form>

        {/* LISTA DOS ÚLTIMOS LANÇAMENTOS */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Últimos Lançamentos</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Histórico</th>
                  <th className="p-3">Conta</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap">{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3">{l.historico}</td>
                    <td className="p-3 whitespace-nowrap">{l.contas?.nome}</td>
                    <td className="p-3 whitespace-nowrap">{l.categorias?.nome}</td>
                    <td className={`p-3 text-right font-bold whitespace-nowrap ${
                      l.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {l.tipo === 'entrada' ? '+' : '-'} R$ {Number(l.valor).toFixed(2)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleExcluir(l.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                        title="Excluir lançamento"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
