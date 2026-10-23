interface Quote {
  quote_number: string;
  client_name: string;
  client_company: string;
  client_email: string;
  client_phone: string;
  valid_until: string;
  notes: string;
  created_at: string;
}

interface QuoteLine {
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
  billing_selected: 'MONTHLY' | 'ONE_SHOT';
}

export function generatePDF(quote: Quote, lines: QuoteLine[], totals: { monthly: number; oneShot: number; total: number }) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les popups pour exporter le PDF');
    return;
  }

  const monthlyLines = lines.filter(l => l.billing_selected === 'MONTHLY');
  const oneShotLines = lines.filter(l => l.billing_selected === 'ONE_SHOT');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Devis ${quote.quote_number}</title>
      <style>
        @media print {
          @page { margin: 2cm; }
          body { margin: 0; }
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #333;
          max-width: 21cm;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #1e40af;
          margin: 0 0 10px 0;
          font-size: 24pt;
        }
        .header .quote-number {
          font-size: 14pt;
          color: #64748b;
        }
        .info-section {
          margin-bottom: 30px;
        }
        .info-section h2 {
          color: #1e40af;
          font-size: 14pt;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .info-item {
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          color: #64748b;
          font-size: 9pt;
          text-transform: uppercase;
        }
        .info-value {
          color: #1e293b;
          font-size: 11pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: bold;
          text-align: left;
          padding: 10px;
          border-bottom: 2px solid #cbd5e1;
          font-size: 10pt;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 10pt;
        }
        tr:hover {
          background-color: #f8fafc;
        }
        .text-right {
          text-align: right;
        }
        .totals {
          margin-top: 30px;
          border-top: 2px solid #cbd5e1;
          padding-top: 20px;
        }
        .totals-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 10px;
          font-size: 12pt;
        }
        .totals-label {
          font-weight: bold;
          color: #64748b;
          margin-right: 20px;
          min-width: 150px;
          text-align: right;
        }
        .totals-value {
          font-weight: bold;
          color: #1e293b;
          min-width: 120px;
          text-align: right;
        }
        .total-global {
          border-top: 2px solid #2563eb;
          padding-top: 10px;
          margin-top: 10px;
        }
        .total-global .totals-label,
        .total-global .totals-value {
          font-size: 14pt;
          color: #1e40af;
        }
        .section-title {
          background-color: #dbeafe;
          color: #1e40af;
          padding: 8px 12px;
          margin-top: 20px;
          margin-bottom: 10px;
          font-weight: bold;
          font-size: 12pt;
        }
        .notes {
          background-color: #f8fafc;
          padding: 15px;
          border-left: 4px solid #2563eb;
          margin-top: 20px;
          font-size: 10pt;
          color: #475569;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 9pt;
          color: #64748b;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Devis</h1>
        <div class="quote-number">N° ${quote.quote_number}</div>
      </div>

      <div class="info-section">
        <h2>Informations Client</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Client</div>
            <div class="info-value">${quote.client_name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Société</div>
            <div class="info-value">${quote.client_company || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email</div>
            <div class="info-value">${quote.client_email || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Téléphone</div>
            <div class="info-value">${quote.client_phone || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date du devis</div>
            <div class="info-value">${new Date(quote.created_at).toLocaleDateString('fr-FR')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Valide jusqu'au</div>
            <div class="info-value">${new Date(quote.valid_until).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>
      </div>

      ${monthlyLines.length > 0 ? `
        <div class="section-title">Services Mensuels</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Quantité</th>
              <th class="text-right">Prix Unit.</th>
              <th class="text-right">Remise</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyLines.map(line => `
              <tr>
                <td>${line.description}</td>
                <td class="text-right">${line.quantity.toFixed(2)}</td>
                <td class="text-right">${line.unit_price.toFixed(2)} €</td>
                <td class="text-right">${line.discount_percent.toFixed(2)}%</td>
                <td class="text-right">${line.total.toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${oneShotLines.length > 0 ? `
        <div class="section-title">Services One-Shot</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Quantité</th>
              <th class="text-right">Prix Unit.</th>
              <th class="text-right">Remise</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${oneShotLines.map(line => `
              <tr>
                <td>${line.description}</td>
                <td class="text-right">${line.quantity.toFixed(2)}</td>
                <td class="text-right">${line.unit_price.toFixed(2)} €</td>
                <td class="text-right">${line.discount_percent.toFixed(2)}%</td>
                <td class="text-right">${line.total.toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="totals">
        <div class="totals-row">
          <div class="totals-label">Total Mensuel:</div>
          <div class="totals-value">${totals.monthly.toFixed(2)} €</div>
        </div>
        <div class="totals-row">
          <div class="totals-label">Total One-Shot:</div>
          <div class="totals-value">${totals.oneShot.toFixed(2)} €</div>
        </div>
        <div class="totals-row total-global">
          <div class="totals-label">Total Global:</div>
          <div class="totals-value">${totals.total.toFixed(2)} €</div>
        </div>
      </div>

      ${quote.notes ? `
        <div class="notes">
          <strong>Notes:</strong><br>
          ${quote.notes.replace(/\n/g, '<br>')}
        </div>
      ` : ''}

      <div class="footer">
        Ce devis est valable jusqu'au ${new Date(quote.valid_until).toLocaleDateString('fr-FR')}
        <br>
        Conditions générales de vente disponibles sur demande
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 250);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
