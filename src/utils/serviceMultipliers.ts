import { supabase } from '../lib/supabase';

interface QuoteLine {
  id: string;
  service_id: string;
  quantity: number;
  services: {
    category_id: string;
    is_multiplier: boolean;
  };
}

interface MultiplierConfig {
  service_id: string;
  affected_category_id: string;
  multiplier_factor: number;
}

export async function getActiveMultipliers(quoteId: string): Promise<MultiplierConfig[]> {
  try {
    const { data: lines, error: linesError } = await supabase
      .from('quote_lines')
      .select('service_id, services!inner(is_multiplier)')
      .eq('quote_id', quoteId);

    if (linesError) throw linesError;

    const multiplierServiceIds = (lines || [])
      .filter((line: any) => line.services?.is_multiplier === true)
      .map((line: any) => line.service_id);

    if (multiplierServiceIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('service_multipliers')
      .select('service_id, affected_category_id, multiplier_factor')
      .in('service_id', multiplierServiceIds)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading active multipliers:', error);
    return [];
  }
}

export function calculateMultipliedQuantity(
  originalQuantity: number,
  categoryId: string,
  multipliers: MultiplierConfig[]
): number {
  const applicableMultipliers = multipliers.filter(
    (m) => m.affected_category_id === categoryId
  );

  if (applicableMultipliers.length === 0) {
    return originalQuantity;
  }

  let finalQuantity = originalQuantity;
  for (const mult of applicableMultipliers) {
    finalQuantity *= mult.multiplier_factor;
  }

  return finalQuantity;
}

export async function applyMultipliersToQuote(quoteId: string): Promise<void> {
  try {
    const multipliers = await getActiveMultipliers(quoteId);

    const { data: lines, error: linesError } = await supabase
      .from('quote_lines')
      .select(`
        id,
        service_id,
        base_quantity,
        unit_price,
        discount_percent,
        services!inner(category_id, is_multiplier)
      `)
      .eq('quote_id', quoteId);

    if (linesError) throw linesError;

    for (const line of lines || []) {
      const service = (line as any).services;

      if (service.is_multiplier) {
        continue;
      }

      const baseQuantity = (line as any).base_quantity || 1;
      const newQuantity = calculateMultipliedQuantity(
        baseQuantity,
        service.category_id,
        multipliers
      );

      const newTotal = newQuantity * line.unit_price * (1 - line.discount_percent / 100);

      await supabase
        .from('quote_lines')
        .update({
          quantity: newQuantity,
          total: newTotal,
        })
        .eq('id', line.id);
    }
  } catch (error) {
    console.error('Error applying multipliers:', error);
  }
}
