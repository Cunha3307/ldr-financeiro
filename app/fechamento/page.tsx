'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function FechamentoPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [resumo, setResumo] = useState<any>(null);
  const [periodo, setPeriodo] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    carregarFechamento();
  }, [mes, ano]);

  const carregarFechamento = async () => {
    setCarregando(true);
    setResumo(null);

    // Buscar Período
    const { data: p } = await supabase
      .from('periodos')
      .select('*')
      .eq('mes', mes)
      .eq('ano', ano)
      .single();

    setPeriodo(p);

    if (p) {
      // Buscar Lançamentos do Período
      const { data: lancs } = await supabase
        .from('lancamentos')
        .select('*, categorias(nome, tipo), contas(id, nome)')
        .eq('periodo_id', p.id);

      if (lancs) {
        let entradas = 0;
        let saidas = 0;
        let dizimos = 0;
        let ofertas = 0;
        let ofertasMissoes = 0;

        lancs.forEach((l) => {
          const val = Number(l.valor);
          if (l.tipo === 'entrada') entradas += val;
          if (l.tipo === 'saida') saidas += val;

          if (l.categorias?.nome === 'Dízimo') dizimos += val;
          if (l.categorias?.nome === 'Oferta') ofertas += val;
          if (l.categorias?.nome === 'Oferta de Missões') ofertasMissoes += val;
        });

        setResumo({
          entradas,
          saidas,
          dizimos,
          ofertas,
          ofertasMissoes,
          saldoPeriodo: entradas - saidas,
        });
      }
    }
    setCarregando(false);
  };

  const fecharMesETransportarSaldo = async () => {
    if (!periodo) return;
    setCarregando(true);

    const user = (await supabase.auth.getUser()).data.user;

    // 1. Atualizar o Período Atual para FECHADO
    const { error: errP } = await supabase
      .from('periodos')
      .update({
        status: 'fechado',
        aprovado_por_tesoureiro: user?.id,
        aprovado_em: new Date().toISOString(),
        saldo_fechamento_json: resumo,
      })
      .eq('id', periodo.id);

    if (errP) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao fechar mês: ' + errP.message });
      setCarregando(false);
      return;
    }

    // 2. TRANSPORTE AUTOMÁTICO DE SALDO
    // Criar o próximo mês com o saldo de abertura vindo deste fechamento
    const proximoMes = mes === 12 ? 1 : mes + 1;
    const proximoAno = mes === 12 ? ano + 1 : ano;

    const { error: errProx } = await supabase.from('periodos').upsert(
      {
        mes: proximoMes,
        ano: proximoAno,
        status: 'aberto',
        saldo_abertura_json: resumo,
      },
      { onConflict: 'mes,ano' }
    );

    if (errProx) {
      setMensagem({ tipo: 'erro', texto: 'Erro no transporte de saldo para o mês seguinte.' });
    } else {
      setMensagem({
        tipo: 'sucesso',
        texto: `Mês ${mes}/${ano} FECHADO com sucesso! O saldo de abertura de ${proximoMes}/${proximoAno} foi gerado automaticamente.`,
      });
      carregarFechamento();
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Fechamento Mensal de Caixa</h1>

        {/* SELETOR DE MÊS/ANO */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="border border-slate-300 rounded-lg p-2 text-slate-800"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ano</label>
            <input
              type="number"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="border border-slate-300 rounded-lg p-2 text-slate-800 w-28"
            />
          </div>
        </div>

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

        {resumo && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-lg font-bold text-slate-800">
                Resumo de Fechamento: {mes}/{ano}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  periodo?.status === 'fechado'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {periodo?.status || 'Aberto'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 font-semibold block">Total Dízimos</span>
                <span className="text-lg font-bold text-slate-800">R$ {resumo.dizimos.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 font-semibold block">Total Ofertas</span>
                <span className="text-lg font-bold text-slate-800">R$ {resumo.ofertas.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 font-semibold block">Oferta Missões</span>
                <span className="text-lg font-bold text-slate-800">R$ {resumo.ofertasMissoes.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <span className="text-xs text-emerald-600 font-semibold block">Total Entradas</span>
                <span className="text-lg font-bold text-emerald-700">R$ {resumo.entradas.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <span className="text-xs text-red-600 font-semibold block">Total Saídas</span>
                <span className="text-lg font-bold text-red-700">R$ {resumo.saidas.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <span className="text-xs text-blue-600 font-semibold block">Resultado do Mês</span>
                <span className="text-lg font-bold text-blue-700">R$ {resumo.saldoPeriodo.toFixed(2)}</span>
              </div>
            </div>

            {periodo?.status === 'aberto' ? (
              <button
                onClick={fecharMesETransportarSaldo}
                disabled={carregando}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium p-3 rounded-lg transition"
              >
                {carregando ? 'Processando...' : 'Aprovar Fechamento e Transportar Saldo'}
              </button>
            ) : (
              <p className="text-sm text-slate-500 text-center italic">
                Este período já foi finalizado. O saldo final foi automaticamente aplicado como saldo inicial do mês subsequente.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
