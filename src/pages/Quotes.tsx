import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Eye, Copy, Trash2 } from 'lucide-react';

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  client_company: string;
  client_email: string;
  valid_until: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'LOST';
  created_at: string;
  updated_at: string;
}

interface QuotesProps {
  onNavigate: (page: 'dashboard' | 'catalog' | 'quotes' | 'quote-editor', quoteId?: string) => void;
}

export default function Quotes({ onNavigate }: QuotesProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [totals, setTotals] = useState<Record<string, { monthly: number; oneShot: number }>>({});

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuotes(data || []);

      const totalsMap: Record<string, { monthly: number; oneShot: number }> = {};
      for (const quote of data || []) {
        const { data: lines } = await supabase
          .from('quote_lines')
          .select('total, billing_selected')
          .eq('quote_id', quote.id);

        const monthly = lines
          ?.filter((l) => l.billing_selected === 'MONTHLY')
          .reduce((sum, l) => sum + l.total, 0) || 0;
        const oneShot = lines
          ?.filter((l) => l.billing_selected === 'ONE_SHOT')
          .reduce((sum, l) => sum + l.total, 0) || 0;

        totalsMap[quote.id] = { monthly, oneShot };
      }
      setTotals(totalsMap);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;

    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) throw error;
      await loadQuotes();
    } catch (error) {
      console.error('Error deleting quote:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDuplicate = async (quote: Quote) => {
    try {
      const year = new Date().getFullYear();
      const { data: lastQuote } = await supabase
        .from('quotes')
        .select('quote_number')
        .like('quote_number', `${year}-%`)
        .order('quote_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastQuote) {
        const lastNumber = parseInt(lastQuote.quote_number.split('-')[1]);
        nextNumber = lastNumber + 1;
      }

      const quoteNumber = `${year}-${String(nextNumber).padStart(3, '0')}`;

      const { data: newQuote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_number: quoteNumber,
          client_name: quote.client_name,
          client_company: quote.client_company,
          client_email: quote.client_email,
          client_phone: '',
          valid_until: quote.valid_until,
          status: 'DRAFT',
          notes: quote.notes || '',
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const { data: lines } = await supabase
        .from('quote_lines')
        .select('*')
        .eq('quote_id', quote.id);

      if (lines && lines.length > 0) {
        const newLines = lines.map((line) => ({
          quote_id: newQuote.id,
          service_id: line.service_id,
          datacenter_id: line.datacenter_id,
          description: line.description,
          quantity: line.quantity,
          billing_selected: line.billing_selected,
          unit_price: line.unit_price,
          discount_percent: line.discount_percent,
          total: line.total,
        }));

        const { error: linesError } = await supabase.from('quote_lines').insert(newLines);
        if (linesError) throw linesError;
      }

      await loadQuotes();
      alert('Devis dupliqué avec succès');
    } catch (error) {
      console.error('Error duplicating quote:', error);
      alert('Erreur lors de la duplication');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-800',
      SENT: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      LOST: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || colors.DRAFT;
  };

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client_company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Devis</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Numéro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Société
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Validité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Total Mensuel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Total One-Shot
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {quote.quote_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {quote.client_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {quote.client_company || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                        quote.status
                      )}`}
                    >
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {totals[quote.id]?.monthly.toFixed(2) || '0.00'} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {totals[quote.id]?.oneShot.toFixed(2) || '0.00'} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => onNavigate('quote-editor', quote.id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Voir/Éditer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(quote)}
                        className="text-green-600 hover:text-green-900 transition-colors"
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(quote.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuotes.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            Aucun devis trouvé
          </div>
        )}
      </div>
    </div>
  );
}
