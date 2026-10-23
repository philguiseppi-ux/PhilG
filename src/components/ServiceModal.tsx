import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Trash2, Link } from 'lucide-react';

interface ResourceDetail {
  id?: string;
  resource_type: 'CPU' | 'RAM' | 'DISK';
  quantity: number;
  unit: string;
  description: string;
}

interface ServiceDependency {
  id?: string;
  dependent_service_id: string;
  dependency_type: 'REQUIRED' | 'OPTIONAL' | 'AUTO_SCALE';
  resource_matcher: 'CPU' | 'RAM' | 'DISK' | 'ALL' | null;
  quantity_multiplier: number;
  auto_add: boolean;
  description: string;
  dependent_service_name?: string;
}

interface ServiceMultiplier {
  id?: string;
  affected_category_id: string;
  multiplier_factor: number;
  description: string;
  category_name?: string;
}

interface Service {
  id?: string;
  code: string;
  name: string;
  description: string;
  category_id: string;
  service_type: 'UNIT' | 'OPTION' | 'BASE';
  billing_scope: string;
  billing_mode: 'MONTHLY' | 'ONE_SHOT' | 'BOTH';
  base_price_monthly: number | null;
  base_price_one_shot: number | null;
  unit: string;
  is_active: boolean;
  sage_item_code: string;
  sage_vat_code: string;
  sage_analytic_code?: string | null;
  vcpu_count?: number;
  ram_gb?: number;
  disk_gb?: number;
  is_multiplier?: boolean;
  multiplier_value?: number;
}

interface Category {
  id: string;
  name: string;
}

interface ServiceModalProps {
  service: Service | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

export default function ServiceModal({ service, categories, onClose, onSave }: ServiceModalProps) {
  const [formData, setFormData] = useState<Service>({
    code: '',
    name: '',
    description: '',
    category_id: categories[0]?.id || '',
    service_type: 'UNIT',
    billing_scope: 'PER_VM',
    billing_mode: 'MONTHLY',
    base_price_monthly: null,
    base_price_one_shot: null,
    unit: '',
    is_active: true,
    sage_item_code: '',
    sage_vat_code: '20',
    sage_analytic_code: null,
    vcpu_count: 0,
    ram_gb: 0,
    disk_gb: 0,
    is_multiplier: false,
    multiplier_value: 2.0,
  });
  const [resourceDetails, setResourceDetails] = useState<ResourceDetail[]>([]);
  const [deletedResourceIds, setDeletedResourceIds] = useState<string[]>([]);
  const [dependencies, setDependencies] = useState<ServiceDependency[]>([]);
  const [deletedDependencyIds, setDeletedDependencyIds] = useState<string[]>([]);
  const [multipliers, setMultipliers] = useState<ServiceMultiplier[]>([]);
  const [deletedMultiplierIds, setDeletedMultiplierIds] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);

  useEffect(() => {
    loadAvailableServices();
  }, []);

  useEffect(() => {
    if (service) {
      setFormData(service);
      loadResourceDetails(service.id!);
      loadDependencies(service.id!);
      loadMultipliers(service.id!);
    } else {
      setResourceDetails([]);
      setDeletedResourceIds([]);
      setDependencies([]);
      setDeletedDependencyIds([]);
      setMultipliers([]);
      setDeletedMultiplierIds([]);
    }
  }, [service]);

