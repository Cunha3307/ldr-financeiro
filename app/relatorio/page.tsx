'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function RelatorioPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarRelatorio();
  }, [mes, ano]);

  const carregarRelatorio = async () => {
    setCarregando(true);

    // Buscar Período
    const { data: p } = await supabase
      .from('periodos')
      .select('id')
      .eq('mes', mes)
      .eq('ano', ano)
      .single();

    if (p) {
      // Buscar Lançamentos
      const { data: lancs } = await supabase
        .from('lancamentos')
        .select('*, categorias(nome), contas(nome)')
        .eq('periodo_id', p.id)
        .order('data', { ascending: true });

      if (lancs) {
        setLancamentos(lancs);

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

            // Filtro de Contas (Garante que Sicoob normal não pegue o CDB)
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
    } else {
      setLancamentos([]);
      setResumo(null);
    }
    setCarregando(false);
  };

  // Função para Exportar para Excel / CSV
  const exportarCSV = () => {
    if (lancamentos.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Data;Histórico;Fornecedor/Favorecido;Conta;Categoria;Tipo;Valor\n";

    lancamentos.forEach((l) => {
      const dataFmt = new Date(l.data).toLocaleDateString('pt-BR');
      const hist = (l.historico || '').replace(/;/g, ' ');
      const forn = (l.fornecedor || l.favorecido || '-').replace(/;/g, ' ');
      const conta = (l.contas?.nome || '-').replace(/;/g, ' ');
      const cat = (l.categorias?.nome || '-').replace(/;/g, ' ');
      const valor = l.valor.toString().replace('.', ',');

      csvContent += `${dataFmt};${hist};${forn};${conta};${cat};${l.tipo};${valor}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_financeiro_${mes}_${ano}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para Imprimir ou Salvar em PDF via Navegador
  const imprimirRelatorio = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12 print:bg-white print:pb-0">
      <div className="print:hidden">
        <Navbar />
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* CABEÇALHO DA TELA & BOTÕES DE AÇÃO */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
          <h1 className="text-2xl font-bold text-slate-800">Relatório Financeiro Mensal</h1>
          
          <div className="flex gap-2">
            <button
              onClick={exportarCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-sm transition"
            >
              Exportar Excel / CSV
            </button>
            <button
              onClick={imprimirRelatorio}
              className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-sm transition"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>

        {/* TÍTULO PARA IMPRESSÃO */}
        <div className="hidden print:block text-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-900">Relatório Financeiro Mensal</h1>
          <p className="text-sm text-slate-600">Período: {mes}/{ano}</p>
        </div>

        {/* FILTROS DE MÊS E ANO */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 print:hidden">
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

        {/* QUADRO DE RESUMO CONSOLIDADO */}
        {resumo && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Resumo do Mês ({mes}/{ano})</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-700">
              <div className="space-y-1">
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
              </div>

              <div className="space-y-1">
                <div className="flex justify-between py-1 border-b border-slate-100 bg-slate-50 px-2 rounded">
                  <span>Total Entradas Sicoob:</span>
                  <span className="font-medium">R$ {resumo.entradasSicoob.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 bg-slate-50 px-2 rounded">
                  <span>Total Entradas Mercado Pago:</span>
                  <span className="font-medium">R$ {resumo.entradasMercadoPago.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 bg-slate-50 px-2 rounded">
                  <span>Total Entradas Caixa:</span>
                  <span className="font-medium">R$ {resumo.entradasCaixa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 bg-blue-50 px-2 rounded font-medium text-blue-900">
                  <span>Movimentação/Saldo CDB Sicoob:</span>
                  <span>R$ {resumo.saldoCDB.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b-2 border-slate-300 font-bold text-emerald-700">
                  <span>TOTAL GERAL DE ENTRADAS:</span>
                  <span>R$ {resumo.totalGeralEntradas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b-2 border-slate-300 font-bold text-red-700">
                  <span>TOTAL GERAL DE SAÍDAS:</span>
                  <span>R$ {resumo.totalGeralSaidas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 bg-slate-800 text-white px-3 rounded font-bold mt-2">
                  <span>SALDO MÊS:</span>
                  <span className={resumo.saldoMes >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    R$ {resumo.saldoMes.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABELA DETALHADA DE LANÇAMENTOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <th className="p-3">Data</th>
                <th className="p-3">Histórico</th>
                <th className="p-3">Fornecedor / Favorecido</th>
                <th className="p-3">Conta</th>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {lancamentos.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(l.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </td>
                  <td className="p-3">{l.historico || '-'}</td>
                  <td className="p-3 font-medium text-slate-800">
                    {l.fornecedor || l.favorecido || '-'}
                  </td>
                  <td className="p-3">{l.contas?.nome || '-'}</td>
                  <td className="p-3">{l.categorias?.nome || '-'}</td>
                  <td className={`p-3 text-right font-bold whitespace-nowrap ${
                    l.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {l.tipo === 'entrada' ? '+ ' : '- '}
                    R$ {Number(l.valor).toFixed(2)}
                  </td>
                </tr>
              ))}

              {lancamentos.length === 0 && !carregando && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                    Nenhum lançamento encontrado para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
