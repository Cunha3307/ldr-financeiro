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
        let dizimos = 0;
        let ofertas = 0;
        let ofertasMissoes = 0;
        let ofertasEspeciais = 0;
        let ofertasRedeBomber = 0;

        let entradasSicoob = 0;
        let entradasMercadoPago = 0;
        let entradasCaixa = 0;
        let entradasCDB = 0;

        let totalGeralEntradas = 0;

        let saidasSicoob = 0;
        let saidasMercadoPago = 0;
        let saidasCaixa = 0;
        let saidasCDB = 0;

        let totalGeralSaidas = 0;

        lancs.forEach((l) => {
          const val = Number(l.valor);
          const catNome = l.categorias?.nome ? l.categorias.nome.toLowerCase() : '';
          const contaNome = l.contas?.nome ? l.contas.nome.toLowerCase() : '';

          if (l.tipo === 'entrada') {
            totalGeralEntradas += val;

            // Categorias de Entrada
            if (catNome.includes('dízimo') || catNome.includes('dizimo')) {
              dizimos += val;
            } else if (catNome.includes('missões') || catNome.includes('missoes')) {
              ofertasMissoes += val;
            } else if (catNome.includes('especial') || catNome.includes('especiais')) {
              ofertasEspeciais += val;
            } else if (catNome.includes('bomber')) {
              ofertasRedeBomber += val;
            } else if (catNome.includes('oferta')) {
              ofertas += val;
            }

            // Entradas por Conta (Garante a separação de Sicoob e CDB Sicoob)
            if (contaNome.includes('cdb')) {
              entradasCDB += val;
            } else if (contaNome.includes('sicoob')) {
              entradasSicoob += val;
            }

            if (contaNome.includes('mercado') || contaNome.includes('pago')) entradasMercadoPago += val;
            if (contaNome.includes('caixa') || contaNome.includes('dinheiro')) entradasCaixa += val;
          }

          if (l.tipo === 'saida') {
            totalGeralSaidas += val;

            // Saídas por Conta
            if (contaNome.includes('cdb')) {
              saidasCDB += val;
            } else if (contaNome.includes('sicoob')) {
              saidasSicoob += val;
            }

            if (contaNome.includes('mercado') || contaNome.includes('pago')) saidasMercadoPago += val;
            if (contaNome.includes('caixa') || contaNome.includes('dinheiro')) saidasCaixa += val;
          }
        });

        setResumo({
          dizimos,
          ofertas,
          ofertasMissoes,
          ofertasEspeciais,
          ofertasRedeBomber,
          entradasSicoob,
          entradasMercadoPago,
          entradasCaixa,
          entradasCDB,
          totalGeralEntradas,
          saidasSicoob,
          saidasMercadoPago,
          saidasCaixa,
          saidasCDB,
          saldoCDB: entradasCDB - saidasCDB,
          totalGeralSaidas,
          saldoMes: totalGeralEntradas - totalGeralSaidas,
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
      <div className="max-w-3xl mx-auto px-4 pt-6">
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

            {/* DEMONSTRATIVO DETALHADO */}
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Total de Dízimos:</span>
                <span className="font-semibold text-slate-900">R$ {resumo.dizimos.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Total de Ofertas:</span>
                <span className="font-semibold text-slate-900">R$ {resumo.ofertas.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Oferta Missões:</span>
                <span className="font-semibold text-slate-900">R$ {resumo.ofertasMissoes.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Ofertas Especiais:</span>
                <span className="font-semibold text-slate-900">R$ {resumo.ofertasEspeciais.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Ofertas Rede Bomber:</span>
                <span className="font-semibold text-slate-900">R$ {resumo.ofertasRedeBomber.toFixed(2)}</span>
              </div>

              {/* ENTRADAS BANCÁRIAS */}
              <div className="pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100 bg-slate-50 px-2 rounded">
                  <span className="text-slate-600">Total Entradas Sicoob:</span>
                  <span className="font-medium">R$ {resumo.entradasSicoob.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100 bg-blue-50 px-2 rounded mt-1">
                  <span className="text-blue-900 font-medium">Total Entradas CDB Sicoob:</span>
                  <span className="font-medium text-blue-900">R$ {resumo.entradasCDB.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100 bg-slate-50 px-2 rounded mt-1">
                  <span className="text-slate-600">Total Entradas Mercado Pago:</span>
                  <span className="font-medium">R$ {resumo.entradasMercadoPago.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100 bg-slate-50 px-2 rounded mt-1">
                  <span className="text-slate-600">Total Entradas Caixa:</span>
                  <span className="font-medium">R$ {resumo.entradasCaixa.toFixed(2)}</span>
                </div>
              </div>

              {/* TOTAL GERAL ENTRADAS */}
              <div className="flex justify-between py-2 border-b-2 border-slate-300 pt-3">
                <span className="font-bold text-emerald-700 uppercase">Total Geral de Entradas:</span>
                <span className="font-bold text-emerald-700 text-base">R$ {resumo.totalGeralEntradas.toFixed(2)}</span>
              </div>

              {/* SAÍDAS BANCÁRIAS */}
              <div className="pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100 bg-red-50/40 px-2 rounded">
                  <span className="text-slate-600">Total Saídas Sicoob:</span>
                  <span className="font-medium">R$ {resumo.saidasSicoob.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100 bg-blue-50/60 px-2 rounded mt-1">
                  <span className="text-blue-900 font-medium">Total Saídas CDB Sicoob:</span>
                  <span className="font-medium text-blue-900">R$ {resumo.saidasCDB.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100 bg-red-50/40 px-2 rounded mt-1">
                  <span className="text-slate-600">Total Saídas Mercado Pago:</span>
                  <span className="font-medium">R$ {resumo.saidasMercadoPago.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100 bg-red-50/40 px-2 rounded mt-1">
                  <span className="text-slate-600">Total Saídas Caixa:</span>
                  <span className="font-medium">R$ {resumo.saidasCaixa.toFixed(2)}</span>
                </div>
              </div>

              {/* TOTAL GERAL SAÍDAS */}
              <div className="flex justify-between py-2 border-b-2 border-slate-300 pt-3">
                <span className="font-bold text-red-700 uppercase">Total Geral de Saídas:</span>
                <span className="font-bold text-red-700 text-base">R$ {resumo.totalGeralSaidas.toFixed(2)}</span>
              </div>

              {/* SALDO CDB E SALDO MÊS */}
              <div className="pt-2 space-y-2">
                <div className="flex justify-between py-2 bg-blue-50 border border-blue-200 text-blue-900 px-4 rounded-lg text-sm font-semibold">
                  <span>Movimentação/Saldo CDB Sicoob:</span>
                  <span>R$ {resumo.saldoCDB.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-3 bg-slate-800 text-white px-4 rounded-lg text-lg font-bold shadow-sm">
                  <span>Saldo Mês:</span>
                  <span className={resumo.saldoMes >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    R$ {resumo.saldoMes.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {periodo?.status === 'aberto' ? (
              <button
                onClick={fecharMesETransportarSaldo}
                disabled={carregando}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium p-3 rounded-lg transition mt-4"
              >
                {carregando ? 'Processando...' : 'Aprovar Fechamento e Transportar Saldo'}
              </button>
            ) : (
              <p className="text-sm text-slate-500 text-center italic mt-4">
                Este período já foi finalizado. O saldo final foi automaticamente aplicado como saldo inicial do mês subsequente.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