  const loadAvailableServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, code, name, service_type')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAvailableServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadResourceDetails = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_resource_details')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at');

      if (error) throw error;
      setResourceDetails(data || []);
    } catch (error) {
      console.error('Error loading resource details:', error);
    }
  };

  const loadDependencies = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_dependencies')
        .select(`
          id,
          dependent_service_id,
          dependency_type,
          resource_matcher,
          quantity_multiplier,
          auto_add,
          description,
          services:dependent_service_id(name)
        `)
        .eq('parent_service_id', serviceId);

      if (error) throw error;

      const deps = (data || []).map((d: any) => ({
        ...d,
        dependent_service_name: d.services?.name || '',
      }));
      setDependencies(deps);
    } catch (error) {
      console.error('Error loading dependencies:', error);
    }
  };

  const loadMultipliers = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_multipliers')
        .select(`
          id,
          affected_category_id,
          multiplier_factor,
          description,
          service_categories:affected_category_id(name)
        `)
        .eq('service_id', serviceId);

      if (error) throw error;

      const mults = (data || []).map((m: any) => ({
        ...m,
        category_name: m.service_categories?.name || '',
      }));
      setMultipliers(mults);
    } catch (error) {
      console.error('Error loading multipliers:', error);
    }
  };

  const addMultiplier = () => {
    const firstCategory = categories.find(c => c.id !== formData.category_id);
    if (firstCategory) {
      setMultipliers([
        ...multipliers,
        {
          affected_category_id: firstCategory.id,
          multiplier_factor: formData.multiplier_value || 2.0,
          description: '',
          category_name: firstCategory.name,
        },
      ]);
    }
  };

  const updateMultiplier = (index: number, field: keyof ServiceMultiplier, value: any) => {
    const updated = [...multipliers];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'affected_category_id') {
      const selectedCategory = categories.find(c => c.id === value);
      updated[index].category_name = selectedCategory?.name || '';
    }

    setMultipliers(updated);
  };

  const removeMultiplier = (index: number) => {
    const mult = multipliers[index];
    if (mult.id) {
      setDeletedMultiplierIds([...deletedMultiplierIds, mult.id]);
    }
    setMultipliers(multipliers.filter((_, i) => i !== index));
  };

  const addResourceDetail = () => {
    setResourceDetails([
      ...resourceDetails,
      { resource_type: 'CPU', quantity: 0, unit: 'vCPU', description: '' },
    ]);
  };

  const updateResourceDetail = (index: number, field: keyof ResourceDetail, value: any) => {
    const updated = [...resourceDetails];
    updated[index] = { ...updated[index], [field]: value };
    setResourceDetails(updated);
  };

  const removeResourceDetail = (index: number) => {
    const detail = resourceDetails[index];
    if (detail.id) {
      setDeletedResourceIds([...deletedResourceIds, detail.id]);
    }
    setResourceDetails(resourceDetails.filter((_, i) => i !== index));
  };

  const addDependency = () => {
    const firstService = availableServices.find(s => s.id !== service?.id);
    if (firstService) {
      setDependencies([
        ...dependencies,
        {
          dependent_service_id: firstService.id!,
          dependency_type: 'AUTO_SCALE',
          resource_matcher: 'DISK',
          quantity_multiplier: 1.0,
          auto_add: true,
          description: '',
          dependent_service_name: firstService.name,
        },
      ]);
    }
  };

  const updateDependency = (index: number, field: keyof ServiceDependency, value: any) => {
    const updated = [...dependencies];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'dependent_service_id') {
      const selectedService = availableServices.find(s => s.id === value);
      updated[index].dependent_service_name = selectedService?.name || '';
    }

    setDependencies(updated);
  };

  const removeDependency = (index: number) => {
    const dep = dependencies[index];
    if (dep.id) {
      setDeletedDependencyIds([...deletedDependencyIds, dep.id]);
    }
    setDependencies(dependencies.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let serviceId = service?.id;

      if (service?.id) {
        const { error } = await supabase
          .from('services')
          .update(formData)
          .eq('id', service.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('services')
          .insert(formData)
          .select()
          .single();
        if (error) throw error;
        serviceId = data.id;
      }

      if (formData.service_type === 'BASE' && serviceId) {
        for (const id of deletedResourceIds) {
          await supabase.from('service_resource_details').delete().eq('id', id);
        }

        for (const detail of resourceDetails) {
          if (detail.id) {
            const { error } = await supabase
              .from('service_resource_details')
              .update({
                resource_type: detail.resource_type,
                quantity: detail.quantity,
                unit: detail.unit,
                description: detail.description,
              })
              .eq('id', detail.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('service_resource_details').insert({
              service_id: serviceId,
              resource_type: detail.resource_type,
              quantity: detail.quantity,
              unit: detail.unit,
              description: detail.description,
            });
            if (error) throw error;
          }
        }
      }

      if (serviceId) {
        for (const id of deletedDependencyIds) {
          await supabase.from('service_dependencies').delete().eq('id', id);
        }

        for (const dep of dependencies) {
          if (dep.id) {
            const { error } = await supabase
              .from('service_dependencies')
              .update({
                dependent_service_id: dep.dependent_service_id,
                dependency_type: dep.dependency_type,
                resource_matcher: dep.resource_matcher,
                quantity_multiplier: dep.quantity_multiplier,
                auto_add: dep.auto_add,
                description: dep.description,
              })
              .eq('id', dep.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('service_dependencies').insert({
              parent_service_id: serviceId,
              dependent_service_id: dep.dependent_service_id,
              dependency_type: dep.dependency_type,
              resource_matcher: dep.resource_matcher,
              quantity_multiplier: dep.quantity_multiplier,
              auto_add: dep.auto_add,
              description: dep.description,
            });
            if (error) throw error;
          }
        }

        if (formData.is_multiplier) {
          for (const id of deletedMultiplierIds) {
            await supabase.from('service_multipliers').delete().eq('id', id);
          }

          for (const mult of multipliers) {
            if (mult.id) {
              const { error } = await supabase
                .from('service_multipliers')
                .update({
                  affected_category_id: mult.affected_category_id,
                  multiplier_factor: mult.multiplier_factor,
                  description: mult.description,
                })
                .eq('id', mult.id);
              if (error) throw error;
            } else {
              const { error } = await supabase.from('service_multipliers').insert({
                service_id: serviceId,
                affected_category_id: mult.affected_category_id,
                multiplier_factor: mult.multiplier_factor,
                description: mult.description,
              });
              if (error) throw error;
            }
          }
        } else {
          await supabase.from('service_multipliers').delete().eq('service_id', serviceId);
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">
            {service ? 'Modifier le Service' : 'Nouveau Service'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="CPU-1VC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1 vCPU"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description détaillée du service"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Catégorie *
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type *
              </label>
              <select
                required
                value={formData.service_type}
                onChange={(e) =>
                  setFormData({ ...formData, service_type: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="UNIT">UNIT</option>
                <option value="OPTION">OPTION</option>
                <option value="BASE">BASE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Portée de Facturation *
              </label>
              <select
                required
                value={formData.billing_scope}
                onChange={(e) => setFormData({ ...formData, billing_scope: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="PER_VM">PER_VM</option>
                <option value="PER_CLIENT">PER_CLIENT</option>
                <option value="PER_DC">PER_DC</option>
                <option value="ONE_SHOT">ONE_SHOT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mode de Facturation *
              </label>
              <select
                required
                value={formData.billing_mode}
                onChange={(e) =>
                  setFormData({ ...formData, billing_mode: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="MONTHLY">MONTHLY</option>
                <option value="ONE_SHOT">ONE_SHOT</option>
                <option value="BOTH">BOTH</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prix Mensuel (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.base_price_monthly || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    base_price_monthly: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="15.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prix One-Shot (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.base_price_one_shot || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    base_price_one_shot: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="150.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Unité *
            </label>
            <input
              type="text"
              required
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="vCPU, Go, VM, IP..."
            />
          </div>

          {formData.service_type === 'BASE' && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-blue-900">
                  Détails des Ressources
                </h3>
                <button
                  type="button"
                  onClick={addResourceDetail}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </button>
              </div>

              {resourceDetails.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-4">
                  Aucune ressource définie. Cliquez sur "Ajouter" pour commencer.
                </p>
              ) : (
                <div className="space-y-3">
                  {resourceDetails.map((detail, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-3 border border-blue-200 grid grid-cols-12 gap-2 items-end"
                    >
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Type
                        </label>
                        <select
                          value={detail.resource_type}
                          onChange={(e) =>
                            updateResourceDetail(index, 'resource_type', e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="CPU">CPU</option>
                          <option value="RAM">RAM</option>
                          <option value="DISK">DISK</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Quantité
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={detail.quantity}
                          onChange={(e) =>
                            updateResourceDetail(
                              index,
                              'quantity',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Unité
                        </label>
                        <input
                          type="text"
                          value={detail.unit}
                          onChange={(e) => updateResourceDetail(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="vCPU, GB..."
                        />
                      </div>

                      <div className="col-span-5">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={detail.description}
                          onChange={(e) =>
                            updateResourceDetail(index, 'description', e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: Disque système SSD"
                        />
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeResourceDetail(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-600 mt-3">
                Détaillez chaque ressource de cette option de base (CPU, RAM, disques, etc.)
              </p>
            </div>
          )}

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-green-900 flex items-center">
                <Link className="w-4 h-4 mr-2" />
                Dépendances de Services
              </h3>
              <button
                type="button"
                onClick={addDependency}
                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </button>
            </div>

            {dependencies.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-4">
                Aucune dépendance définie. Définissez des services qui s'ajoutent automatiquement.
              </p>
            ) : (
              <div className="space-y-3">
                {dependencies.map((dep, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-3 border border-green-200 space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Service Dépendant
                        </label>
                        <select
                          value={dep.dependent_service_id}
                          onChange={(e) =>
                            updateDependency(index, 'dependent_service_id', e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          {availableServices
                            .filter(s => s.id !== service?.id)
                            .map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Type
                        </label>
                        <select
                          value={dep.dependency_type}
                          onChange={(e) =>
                            updateDependency(index, 'dependency_type', e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="AUTO_SCALE">AUTO_SCALE</option>
                          <option value="REQUIRED">REQUIRED</option>
                          <option value="OPTIONAL">OPTIONAL</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Ressource
                        </label>
                        <select
                          value={dep.resource_matcher || 'ALL'}
                          onChange={(e) =>
                            updateDependency(
                              index,
                              'resource_matcher',
                              e.target.value === 'ALL' ? null : e.target.value
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="ALL">Tous</option>
                          <option value="CPU">CPU</option>
                          <option value="RAM">RAM</option>
                          <option value="DISK">DISK</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Multiplicateur
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={dep.quantity_multiplier}
                          onChange={(e) =>
                            updateDependency(
                              index,
                              'quantity_multiplier',
                              parseFloat(e.target.value) || 1.0
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>

                      <div className="col-span-1 flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => removeDependency(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-8">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={dep.description}
                          onChange={(e) => updateDependency(index, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Ex: Sauvegarde automatique du disque"
                        />
                      </div>

                      <div className="col-span-4 flex items-end">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={dep.auto_add}
                            onChange={(e) => updateDependency(index, 'auto_add', e.target.checked)}
                            className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-2 focus:ring-green-500"
                          />
                          <span className="text-xs font-medium text-slate-700">
                            Ajout automatique
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-600 mt-3">
              Définissez les services qui s'ajoutent automatiquement avec celui-ci.
              <br />
              <strong>AUTO_SCALE</strong>: La quantité s'adapte aux ressources (ex: sauvegarde = taille disque).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Code Article Sage *
              </label>
              <input
                type="text"
                required
                value={formData.sage_item_code}
                onChange={(e) => setFormData({ ...formData, sage_item_code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ART-CPU-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Code TVA Sage *
              </label>
              <select
                required
                value={formData.sage_vat_code}
                onChange={(e) => setFormData({ ...formData, sage_vat_code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="20">20%</option>
                <option value="10">10%</option>
                <option value="0">0%</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Code Analytique
              </label>
              <input
                type="text"
                value={formData.sage_analytic_code || ''}
                onChange={(e) =>
                  setFormData({ ...formData, sage_analytic_code: e.target.value || null })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optionnel"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm font-medium text-slate-700">
                Service actif
              </label>
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                id="is_multiplier"
                checked={formData.is_multiplier}
                onChange={(e) => setFormData({ ...formData, is_multiplier: e.target.checked })}
                className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-2 focus:ring-orange-500"
              />
              <label htmlFor="is_multiplier" className="text-sm font-medium text-slate-700">
                Service multiplicateur (ex: PRA)
              </label>
              {formData.is_multiplier && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600">Facteur:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.multiplier_value}
                    onChange={(e) => setFormData({ ...formData, multiplier_value: parseFloat(e.target.value) || 2.0 })}
                    className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <span className="text-sm text-slate-600">x</span>
                </div>
              )}
            </div>
          </div>

          {formData.is_multiplier && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-orange-900">
                  Catégories Affectées par le Multiplicateur
                </h3>
                <button
                  type="button"
                  onClick={addMultiplier}
                  className="inline-flex items-center px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </button>
              </div>

              {multipliers.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-4">
                  Aucune catégorie définie. Cliquez sur "Ajouter" pour spécifier les catégories affectées.
                </p>
              ) : (
                <div className="space-y-2">
                  {multipliers.map((mult, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-3 border border-orange-200 grid grid-cols-12 gap-2 items-end"
                    >
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Catégorie Affectée
                        </label>
                        <select
                          value={mult.affected_category_id}
                          onChange={(e) =>
                            updateMultiplier(index, 'affected_category_id', e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Facteur
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={mult.multiplier_factor}
                          onChange={(e) =>
                            updateMultiplier(
                              index,
                              'multiplier_factor',
                              parseFloat(e.target.value) || 2.0
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>

                      <div className="col-span-5">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={mult.description}
                          onChange={(e) =>
                            updateMultiplier(index, 'description', e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Ex: Double les serveurs"
                        />
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeMultiplier(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-600 mt-3">
                Définissez les catégories dont les quantités seront multipliées quand cette option est activée dans un devis.
                <br />
                <strong>Exemple PRA</strong>: Multiplie par 2 les catégories "Serveurs", "Stockage", etc.
              </p>
            </div>
          )}

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
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
