import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Trash2, Download, FileText } from 'lucide-react';
import AddLineModal from '../components/AddLineModal';
import { generatePDF } from '../utils/pdfExport';
import { exportToSage } from '../utils/sageExport';
import { applyMultipliersToQuote } from '../utils/serviceMultipliers';

interface QuoteEditorProps {
  quoteId?: string;
  onNavigate: (page: 'dashboard' | 'catalog' | 'quotes' | 'quote-editor') => void;
}

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  client_company: string;
  client_email: string;
  client_phone: string;
  valid_until: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'LOST';
  notes: string;
}

interface QuoteLine {
  id: string;
  quote_id: string;
  service_id: string;
  datacenter_id: string | null;
  description: string;
  quantity: number;
  base_quantity: number;
  billing_selected: 'MONTHLY' | 'ONE_SHOT';
  unit_price: number;
  discount_percent: number;
  total: number;
  vcpu_count: number;
  ram_gb: number;
  disk_gb: number;
}

export default function QuoteEditor({ quoteId, onNavigate }: QuoteEditorProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLineModal, setShowAddLineModal] = useState(false);

  useEffect(() => {
    if (quoteId) {
      loadQuote();
    }
  }, [quoteId]);

  const loadQuote = async () => {
    if (!quoteId) return;

    try {
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      setQuote(quoteData);

      await applyMultipliersToQuote(quoteId);

      const { data: linesData, error: linesError } = await supabase
        .from('quote_lines')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at');

      if (linesError) throw linesError;

      setLines(linesData || []);
    } catch (error) {
      console.error('Error loading quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshLines = async () => {
    if (!quoteId) return;

    try {
      const { data: linesData, error: linesError } = await supabase
        .from('quote_lines')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at');

      if (linesError) throw linesError;

      setLines(linesData || []);
    } catch (error) {
      console.error('Error refreshing lines:', error);
    }
  };

  const handleUpdateQuote = async (field: keyof Quote, value: any) => {
    if (!quote) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', quote.id);

      if (error) throw error;

      setQuote({ ...quote, [field]: value });
    } catch (error) {
      console.error('Error updating quote:', error);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!confirm('Supprimer cette ligne ?')) return;

    try {
      const { error } = await supabase.from('quote_lines').delete().eq('id', lineId);
      if (error) throw error;

      if (quoteId) {
        await applyMultipliersToQuote(quoteId);
      }

      await refreshLines();
    } catch (error) {
      console.error('Error deleting line:', error);
    }
  };

  const handleUpdateLine = async (lineId: string, field: keyof QuoteLine, value: any) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;

    let updatedLine = { ...line, [field]: value };

    if (field === 'quantity') {
      updatedLine.base_quantity = value;
    }

    if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent') {
      updatedLine.total =
        updatedLine.quantity *
        updatedLine.unit_price *
        (1 - updatedLine.discount_percent / 100);
    }

    try {
      const updateData: any = {
        [field]: value,
        total: updatedLine.total,
      };

      if (field === 'quantity') {
        updateData.base_quantity = value;
      }

      const { error } = await supabase
        .from('quote_lines')
        .update(updateData)
        .eq('id', lineId);

      if (error) throw error;

      if (field === 'quantity' && quoteId) {
        await applyMultipliersToQuote(quoteId);
        await refreshLines();
      } else {
        setLines(lines.map((l) => (l.id === lineId ? updatedLine : l)));
      }
    } catch (error) {
      console.error('Error updating line:', error);
    }
  };

  const calculateTotals = () => {
    const monthly = lines
      .filter((l) => l.billing_selected === 'MONTHLY')
      .reduce((sum, l) => sum + l.total, 0);
    const oneShot = lines
      .filter((l) => l.billing_selected === 'ONE_SHOT')
      .reduce((sum, l) => sum + l.total, 0);

    return { monthly, oneShot, total: monthly + oneShot };
  };

  const handleExportSage = () => {
    if (!quote) return;
    exportToSage(quote.quote_number, lines);
  };

  const handleExportPDF = () => {
    if (!quote) return;
    generatePDF(quote, lines, totals);
  };

  const totals = calculateTotals();

  if (loading || !quote) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => onNavigate('quotes')}
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Devis {quote.quote_number}</h1>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <FileText className="w-5 h-5 mr-2" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportSage}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Download className="w-5 h-5 mr-2" />
            Export Sage
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations Client</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom du Client *
            </label>
            <input
              type="text"
              value={quote.client_name}
              onChange={(e) => handleUpdateQuote('client_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Société</label>
            <input
              type="text"
              value={quote.client_company}
              onChange={(e) => handleUpdateQuote('client_company', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={quote.client_email}
              onChange={(e) => handleUpdateQuote('client_email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={quote.client_phone}
              onChange={(e) => handleUpdateQuote('client_phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valide jusqu'au</label>
            <input
              type="date"
              value={quote.valid_until}
              onChange={(e) => handleUpdateQuote('valid_until', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
            <select
              value={quote.status}
              onChange={(e) => handleUpdateQuote('status', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="LOST">LOST</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={quote.notes}
            onChange={(e) => handleUpdateQuote('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Notes internes..."
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Lignes du Devis</h2>
          <button
            type="button"
            onClick={() => setShowAddLineModal(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Prix Unit.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Remise %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-900">{line.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) =>
                        handleUpdateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) =>
                        handleUpdateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                      className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      value={line.discount_percent}
                      onChange={(e) =>
                        handleUpdateLine(line.id, 'discount_percent', parseFloat(e.target.value) || 0)
                      }
                      className="w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        line.billing_selected === 'MONTHLY'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {line.billing_selected}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {line.total.toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteLine(line.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {lines.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            Aucune ligne. Cliquez sur "Ajouter" pour commencer.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Ressources Totales</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">vCPU Total:</span>
              <span className="text-lg font-bold text-blue-900">
                {lines.reduce((sum, line) => sum + (line.vcpu_count * line.quantity), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">RAM Total (GB):</span>
              <span className="text-lg font-bold text-green-900">
                {lines.reduce((sum, line) => sum + (line.ram_gb * line.quantity), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Disque Total (GB):</span>
              <span className="text-lg font-bold text-orange-900">
                {lines.reduce((sum, line) => sum + (line.disk_gb * line.quantity), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Totaux Financiers</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total Mensuel:</span>
              <span className="font-semibold text-slate-900">{totals.monthly.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total One-Shot:</span>
              <span className="font-semibold text-slate-900">{totals.oneShot.toFixed(2)} €</span>
            </div>
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between text-lg font-bold">
              <span className="text-slate-900">Total Global:</span>
              <span className="text-slate-900">{totals.total.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>

      {showAddLineModal && (
        <AddLineModal
          quoteId={quote.id}
          onClose={() => setShowAddLineModal(false)}
          onSave={async () => {
            setShowAddLineModal(false);
            if (quoteId) {
              await applyMultipliersToQuote(quoteId);
              await refreshLines();
            }
          }}
        />
      )}
    </div>
  );
}
