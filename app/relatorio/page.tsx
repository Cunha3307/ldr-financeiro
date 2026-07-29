'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function RelatorioPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [resumo, setResumo] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarRelatorio();
  }, [mes, ano]);

  const carregarRelatorio = async () => {
    setCarregando(true);
    setResumo(null);

    // 1. Buscar Período
    const { data: p } = await supabase
      .from('periodos')
      .select('*')
      .eq('mes', mes)
      .eq('ano', ano)
      .single();

    if (p) {
      // 2. Buscar Lançamentos do Período
      const { data: lancs } = await supabase
        .from('lancamentos')
        .select('*, categorias(nome, tipo), contas(id, nome)')
        .eq('periodo_id', p.id);

      if (lancs) {
        // Dízimos por Conta
        let dizimosSicoob = 0;
        let dizimosMercadoPago = 0;
        let dizimosCaixa = 0;

        // Ofertas Culto por Conta
        let ofertasCultoSicoob = 0;
        let ofertasCultoMercadoPago = 0;
        let ofertasCultoCaixa = 0;

        // Ofertas Especiais por Conta
        let ofertasEspeciaisSicoob = 0;
        let ofertasEspeciaisMercadoPago = 0;
        let ofertasEspeciaisCaixa = 0;

        // Ofertas Missões por Conta
        let ofertasMissoesBanco = 0;
        let ofertasMissoesCaixa = 0;

        // Ofertas Rede Bomber por Conta
        let ofertasRedeBomberBanco = 0;
        let ofertasRedeBomberCaixa = 0;

        // Totais de Saídas e Entradas
        let totalGeralEntradas = 0;
        let totalGeralSaidas = 0;

        lancs.forEach((l) => {
          const val = Number(l.valor);
          const catNome = l.categorias?.nome ? l.categorias.nome.toLowerCase() : '';
          const contaNome = l.contas?.nome ? l.contas.nome.toLowerCase() : '';

          const isSicoob = contaNome.includes('sicoob');
          const isMercadoPago = contaNome.includes('mercado') || contaNome.includes('pago');
          const isCaixa = contaNome.includes('caixa') || contaNome.includes('dinheiro');

          if (l.tipo === 'entrada') {
            totalGeralEntradas += val;

            // 1. DÍZIMOS
            if (catNome.includes('dízimo') || catNome.includes('dizimo')) {
              if (isSicoob) dizimosSicoob += val;
              else if (isMercadoPago) dizimosMercadoPago += val;
              else if (isCaixa) dizimosCaixa += val;
            }
            // 2. OFERTAS CULTO (Geral)
            else if (catNome.includes('oferta') && !catNome.includes('miss') && !catNome.includes('especial') && !catNome.includes('bomber')) {
              if (isSicoob) ofertasCultoSicoob += val;
              else if (isMercadoPago) ofertasCultoMercadoPago += val;
              else if (isCaixa) ofertasCultoCaixa += val;
            }
            // 3. OFERTAS ESPECIAIS
            else if (catNome.includes('especial') || catNome.includes('especiais')) {
              if (isSicoob) ofertasEspeciaisSicoob += val;
              else if (isMercadoPago) ofertasEspeciaisMercadoPago += val;
              else if (isCaixa) ofertasEspeciaisCaixa += val;
            }
            // 4. OFERTAS MISSÕES
            else if (catNome.includes('missões') || catNome.includes('missoes')) {
              if (isCaixa) ofertasMissoesCaixa += val;
              else ofertasMissoesBanco += val; // Sicoob / MP / Banco
            }
            // 5. OFERTAS REDE BOMBER
            else if (catNome.includes('bomber')) {
              if (isCaixa) ofertasRedeBomberCaixa += val;
              else ofertasRedeBomberBanco += val; // Sicoob / MP / Banco
            }
          }

          if (l.tipo === 'saida') {
            totalGeralSaidas += val;
          }
        });

        // Totais Calculados
        const totalDizimos = dizimosSicoob + dizimosMercadoPago + dizimosCaixa;
        const totalOfertasCulto = ofertasCultoSicoob + ofertasCultoMercadoPago + ofertasCultoCaixa;
        const totalOfertasEspeciais = ofertasEspeciaisSicoob + ofertasEspeciaisMercadoPago + ofertasEspeciaisCaixa;
        const totalOfertasMissoes = ofertasMissoesBanco + ofertasMissoesCaixa;
        const totalOfertasRedeBomber = ofertasRedeBomberBanco + ofertasRedeBomberCaixa;

        setResumo({
          dizimosSicoob,
          dizimosMercadoPago,
          dizimosCaixa,
          totalDizimos,

          ofertasCultoSicoob,
          ofertasCultoMercadoPago,
          ofertasCultoCaixa,
          totalOfertasCulto,

          ofertasEspeciaisSicoob,
          ofertasEspeciaisMercadoPago,
          ofertasEspeciaisCaixa,
          totalOfertasEspeciais,

          ofertasMissoesBanco,
          ofertasMissoesCaixa,
          totalOfertasMissoes,

          ofertasRedeBomberBanco,
          ofertasRedeBomberCaixa,
          totalOfertasRedeBomber,

          totalGeralEntradas,
          totalGeralSaidas,
        });
      }
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Relatório Mensal de Entradas</h1>

        {/* SELETOR DE MÊS/ANO */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="border border-slate-300 rounded-lg p-2 text-slate-800 text-sm"
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
              className="border border-slate-300 rounded-lg p-2 text-slate-800 text-sm w-28"
            />
          </div>
        </div>

        {/* DEMONSTRATIVO DETALHADO */}
        {carregando ? (
          <p className="text-center text-slate-500 py-8">Carregando relatório...</p>
        ) : resumo ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b pb-3">
              Resumo Detalhado do Mês: {mes}/{ano}
            </h2>

            <div className="space-y-4 text-sm text-slate-700">
              
              {/* 1. DÍZIMOS */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-1.5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dízimos</p>
                <div className="flex justify-between">
                  <span>Dízimos Sicoob:</span>
                  <span className="font-medium">R$ {resumo.dizimosSicoob.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dízimos Mercado Pago:</span>
                  <span className="font-medium">R$ {resumo.dizimosMercadoPago.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dízimos Caixa:</span>
                  <span className="font-medium">R$ {resumo.dizimosCaixa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                  <span>Total de Dízimos:</span>
                  <span>R$ {resumo.totalDizimos.toFixed(2)}</span>
                </div>
              </div>

              {/* 2. OFERTAS CULTO */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-1.5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ofertas de Culto</p>
                <div className="flex justify-between">
                  <span>Ofertas Culto Sicoob:</span>
                  <span className="font-medium">R$ {resumo.ofertasCultoSicoob.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ofertas Culto Mercado Pago:</span>
                  <span className="font-medium">R$ {resumo.ofertasCultoMercadoPago.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ofertas Culto Caixa:</span>
                  <span className="font-medium">R$ {resumo.ofertasCultoCaixa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                  <span>Total de Ofertas Culto:</span>
                  <span>R$ {resumo.totalOfertasCulto.toFixed(2)}</span>
                </div>
              </div>

              {/* 3. OFERTAS ESPECIAIS */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-1.5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ofertas Especiais</p>
                <div className="flex justify-between">
                  <span>Ofertas Especiais Sicoob:</span>
                  <span className="font-medium">R$ {resumo.ofertasEspeciaisSicoob.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ofertas Especiais Mercado Pago:</span>
                  <span className="font-medium">R$ {resumo.ofertasEspeciaisMercadoPago.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ofertas Especiais Caixa:</span>
                  <span className="font-medium">R$ {resumo.ofertasEspeciaisCaixa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                  <span>Total de Ofertas Especiais:</span>
                  <span>R$ {resumo.totalOfertasEspeciais.toFixed(2)}</span>
                </div>
              </div>

              {/* 4. OFERTAS MISSÕES */}
              <div className="bg-amber-50/50 p-3.5 rounded-lg border border-amber-200/70 space-y-1.5">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Ofertas Missões</p>
                <div className="flex justify-between">
                  <span>Ofertas Missões (Banco):</span>
                  <span className="font-medium">R$ {resumo.ofertasMissoesBanco.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ofertas Missões (Caixa):</span>
                  <span className="font-medium">R$ {resumo.ofertasMissoesCaixa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-amber-200 font-bold text-amber-950">
                  <span>Total de Ofertas Missões:</span>
                  <span>R$ {resumo.totalOfertasMissoes.toFixed(2)}</span>
                </div>
              </div>

              {/* 5. OFERTAS REDE BOMBER */}
              <div className="bg-amber-50/50 p-3.5 rounded-lg border border-amber-200/70 space-y-1.5">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Ofertas Rede Bomber</p>
                <div className="flex justify-between">
                  <span>Ofertas Rede Bomber (Banco):</span>
                  <span className="font-medium">R$ {resumo.ofertasRedeBomberBanco.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ofertas Rede Bomber (Caixa):</span>
                  <span className="font-medium">R$ {resumo.ofertasRedeBomberCaixa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-amber-200 font-bold text-amber-950">
                  <span>Total de Ofertas Rede Bomber:</span>
                  <span>R$ {resumo.totalOfertasRedeBomber.toFixed(2)}</span>
                </div>
              </div>

              {/* RESUMO DE ENTRADAS GERAIS */}
              <div className="flex justify-between py-3 px-4 bg-emerald-700 text-white rounded-lg text-base font-bold mt-6 shadow-sm">
                <span>TOTAL GERAL DE ENTRADAS:</span>
                <span>R$ {resumo.totalGeralEntradas.toFixed(2)}</span>
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl text-center text-slate-500 border border-slate-200">
            Nenhum lançamento ou período encontrado para esta data.
          </div>
        )}
      </div>
    </div>
  );
}
