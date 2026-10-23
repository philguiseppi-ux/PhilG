import { supabase } from '../lib/supabase';

interface ServiceWithDependencies {
  id: string;
  name: string;
  code: string;
  base_price_monthly: number | null;
  base_price_one_shot: number | null;
  billing_mode: string;
}

interface Dependency {
  id: string;
  dependent_service_id: string;
  dependency_type: 'REQUIRED' | 'OPTIONAL' | 'AUTO_SCALE';
  resource_matcher: 'CPU' | 'RAM' | 'DISK' | 'ALL' | null;
  quantity_multiplier: number;
  auto_add: boolean;
  description: string;
}

interface ResourceDetail {
  resource_type: 'CPU' | 'RAM' | 'DISK';
  quantity: number;
  unit: string;
}

export async function getServiceDependencies(serviceId: string): Promise<Dependency[]> {
  try {
    const { data, error } = await supabase
      .from('service_dependencies')
      .select('*')
      .eq('parent_service_id', serviceId)
      .eq('is_active', true)
      .eq('auto_add', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading dependencies:', error);
    return [];
  }
}

export async function getServiceResourceDetails(serviceId: string): Promise<ResourceDetail[]> {
  try {
    const { data, error } = await supabase
      .from('service_resource_details')
      .select('*')
      .eq('service_id', serviceId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading resource details:', error);
    return [];
  }
}

export async function getService(serviceId: string): Promise<ServiceWithDependencies | null> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, code, base_price_monthly, base_price_one_shot, billing_mode')
      .eq('id', serviceId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error loading service:', error);
    return null;
  }
}

export function calculateDependentQuantity(
  dependency: Dependency,
  resourceDetails: ResourceDetail[]
): number {
  if (dependency.dependency_type !== 'AUTO_SCALE') {
    return 1;
  }

  if (!dependency.resource_matcher || dependency.resource_matcher === 'ALL') {
    const totalResources = resourceDetails.reduce((sum, detail) => sum + detail.quantity, 0);
    return totalResources * dependency.quantity_multiplier;
  }

  const matchingResource = resourceDetails.find(
    detail => detail.resource_type === dependency.resource_matcher
  );

  if (!matchingResource) {
    return dependency.quantity_multiplier;
  }

  return matchingResource.quantity * dependency.quantity_multiplier;
}

export interface DependentServiceToAdd {
  service: ServiceWithDependencies;
  quantity: number;
  dependency: Dependency;
}

export async function calculateDependentServices(
  serviceId: string
): Promise<DependentServiceToAdd[]> {
  const dependencies = await getServiceDependencies(serviceId);
  if (dependencies.length === 0) {
    return [];
  }

  const resourceDetails = await getServiceResourceDetails(serviceId);
  const result: DependentServiceToAdd[] = [];

  for (const dep of dependencies) {
    const service = await getService(dep.dependent_service_id);
    if (!service) continue;

    const quantity = calculateDependentQuantity(dep, resourceDetails);

    result.push({
      service,
      quantity,
      dependency: dep,
    });
  }

  return result;
}
