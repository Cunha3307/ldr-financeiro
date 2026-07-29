'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Constante apontando para a imagem dentro da pasta public
const LOGO_URL = '/LDR sem fundo.png';

export default function RelatorioPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [resumo, setResumo] = useState<any>(null);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarRelatorio();
  }, [mes, ano]);

  const carregarRelatorio = async () => {
    setCarregando(true);
    setResumo(null);
    setLancamentos([]);

    // 1. Buscar Período
    const { data: p } = await supabase
      .from('periodos')
      .select('*')
      .eq('mes', mes)
      .eq('ano', ano)
      .single();

    if (p) {
      // 2. Buscar Lançamentos com Categorias e Contas
      const { data: lancs } = await supabase
        .from('lancamentos')
        .select('*, categorias(nome, tipo), contas(nome)')
        .eq('periodo_id', p.id)
        .order('data', { ascending: true });

      if (lancs) {
        setLancamentos(lancs);

        // Dízimos
        let dizimosSicoob = 0;
        let dizimosMercadoPago = 0;
        let dizimosCaixa = 0;

        // Ofertas Culto
        let ofertasCultoSicoob = 0;
        let ofertasCultoMercadoPago = 0;
        let ofertasCultoCaixa = 0;

        // Ofertas Especiais
        let ofertasEspeciaisSicoob = 0;
        let ofertasEspeciaisMercadoPago = 0;
        let ofertasEspeciaisCaixa = 0;

        // Ofertas Missões
        let ofertasMissoesBanco = 0;
        let ofertasMissoesCaixa = 0;

        // Ofertas Rede Bomber
        let ofertasRedeBomberBanco = 0;
        let ofertasRedeBomberCaixa = 0;

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

            if (catNome.includes('dízimo') || catNome.includes('dizimo')) {
              if (isSicoob) dizimosSicoob += val;
              else if (isMercadoPago) dizimosMercadoPago += val;
              else if (isCaixa) dizimosCaixa += val;
            } else if (
              catNome.includes('oferta') &&
              !catNome.includes('miss') &&
              !catNome.includes('especial') &&
              !catNome.includes('bomber')
            ) {
              if (isSicoob) ofertasCultoSicoob += val;
              else if (isMercadoPago) ofertasCultoMercadoPago += val;
              else if (isCaixa) ofertasCultoCaixa += val;
            } else if (catNome.includes('especial') || catNome.includes('especiais')) {
              if (isSicoob) ofertasEspeciaisSicoob += val;
              else if (isMercadoPago) ofertasEspeciaisMercadoPago += val;
              else if (isCaixa) ofertasEspeciaisCaixa += val;
            } else if (catNome.includes('missões') || catNome.includes('missoes')) {
              if (isCaixa) ofertasMissoesCaixa += val;
              else ofertasMissoesBanco += val;
            } else if (catNome.includes('bomber')) {
              if (isCaixa) ofertasRedeBomberCaixa += val;
              else ofertasRedeBomberBanco += val;
            }
          }

          if (l.tipo === 'saida') {
            totalGeralSaidas += val;
          }
        });

        setResumo({
          dizimosSicoob,
          dizimosMercadoPago,
          dizimosCaixa,
          totalDizimos: dizimosSicoob + dizimosMercadoPago + dizimosCaixa,

          ofertasCultoSicoob,
          ofertasCultoMercadoPago,
          ofertasCultoCaixa,
          totalOfertasCulto: ofertasCultoSicoob + ofertasCultoMercadoPago + ofertasCultoCaixa,

          ofertasEspeciaisSicoob,
          ofertasEspeciaisMercadoPago,
          ofertasEspeciaisCaixa,
          totalOfertasEspeciais: ofertasEspeciaisSicoob + ofertasEspeciaisMercadoPago + ofertasEspeciaisCaixa,

          ofertasMissoesBanco,
          ofertasMissoesCaixa,
          totalOfertasMissoes: ofertasMissoesBanco + ofertasMissoesCaixa,

          ofertasRedeBomberBanco,
          ofertasRedeBomberCaixa,
          totalOfertasRedeBomber: ofertasRedeBomberBanco + ofertasRedeBomberCaixa,

          totalGeralEntradas,
          totalGeralSaidas,
          saldoPeriodo: totalGeralEntradas - totalGeralSaidas,
        });
      }
    }
    setCarregando(false);
  };

  // 1. Função de Impressão Direta
  const handleImprimir = () => {
    window.print();
  };

  // 2. Exportar em Excel/CSV
  const handleExportarExcel = () => {
    if (!lancamentos.length) return;

    const dadosExcel = lancamentos.map((l) => ({
      Data: new Date(l.data).toLocaleDateString('pt-BR'),
      Tipo: l.tipo === 'entrada' ? 'Entrada' : 'Saída',
      Categoria: l.categorias?.nome || '-',
      'Conta / Origem / Destino': l.contas?.nome || '-',
      Descrição: l.descricao || '-',
      'Valor (R$)': Number(l.valor),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
    XLSX.writeFile(workbook, `Relatorio_Contabilidade_${mes}_${ano}.xlsx`);
  };

  // 3. Exportar em PDF (Adequado para Contabilidade com Assinaturas)
  const handleExportarPDF = () => {
    if (!lancamentos.length) return;

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Relatório de Lançamentos - ${mes}/${ano}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

    const tableData = lancamentos.map((l) => [
      new Date(l.data).toLocaleDateString('pt-BR'),
      l.tipo === 'entrada' ? 'Entrada' : 'Saída',
      l.categorias?.nome || '-',
      l.contas?.nome || '-',
      l.descricao || '-',
      `R$ ${Number(l.valor).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Data', 'Tipo', 'Categoria', 'Conta', 'Descrição / Histórico', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 },
    });

    // Posição vertical logo após a tabela para as assinaturas
    const finalY = (doc as any).lastAutoTable.finalY + 25;

    // Assinatura Presidente
    doc.line(20, finalY, 90, finalY);
    doc.setFontSize(9);
    doc.text('Gislane Medeiros da Cunha', 55, finalY + 5, { align: 'center' });
    doc.text('CPF: 908.881.039-72', 55, finalY + 10, { align: 'center' });
    doc.text('Presidente Dir. Executiva', 55, finalY + 15, { align: 'center' });

    // Assinatura Tesoureiro
    doc.line(120, finalY, 190, finalY);
    doc.text('Jhonatan Dessoy', 155, finalY + 5, { align: 'center' });
    doc.text('CPF: 087.511.829-12', 155, finalY + 10, { align: 'center' });
    doc.text('Tesoureiro Geral', 155, finalY + 15, { align: 'center' });

    doc.save(`Relatorio_Contabilidade_${mes}_${ano}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12 print:bg-white print:p-0">
      <div className="print:hidden">
        <Navbar />
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 print:max-w-full print:px-0 print:pt-0">
        
        {/* CABEÇALHO OFICIAL DO RELATÓRIO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 print:shadow-none print:border-none print:p-0 print:mb-6">
          
          {/* TOPO DO CABEÇALHO (LOGO + INFO DA COMUNIDADE + SELETOR DE DATA NA TELA) */}
          <div className="flex flex-col md:flex-row items-center justify-between pb-4 border-b border-slate-200 gap-4">
            
            {/* Bloco da Esquerda: Logo + Textos Institucionais Centralizados */}
            <div className="flex items-center gap-6 w-full md:w-auto justify-center md:justify-start">
              <img 
                src={LOGO_URL} 
                alt="Logo Lugar de Refúgio" 
                className="h-20 w-auto object-contain flex-shrink-0" 
              />
              <div className="text-center md:text-left text-slate-800 space-y-0.5">
                <p className="font-bold text-lg leading-tight">Comunidade Lugar de Refúgio</p>
                <p className="text-xs text-slate-600">Rua Otto Júlio Malina, nº 279 - Ipiranga - São José - SC - CEP 88.111-500</p>
                <p className="text-xs text-slate-600">CNPJ: 47.332.459/0001-56</p>
              </div>
            </div>

            {/* Filtro de Data (Visível apenas na tela) */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 print:hidden self-center md:self-auto">
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="border border-slate-300 rounded-lg p-2 text-slate-800 text-sm bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="border border-slate-300 rounded-lg p-2 text-slate-800 text-sm w-24 bg-white"
              />
            </div>
          </div>

          {/* TÍTULO E PERÍODO CENTRALIZADOS ABAIXO */}
          <div className="text-center pt-4">
            <h1 className="text-2xl font-bold text-slate-900">Relatório Contábil e Financeiro</h1>
            <p className="text-sm font-medium text-slate-600 mt-1">Período: {mes}/{ano}</p>
          </div>

        </div>

        {/* BARRA DE BOTÕES DE AÇÃO (IMPRESSÃO / EXPORTAÇÃO) */}
        {resumo && (
          <div className="flex flex-wrap gap-3 mb-6 print:hidden">
            <button
              onClick={handleImprimir}
              className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm transition"
            >
              🖨️ Imprimir Página
            </button>
            <button
              onClick={handleExportarPDF}
              className="bg-red-700 hover:bg-red-800 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm transition"
            >
              📄 Baixar PDF
            </button>
            <button
              onClick={handleExportarExcel}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm transition"
            >
              📊 Exportar Excel / CSV
            </button>
          </div>
        )}

        {carregando ? (
          <p className="text-center text-slate-500 py-12">Carregando relatório...</p>
        ) : resumo ? (
          <div className="space-y-8">
            
            {/* SEÇÃO 1: RESUMO CONSOLIDADO DAS ENTRADAS POR CONTA */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
              <h2 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">
                1. Resumo por Categorias e Contas: {mes}/{ano}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
                
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
                    <span>Total Dízimos:</span>
                    <span>R$ {resumo.totalDizimos.toFixed(2)}</span>
                  </div>
                </div>

                {/* 2. OFERTAS CULTO */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-1.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ofertas Culto</p>
                  <div className="flex justify-between">
                    <span>Ofertas Culto Sicoob:</span>
                    <span className="font-medium">R$ {resumo.ofertasCultoSicoob.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ofertas Culto MP:</span>
                    <span className="font-medium">R$ {resumo.ofertasCultoMercadoPago.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ofertas Culto Caixa:</span>
                    <span className="font-medium">R$ {resumo.ofertasCultoCaixa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                    <span>Total Ofertas Culto:</span>
                    <span>R$ {resumo.totalOfertasCulto.toFixed(2)}</span>
                  </div>
                </div>

                {/* 3. OFERTAS ESPECIAIS */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-1.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ofertas Especiais</p>
                  <div className="flex justify-between">
                    <span>Especiais Sicoob:</span>
                    <span className="font-medium">R$ {resumo.ofertasEspeciaisSicoob.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Especiais MP:</span>
                    <span className="font-medium">R$ {resumo.ofertasEspeciaisMercadoPago.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Especiais Caixa:</span>
                    <span className="font-medium">R$ {resumo.ofertasEspeciaisCaixa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                    <span>Total Especiais:</span>
                    <span>R$ {resumo.totalOfertasEspeciais.toFixed(2)}</span>
                  </div>
                </div>

                {/* 4. MISSÕES */}
                <div className="bg-amber-50/50 p-3.5 rounded-lg border border-amber-200/70 space-y-1.5">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Ofertas Missões</p>
                  <div className="flex justify-between">
                    <span>Missões (Banco):</span>
                    <span className="font-medium">R$ {resumo.ofertasMissoesBanco.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Missões (Caixa):</span>
                    <span className="font-medium">R$ {resumo.ofertasMissoesCaixa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-amber-200 font-bold text-amber-950">
                    <span>Total Missões:</span>
                    <span>R$ {resumo.totalOfertasMissoes.toFixed(2)}</span>
                  </div>
                </div>

                {/* 5. REDE BOMBER */}
                <div className="bg-amber-50/50 p-3.5 rounded-lg border border-amber-200/70 space-y-1.5">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Ofertas Rede Bomber</p>
                  <div className="flex justify-between">
                    <span>Rede Bomber (Banco):</span>
                    <span className="font-medium">R$ {resumo.ofertasRedeBomberBanco.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rede Bomber (Caixa):</span>
                    <span className="font-medium">R$ {resumo.ofertasRedeBomberCaixa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-amber-200 font-bold text-amber-950">
                    <span>Total Rede Bomber:</span>
                    <span>R$ {resumo.totalOfertasRedeBomber.toFixed(2)}</span>
                  </div>
                </div>

                {/* RESUMO GERAL */}
                <div className="bg-slate-800 text-white p-3.5 rounded-lg space-y-1.5 flex flex-col justify-between">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Totais da Mês</p>
                  <div className="flex justify-between text-xs">
                    <span>Total Entradas:</span>
                    <span className="text-emerald-400 font-semibold">R$ {resumo.totalGeralEntradas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Total Saídas:</span>
                    <span className="text-red-400 font-semibold">R$ {resumo.totalGeralSaidas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700 text-sm font-bold">
                    <span>Resultado do Mês:</span>
                    <span className={resumo.saldoPeriodo >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      R$ {resumo.saldoPeriodo.toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* SEÇÃO 2: RELATÓRIO DETALHADO ITEM POR ITEM */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
              <h2 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">
                2. Lançamentos Detalhados (Entradas e Saídas)
              </h2>

              {lancamentos.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  Nenhum lançamento registrado no mês selecionado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs uppercase font-bold print:bg-slate-200">
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Conta / Origem / Destino</th>
                        <th className="py-2.5 px-3">Descrição / Histórico</th>
                        <th className="py-2.5 px-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {lancamentos.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {new Date(l.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                l.tipo === 'entrada'
                                  ? 'bg-emerald-100 text-emerald-800 print:bg-transparent print:text-black'
                                  : 'bg-red-100 text-red-800 print:bg-transparent print:text-black'
                              }`}
                            >
                              {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {l.categorias?.nome || '-'}
                          </td>
                          <td className="py-2.5 px-3">{l.contas?.nome || '-'}</td>
                          <td className="py-2.5 px-3">{l.descricao || '-'}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                              l.tipo === 'entrada' ? 'text-emerald-600 print:text-black' : 'text-red-600 print:text-black'
                            }`}
                          >
                            {l.tipo === 'entrada' ? '+' : '-'} R$ {Number(l.valor).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SEÇÃO DE ASSINATURAS (NO FINAL DO RELATÓRIO) */}
            <div className="pt-12 pb-6 grid grid-cols-1 md:grid-cols-2 gap-12 text-center text-slate-800 print:pt-16">
              {/* Presidente */}
              <div className="flex flex-col items-center">
                <div className="w-64 border-t border-slate-400 mb-2 print:border-black"></div>
                <p className="font-bold text-sm">Gislane Medeiros da Cunha</p>
                <p className="text-xs text-slate-600 print:text-slate-800">CPF: 908.881.039-72</p>
                <p className="text-xs font-medium text-slate-700 print:text-black">Presidente Dir. Executiva</p>
              </div>

              {/* Tesoureiro */}
              <div className="flex flex-col items-center">
                <div className="w-64 border-t border-slate-400 mb-2 print:border-black"></div>
                <p className="font-bold text-sm">Jhonatan Dessoy</p>
                <p className="text-xs text-slate-600 print:text-slate-800">CPF: 087.511.829-12</p>
                <p className="text-xs font-medium text-slate-700 print:text-black">Tesoureiro Geral</p>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl text-center text-slate-500 border border-slate-200">
            Nenhum período/lançamento localizado para esta data.
          </div>
        )}
      </div>
    </div>
  );
}
