import { supabase } from '../lib/supabase';

interface QuoteLine {
  id: string;
  service_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  billing_selected: 'MONTHLY' | 'ONE_SHOT';
}

export async function exportToSage(quoteNumber: string, lines: QuoteLine[]) {
  if (lines.length === 0) {
    alert('Aucune ligne à exporter');
    return;
  }

  try {
    let csvContent = 'TypeLigne;CodeArticle;Designation;Quantite;PrixUnitaire;Remise;CodeTVA;Commentaire\n';

    for (const line of lines) {
      const { data: service } = await supabase
        .from('services')
        .select('sage_item_code, sage_vat_code')
        .eq('id', line.service_id)
        .single();

      if (service) {
        const comment = line.billing_selected === 'MONTHLY' ? 'Mensuel' : 'One shot';
        csvContent += `L;${service.sage_item_code};${line.description};${line.quantity};${line.unit_price};${line.discount_percent};${service.sage_vat_code};${comment}\n`;
      }
    }

    const blob = new Blob([csvContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sage_${quoteNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Sage:', error);
    alert('Erreur lors de l\'export Sage');
  }
}
