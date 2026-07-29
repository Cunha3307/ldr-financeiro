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

  // Estado para edição do Saldo de Abertura / Anterior
  const [saldoAbertura, setSaldoAbertura] = useState({
    sicoob: 0,
    mercadoPago: 0,
    caixa: 0,
    cdb: 0,
  });

  useEffect(() => {
    carregarFechamento();
  }, [mes, ano]);

  const carregarFechamento = async () => {
    setCarregando(true);
    setResumo(null);

    // 1. Buscar Período
    const { data: p } = await supabase
      .from('periodos')
      .select('*')
      .eq('mes', mes)
      .eq('ano', ano)
      .single();

    setPeriodo(p);

    // Carregar Saldo de Abertura se existir
    if (p?.saldo_abertura_json) {
      setSaldoAbertura({
        sicoob: Number(p.saldo_abertura_json.sicoob || 0),
        mercadoPago: Number(p.saldo_abertura_json.mercadoPago || 0),
        caixa: Number(p.saldo_abertura_json.caixa || 0),
        cdb: Number(p.saldo_abertura_json.cdb || 0),
      });
    } else {
      setSaldoAbertura({ sicoob: 0, mercadoPago: 0, caixa: 0, cdb: 0 });
    }

    if (p) {
      // 2. Buscar Lançamentos do Período
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

            if (catNome.includes('dízimo') || catNome.includes('dizimo')) dizimos += val;
            else if (catNome.includes('missões') || catNome.includes('missoes')) ofertasMissoes += val;
            else if (catNome.includes('especial') || catNome.includes('especiais')) ofertasEspeciais += val;
            else if (catNome.includes('bomber')) ofertasRedeBomber += val;
            else if (catNome.includes('oferta')) ofertas += val;

            if (contaNome.includes('cdb')) entradasCDB += val;
            else if (contaNome.includes('sicoob')) entradasSicoob += val;

            if (contaNome.includes('mercado') || contaNome.includes('pago')) entradasMercadoPago += val;
            if (contaNome.includes('caixa') || contaNome.includes('dinheiro')) entradasCaixa += val;
          }

          if (l.tipo === 'saida') {
            totalGeralSaidas += val;

            if (contaNome.includes('cdb')) saidasCDB += val;
            else if (contaNome.includes('sicoob')) saidasSicoob += val;

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
          totalGeralSaidas,
          resultadoMes: totalGeralEntradas - totalGeralSaidas,
        });
      }
    }
    setCarregando(false);
  };

  // Salvar/Atualizar Saldo Inicial do Mês
  const salvarSaldoAbertura = async () => {
    if (!periodo) return;
    setCarregando(true);

    const { error } = await supabase
      .from('periodos')
      .update({ saldo_abertura_json: saldoAbertura })
      .eq('id', periodo.id);

    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar saldo inicial: ' + error.message });
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Saldo de abertura salvo com sucesso!' });
    }
    setCarregando(false);
  };

  // Fechar Mês e Transportar Saldos Finais
  const fecharMesETransportarSaldo = async () => {
    if (!periodo || !resumo) return;
    setCarregando(true);

    const user = (await supabase.auth.getUser()).data.user;

    // Calcular saldos finais de cada conta para transportar
    const saldoFinalTransporte = {
      sicoob: saldoAbertura.sicoob + resumo.entradasSicoob - resumo.saidasSicoob,
      mercadoPago: saldoAbertura.mercadoPago + resumo.entradasMercadoPago - resumo.saidasMercadoPago,
      caixa: saldoAbertura.caixa + resumo.entradasCaixa - resumo.saidasCaixa,
      cdb: saldoAbertura.cdb + resumo.entradasCDB - resumo.saidasCDB,
    };

    // 1. Atualizar o Período Atual para FECHADO
    const { error: errP } = await supabase
      .from('periodos')
      .update({
        status: 'fechado',
        aprovado_por_tesoureiro: user?.id,
        aprovado_em: new Date().toISOString(),
        saldo_fechamento_json: { ...resumo, saldoFinalTransporte },
      })
      .eq('id', periodo.id);

    if (errP) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao fechar mês: ' + errP.message });
      setCarregando(false);
      return;
    }

    // 2. TRANSPORTE AUTOMÁTICO DE SALDO PARA O PRÓXIMO MÊS
    const proximoMes = mes === 12 ? 1 : mes + 1;
    const proximoAno = mes === 12 ? ano + 1 : ano;

    const { error: errProx } = await supabase.from('periodos').upsert(
      {
        mes: proximoMes,
        ano: proximoAno,
        status: 'aberto',
        saldo_abertura_json: saldoFinalTransporte,
      },
      { onConflict: 'mes,ano' }
    );

    if (errProx) {
      setMensagem({ tipo: 'erro', texto: 'Erro no transporte de saldo para o mês seguinte.' });
    } else {
      setMensagem({
        tipo: 'sucesso',
        texto: `Mês ${mes}/${ano} FECHADO com sucesso! O saldo final foi levado como abertura para ${proximoMes}/${proximoAno}.`,
      });
      carregarFechamento();
    }
    setCarregando(false);
  };

  // Cálculo dos Saldos Finais Consolidados
  const totalAbertura =
    saldoAbertura.sicoob + saldoAbertura.mercadoPago + saldoAbertura.caixa + saldoAbertura.cdb;

  const saldoFinalSicoob = saldoAbertura.sicoob + (resumo?.entradasSicoob || 0) - (resumo?.saidasSicoob || 0);
  const saldoFinalMP = saldoAbertura.mercadoPago + (resumo?.entradasMercadoPago || 0) - (resumo?.saidasMercadoPago || 0);
  const saldoFinalCaixa = saldoAbertura.caixa + (resumo?.entradasCaixa || 0) - (resumo?.saidasCaixa || 0);
  const saldoFinalCDB = saldoAbertura.cdb + (resumo?.entradasCDB || 0) - (resumo?.saidasCDB || 0);

  const saldoFinalTotal = totalAbertura + (resumo?.resultadoMes || 0);

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

        {/* 1. SEÇÃO DE SALDO INICIAL DO MÊS / SALDO ANTERIOR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-base font-bold text-slate-800">
              1. Saldo de Abertura (Mês Anterior)
            </h2>
            <span className="text-xs text-slate-500">Valores com que o mês iniciou</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Sicoob C/C</label>
              <input
                type="number"
                step="0.01"
                disabled={periodo?.status === 'fechado'}
                value={saldoAbertura.sicoob}
                onChange={(e) => setSaldoAbertura({ ...saldoAbertura, sicoob: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-800 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Mercado Pago</label>
              <input
                type="number"
                step="0.01"
                disabled={periodo?.status === 'fechado'}
                value={saldoAbertura.mercadoPago}
                onChange={(e) => setSaldoAbertura({ ...saldoAbertura, mercadoPago: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-800 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Caixa / Dinheiro</label>
              <input
                type="number"
                step="0.01"
                disabled={periodo?.status === 'fechado'}
                value={saldoAbertura.caixa}
                onChange={(e) => setSaldoAbertura({ ...saldoAbertura, caixa: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-800 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-blue-800 mb-1 font-medium">CDB Sicoob</label>
              <input
                type="number"
                step="0.01"
                disabled={periodo?.status === 'fechado'}
                value={saldoAbertura.cdb}
                onChange={(e) => setSaldoAbertura({ ...saldoAbertura, cdb: Number(e.target.value) })}
                className="w-full border border-blue-300 bg-blue-50/50 rounded-lg p-2 text-sm text-slate-800 disabled:bg-slate-100"
              />
            </div>
          </div>

          {periodo?.status === 'aberto' && (
            <button
              onClick={salvarSaldoAbertura}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold px-3 py-1.5 rounded transition"
            >
              Salvar Saldo Inicial
            </button>
          )}
        </div>

        {/* 2. DEMONSTRATIVO DO MÊS E SALDO FINAL */}
        {resumo && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-lg font-bold text-slate-800">
                2. Movimentação e Fechamento: {mes}/{ano}
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

              {/* ENTRADAS E SAÍDAS DO MÊS */}
              <div className="flex justify-between py-2 border-b border-slate-200 pt-3">
                <span className="font-bold text-emerald-700">TOTAL DE ENTRADAS DO MÊS:</span>
                <span className="font-bold text-emerald-700">R$ {resumo.totalGeralEntradas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="font-bold text-red-700">TOTAL DE SAÍDAS DO MÊS:</span>
                <span className="font-bold text-red-700">R$ {resumo.totalGeralSaidas.toFixed(2)}</span>
              </div>

              {/* SALDO EM CADA CONTA NO FIM DO MÊS */}
              <div className="pt-4 border-t space-y-2">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Saldo Acumulado Final (Abertura + Entradas - Saídas)
                </h3>

                <div className="flex justify-between py-1 px-2 bg-slate-50 rounded">
                  <span>Sicoob C/C:</span>
                  <span className="font-semibold">R$ {saldoFinalSicoob.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 px-2 bg-slate-50 rounded">
                  <span>Mercado Pago:</span>
                  <span className="font-semibold">R$ {saldoFinalMP.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 px-2 bg-slate-50 rounded">
                  <span>Caixa / Dinheiro:</span>
                  <span className="font-semibold">R$ {saldoFinalCaixa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 px-2 bg-blue-50 text-blue-900 rounded font-semibold">
                  <span>CDB Sicoob:</span>
                  <span>R$ {saldoFinalCDB.toFixed(2)}</span>
                </div>
              </div>

              {/* TOTAL GERAL EM CAIXA DA IGREJA */}
              <div className="flex justify-between py-3 bg-slate-800 text-white px-4 rounded-lg text-lg font-bold mt-4 shadow-sm">
                <span>Saldo Final Disponível Total:</span>
                <span className={saldoFinalTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  R$ {saldoFinalTotal.toFixed(2)}
                </span>
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
