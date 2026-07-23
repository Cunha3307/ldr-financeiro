'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function RelatorioPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [lancamentos, setLancamentos] = useState<any[]>([]);

  useEffect(() => {
    carregarRelatorio();
  }, [mes, ano]);

  const carregarRelatorio = async () => {
    const { data: p } = await supabase
      .from('periodos')
      .select('id')
      .eq('mes', mes)
      .eq('ano', ano)
      .single();

    if (p) {
      const { data: l } = await supabase
        .from('lancamentos')
        .select('*, contas(nome), categorias(nome)')
        .eq('periodo_id', p.id)
        .order('data', { ascending: true });

      if (l) setLancamentos(l);
    } else {
      setLancamentos([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Relatório Financeiro Mensal</h1>

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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Histórico</th>
                <th className="p-3">Conta</th>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lancamentos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    Nenhum lançamento encontrado para este mês.
                  </td>
                </tr>
              ) : (
                lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap">{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3">{l.historico}</td>
                    <td className="p-3 whitespace-nowrap">{l.contas?.nome}</td>
                    <td className="p-3 whitespace-nowrap">{l.categorias?.nome}</td>
                    <td
                      className={`p-3 text-right font-bold whitespace-nowrap ${
                        l.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {l.tipo === 'entrada' ? '+' : '-'} R$ {Number(l.valor).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
