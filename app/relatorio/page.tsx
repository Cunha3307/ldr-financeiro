import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Ajuste o import do seu cliente Supabase
import { Trash2 } from 'lucide-react'; // Ou use o ícone/SVG de sua preferência

export default function TabelaRelatorio({ lancamentos, carregarLancamentos }) {
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  // Função para excluir o lançamento
  const handleExcluir = async (id: string) => {
    const confirmou = window.confirm('Tem certeza que deseja excluir este lançamento?');
    if (!confirmou) return;

    setExcluindoId(id);

    try {
      const { error } = await supabase
        .from('lancamentos')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Erro ao excluir lançamento: ${error.message}`);
      } else {
        // Recarrega a lista de lançamentos após excluir
        if (carregarLancamentos) {
          carregarLancamentos();
        }
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado ao excluir o lançamento.');
    } finally {
      setExcluindoId(null);
    }
  };

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b">
          <th>Data</th>
          <th>Tipo</th>
          <th>Categoria</th>
          <th>Conta</th>
          <th>Descrição</th>
          <th>Valor</th>
          {/* Coluna reservada para o botão de ação */}
          <th className="text-center w-12">Ações</th>
        </tr>
      </thead>
      <tbody>
        {lancamentos && lancamentos.map((item) => (
          <tr key={item.id} className="border-b hover:bg-gray-50">
            <td>{item.data}</td>
            <td>{item.tipo}</td>
            <td>{item.categoria?.nome || item.categoria}</td>
            <td>{item.conta?.nome || item.conta}</td>
            <td>{item.descricao || item.historico}</td>
            <td>R$ {Number(item.valor).toFixed(2)}</td>
            {/* Botão de Lixeira */}
            <td className="text-center">
              <button
                onClick={() => handleExcluir(item.id)}
                disabled={excluindoId === item.id}
                title="Excluir Lançamento"
                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
