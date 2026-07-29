'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function LancamentosPage() {
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [dataLancamento, setDataLancamento] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    carregarOpcoes();
  }, [tipo]);

  const carregarOpcoes = async () => {
    // 1. Carregar Categorias filtradas pelo Tipo (Entrada ou Saída)
    const { data: cats } = await supabase
      .from('categorias')
      .select('*')
      .eq('tipo', tipo)
      .order('nome');

    // 2. Carregar Contas (Inclui Sicoob, MP, Caixa, CDB, Missões e Rede Bomber)
    const { data: cnts } = await supabase
      .from('contas')
      .select('*')
      .order('nome');

    if (cats) setCategorias(cats);
    if (cnts) setContas(cnts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem({ tipo: '', texto: '' });

    const dataObj = new Date(dataLancamento);
    const mes = dataObj.getMonth() + 1;
    const ano = dataObj.getFullYear();

    // Buscar Período correspondente
    let { data: periodo } = await supabase
      .from('periodos')
      .select('id, status')
      .eq('mes', mes)
      .eq('ano', ano)
      .single();

    if (!periodo) {
      const { data: novoPeriodo, error: errP } = await supabase
        .from('periodos')
        .insert([{ mes, ano, status: 'aberto' }])
        .select()
        .single();

      if (errP) {
        setMensagem({ tipo: 'erro', texto: 'Erro ao criar período: ' + errP.message });
        setCarregando(false);
        return;
      }
      periodo = novoPeriodo;
    }

    if (periodo.status === 'fechado') {
      setMensagem({
        tipo: 'erro',
        texto: `Não é possível lançar em ${mes}/${ano} pois o período está FECHADO.`,
      });
      setCarregando(false);
      return;
    }

    const { error } = await supabase.from('lancamentos').insert([
      {
        tipo,
        descricao,
        valor: parseFloat(valor),
        categoria_id: categoriaId,
        conta_id: contaId,
        data: dataLancamento,
        periodo_id: periodo.id,
      },
    ]);

    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar lançamento: ' + error.message });
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Lançamento realizado com sucesso!' });
      setDescricao('');
      setValor('');
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 pt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 mb-4">Novo Lançamento</h1>

          {mensagem.texto && (
            <div
              className={`p-3 rounded-lg mb-4 text-sm font-medium ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {mensagem.texto}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* TIPO: ENTRADA OU SAÍDA */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setTipo('entrada')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${
                  tipo === 'entrada'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setTipo('saida')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${
                  tipo === 'saida'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Saída
              </button>
            </div>

            {/* DATA */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Data
              </label>
              <input
                type="date"
                required
                value={dataLancamento}
                onChange={(e) => setDataLancamento(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-sm"
              />
            </div>

            {/* VALOR */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-sm"
              />
            </div>

            {/* CATEGORIA */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Categoria
              </label>
              <select
                required
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-sm"
              >
                <option value="">Selecione uma categoria...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* CONTA (ORIGEM / DESTINO) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Conta (Origem / Destino)
              </label>
              <select
                required
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-sm"
              >
                <option value="">Selecione a conta/destino...</option>
                {contas.map((cnt) => (
                  <option key={cnt.id} value={cnt.id}>
                    {cnt.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* DESCRIÇÃO / OBSERVAÇÃO */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Descrição / Observação
              </label>
              <input
                type="text"
                placeholder="Ex: Oferta do Culto de Domingo, Pagamento Luz..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium p-3 rounded-lg transition text-sm mt-2"
            >
              {carregando ? 'Salvando...' : 'Registrar Lançamento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
