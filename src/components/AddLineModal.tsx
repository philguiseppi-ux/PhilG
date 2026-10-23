import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';
import { calculateDependentServices } from '../utils/serviceDependencies';

interface Service {
  id: string;
  code: string;
  name: string;
  billing_mode: 'MONTHLY' | 'ONE_SHOT' | 'BOTH';
  base_price_monthly: number | null;
  base_price_one_shot: number | null;
  unit: string;
  category_id: string;
  vcpu_count: number;
  ram_gb: number;
  disk_gb: number;
}

interface Category {
  id: string;
  name: string;
}

interface Datacenter {
  id: string;
  name: string;
}

interface AddLineModalProps {
  quoteId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function AddLineModal({ quoteId, onClose, onSave }: AddLineModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [datacenters, setDatacenters] = useState<Datacenter[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDatacenterId, setSelectedDatacenterId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [billingSelected, setBillingSelected] = useState<'MONTHLY' | 'ONE_SHOT'>('MONTHLY');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [servicesResult, categoriesResult, datacentersResult] = await Promise.all([
      supabase.from('services').select('*').eq('is_active', true).order('code'),
      supabase.from('service_categories').select('*').order('name'),
      supabase.from('datacenters').select('*').order('name'),
    ]);

    if (servicesResult.data) setServices(servicesResult.data);
    if (categoriesResult.data) setCategories(categoriesResult.data);
    if (datacentersResult.data) setDatacenters(datacentersResult.data);
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    if (service.billing_mode === 'MONTHLY') {
      setBillingSelected('MONTHLY');
      setUnitPrice(service.base_price_monthly || 0);
    } else if (service.billing_mode === 'ONE_SHOT') {
      setBillingSelected('ONE_SHOT');
      setUnitPrice(service.base_price_one_shot || 0);
    } else if (service.billing_mode === 'BOTH') {
      setBillingSelected('MONTHLY');
      setUnitPrice(service.base_price_monthly || 0);
    }
  };

  const handleBillingChange = (billing: 'MONTHLY' | 'ONE_SHOT') => {
    setBillingSelected(billing);
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) return;

    if (billing === 'MONTHLY') {
      setUnitPrice(service.base_price_monthly || 0);
    } else {
      setUnitPrice(service.base_price_one_shot || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServiceId) {
      alert('Veuillez sélectionner un service');
      return;
    }

    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) return;

    const total = quantity * unitPrice * (1 - discountPercent / 100);

    try {
      const { error } = await supabase.from('quote_lines').insert({
        quote_id: quoteId,
        service_id: selectedServiceId,
        datacenter_id: selectedDatacenterId || null,
        description: `${service.name} (${service.code})`,
        quantity,
        base_quantity: quantity,
        billing_selected: billingSelected,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        total,
        vcpu_count: service.vcpu_count || 0,
        ram_gb: service.ram_gb || 0,
        disk_gb: service.disk_gb || 0,
      });

      if (error) throw error;

      const dependentServices = await calculateDependentServices(selectedServiceId);

      for (const dep of dependentServices) {
        const depUnitPrice = billingSelected === 'MONTHLY'
          ? (dep.service.base_price_monthly || 0)
          : (dep.service.base_price_one_shot || 0);

        const depQuantity = dep.quantity * quantity;
        const depTotal = depQuantity * depUnitPrice;

        const { error: depError } = await supabase.from('quote_lines').insert({
          quote_id: quoteId,
          service_id: dep.service.id,
          datacenter_id: selectedDatacenterId || null,
          description: `${dep.service.name} (${dep.service.code}) - Auto-ajouté: ${dep.dependency.description}`,
          quantity: depQuantity,
          base_quantity: depQuantity,
          billing_selected: billingSelected,
          unit_price: depUnitPrice,
          discount_percent: 0,
          total: depTotal,
          vcpu_count: 0,
          ram_gb: 0,
          disk_gb: 0,
        });

        if (depError) {
          console.error('Error adding dependent service:', depError);
        }
      }

      onSave();
    } catch (error) {
      console.error('Error adding line:', error);
      alert('Erreur lors de l\'ajout de la ligne');
    }
  };

  const filteredServices = services.filter((service) => {
    return filterCategory === 'all' || service.category_id === filterCategory;
  });

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const canSelectBilling = selectedService?.billing_mode === 'BOTH';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Ajouter une Ligne</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Filtrer par Catégorie
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Service *
            </label>
            <select
              required
              value={selectedServiceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner un service</option>
              {filteredServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.code} - {service.name} ({service.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Datacenter (optionnel)
            </label>
            <select
              value={selectedDatacenterId}
              onChange={(e) => setSelectedDatacenterId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Aucun</option>
              {datacenters.map((dc) => (
                <option key={dc.id} value={dc.id}>
                  {dc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantité *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type de Facturation *
              </label>
              <select
                value={billingSelected}
                onChange={(e) => handleBillingChange(e.target.value as 'MONTHLY' | 'ONE_SHOT')}
                disabled={!canSelectBilling}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
              >
                <option value="MONTHLY">Mensuel</option>
                <option value="ONE_SHOT">One-Shot</option>
              </select>
              {!canSelectBilling && selectedService && (
                <p className="text-xs text-slate-500 mt-1">
                  Ce service supporte uniquement {selectedService.billing_mode}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prix Unitaire (€) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Remise (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Total de la ligne:</span>
              <span className="text-lg font-bold text-slate-900">
                {(quantity * unitPrice * (1 - discountPercent / 100)).toFixed(2)} €
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
