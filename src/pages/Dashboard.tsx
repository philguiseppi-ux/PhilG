import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, FileText, TrendingUp, Package } from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: 'dashboard' | 'catalog' | 'quotes' | 'quote-editor', quoteId?: string) => void;
}

interface Stats {
  totalQuotes: number;
  draftQuotes: number;
  activeServices: number;
  recentQuotes: Array<{
    id: string;
    quote_number: string;
    client_name: string;
    status: string;
    created_at: string;
  }>;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalQuotes: 0,
    draftQuotes: 0,
    activeServices: 0,
    recentQuotes: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [quotesResult, servicesResult, recentResult] = await Promise.all([
        supabase.from('quotes').select('id, status', { count: 'exact', head: true }),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase
          .from('quotes')
          .select('id, quote_number, client_name, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const draftCount = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'DRAFT');

      setStats({
        totalQuotes: quotesResult.count || 0,
        draftQuotes: draftCount.count || 0,
        activeServices: servicesResult.count || 0,
        recentQuotes: recentResult.data || [],
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewQuote = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

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
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const { data, error } = await supabase
        .from('quotes')
        .insert({
          quote_number: quoteNumber,
          client_name: 'Nouveau Client',
          client_company: '',
          client_email: '',
          client_phone: '',
          valid_until: validUntil.toISOString().split('T')[0],
          status: 'DRAFT',
          notes: '',
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      if (data) {
        onNavigate('quote-editor', data.id);
      }
    } catch (error: any) {
      console.error('Error creating quote:', error);
      alert(`Erreur lors de la création du devis: ${error.message || 'Erreur inconnue'}`);
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
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <button
          type="button"
          onClick={createNewQuote}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau Devis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Devis</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalQuotes}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Brouillons</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.draftQuotes}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Services Actifs</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.activeServices}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Devis Récents</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {stats.recentQuotes.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-600">
              Aucun devis pour le moment
            </div>
          ) : (
            stats.recentQuotes.map((quote) => (
              <div
                key={quote.id}
                className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onNavigate('quote-editor', quote.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="font-medium text-slate-900">{quote.quote_number}</p>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                          quote.status
                        )}`}
                      >
                        {quote.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{quote.client_name}</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:border-slate-300 transition-colors text-left"
        >
          <Package className="w-8 h-8 text-slate-600 mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Gérer le Catalogue</h3>
          <p className="text-sm text-slate-600">
            Ajoutez ou modifiez les services et leurs tarifs
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('quotes')}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:border-slate-300 transition-colors text-left"
        >
          <FileText className="w-8 h-8 text-slate-600 mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Voir Tous les Devis</h3>
          <p className="text-sm text-slate-600">
            Consultez et gérez l'ensemble de vos devis
          </p>
        </button>
      </div>
    </div>
  );
}
