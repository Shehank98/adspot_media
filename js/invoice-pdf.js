/**
 * Invoice PDF Generator — AdSpot Media
 * Matches the reference Invoice.html design: masthead header, receipt/invoice layout,
 * rubber PAID stamp, newspaper-style items table.
 */

function buildInvoiceHTML(inv) {
    const fmtLKR = n => `Rs. ${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDateShort = d => {
        try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' '); }
        catch (e) { return d || ''; }
    };
    const fmtDateUpper = d => {
        try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(); }
        catch (e) { return (d || '').toUpperCase(); }
    };

    // PAID stamp SVG (rubber-stamp circle look)
    const paidStamp = inv.paymentStatus === 'paid' ? `
        <div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;
                    width:100px;height:100px;border-radius:50%;border:3px solid #1a6b3a;
                    transform:rotate(-8deg);padding:4px;color:#1a6b3a;text-align:center;
                    font-family:Georgia,'Times New Roman',serif;">
            <div style="font-size:8px;font-weight:700;letter-spacing:2px;border-top:1.5px solid #1a6b3a;
                        padding-top:3px;width:72px;text-align:center;">PAID</div>
            <div style="font-size:18px;font-weight:900;letter-spacing:1px;line-height:1.1;">PAID</div>
            <div style="font-size:7.5px;font-weight:600;letter-spacing:1.5px;">IN FULL</div>
            <div style="font-size:7px;letter-spacing:0.5px;margin-top:2px;">${fmtDateUpper(inv.date)}</div>
            <div style="font-size:8px;font-weight:700;letter-spacing:2px;border-bottom:1.5px solid #1a6b3a;
                        padding-bottom:3px;width:72px;text-align:center;">PAID</div>
        </div>` : `
        <div style="font-size:11px;color:#888;font-style:italic;">Awaiting payment</div>`;

    // Item rows — each item shows ad specs if available
    const itemRows = inv.items.map(item => {
        const specs = item.specs ? `<div style="font-size:10.5px;color:#666;margin-top:2px;">${item.specs}</div>` : '';
        return `
        <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;vertical-align:top;">
                <div style="font-weight:600;font-size:13px;color:#1a1a1a;">${item.description}</div>
                ${specs}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;text-align:center;vertical-align:top;white-space:nowrap;font-size:12px;color:#333;">${item.pubDate}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;text-align:center;vertical-align:top;font-size:12px;color:#333;">${item.qty}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;text-align:right;vertical-align:top;font-size:12px;color:#333;white-space:nowrap;">${fmtLKR(item.unitPrice)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;text-align:right;vertical-align:top;font-size:12px;font-weight:600;color:#1a1a1a;white-space:nowrap;">${fmtLKR(item.amount)}</td>
        </tr>`;
    }).join('');

    // Totals rows
    const totalsRows = [];
    totalsRows.push(`
        <tr>
            <td style="padding:7px 16px;font-size:12.5px;color:#555;text-align:right;border-bottom:1px solid #e8e8e8;">Subtotal</td>
            <td style="padding:7px 16px;font-size:12.5px;text-align:right;border-bottom:1px solid #e8e8e8;white-space:nowrap;">${fmtLKR(inv.subtotal)}</td>
        </tr>`);
    if (inv.commission > 0) totalsRows.push(`
        <tr>
            <td style="padding:7px 16px;font-size:12.5px;color:#555;text-align:right;border-bottom:1px solid #e8e8e8;">Platform Commission (10%)</td>
            <td style="padding:7px 16px;font-size:12.5px;text-align:right;border-bottom:1px solid #e8e8e8;white-space:nowrap;">${fmtLKR(inv.commission)}</td>
        </tr>`);
    if (inv.vat > 0) totalsRows.push(`
        <tr>
            <td style="padding:7px 16px;font-size:12.5px;color:#555;text-align:right;border-bottom:1px solid #e8e8e8;">VAT (18%)</td>
            <td style="padding:7px 16px;font-size:12.5px;text-align:right;border-bottom:1px solid #e8e8e8;white-space:nowrap;">${fmtLKR(inv.vat)}</td>
        </tr>`);
    if (inv.serviceCharge > 0) totalsRows.push(`
        <tr>
            <td style="padding:7px 16px;font-size:12.5px;color:#555;text-align:right;border-bottom:1px solid #e8e8e8;">Service Charge</td>
            <td style="padding:7px 16px;font-size:12.5px;text-align:right;border-bottom:1px solid #e8e8e8;white-space:nowrap;">${fmtLKR(inv.serviceCharge)}</td>
        </tr>`);
    if (inv.promoDiscount > 0) totalsRows.push(`
        <tr>
            <td style="padding:7px 16px;font-size:12.5px;color:#1a6b3a;text-align:right;border-bottom:1px solid #e8e8e8;">Discount&nbsp;·&nbsp;${inv.promoCode}</td>
            <td style="padding:7px 16px;font-size:12.5px;color:#1a6b3a;font-weight:600;text-align:right;border-bottom:1px solid #e8e8e8;white-space:nowrap;">−&nbsp;${fmtLKR(inv.promoDiscount)}</td>
        </tr>`);

    const docLabel = inv.paymentStatus === 'paid' ? 'TAX INVOICE · RECEIPT' : 'QUOTATION · PAYMENT DUE';
    const docTitle = inv.paymentStatus === 'paid' ? 'Invoice' : 'Quotation';
    const bg = '#F5F2EA';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400;1,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${bg}; }
  .page {
    background: ${bg};
    font-family: 'Inter', system-ui, sans-serif;
    color: #1a1a1a;
    width: 794px;
    min-height: 1050px;
    padding: 0;
  }
  /* Masthead */
  .masthead {
    display: flex;
    align-items: center;
    padding: 18px 32px;
    border-bottom: 2px solid #1a1a1a;
  }
  .masthead-logo {
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-weight: 700;
    font-size: 24px;
    letter-spacing: -0.5px;
    color: #1a1a1a;
    flex-shrink: 0;
  }
  .masthead-logo span { font-weight: 400; font-size: 18px; }
  .masthead-address {
    flex: 1;
    text-align: center;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #555;
  }
  .masthead-right {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: right;
    flex-shrink: 0;
  }
  /* Title band */
  .title-band {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 32px 16px;
    border-bottom: 1px solid #ccc;
  }
  .title-left {}
  .doc-label {
    font-size: 9.5px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 4px;
  }
  .doc-label::before { content: '— '; }
  .doc-label::after { content: ' —'; }
  .doc-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-size: 52px;
    font-weight: 400;
    line-height: 1;
    color: #1a1a1a;
    letter-spacing: -1px;
  }
  .title-right {
    text-align: right;
  }
  .inv-number {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -0.5px;
  }
  .inv-ref-line {
    font-size: 9.5px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #666;
    margin-top: 6px;
  }
  /* Meta table */
  .meta-table {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    border-top: 1px solid #ccc;
    border-bottom: 1.5px solid #1a1a1a;
    margin: 0 32px;
  }
  .meta-cell {
    padding: 10px 12px;
    border-right: 1px solid #ddd;
  }
  .meta-cell:last-child { border-right: none; }
  .meta-label {
    font-size: 8.5px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 5px;
  }
  .meta-value {
    font-size: 12px;
    font-weight: 600;
    color: #1a1a1a;
  }
  /* From / Bill To */
  .addresses {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    padding: 20px 32px;
    border-bottom: 1px solid #ccc;
  }
  .addr-block {}
  .addr-label {
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 8px;
  }
  .addr-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .addr-company { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
  .addr-line { font-size: 12px; color: #444; line-height: 1.6; }
  /* Items table */
  .items-table {
    width: calc(100% - 64px);
    margin: 0 32px;
    border-collapse: collapse;
    margin-bottom: 0;
  }
  .items-table th {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    background: #1a1a1a;
    color: #F5F2EA;
    padding: 9px 12px;
    text-align: left;
  }
  .items-table th:nth-child(2),
  .items-table th:nth-child(3) { text-align: center; }
  .items-table th:nth-child(4),
  .items-table th:nth-child(5) { text-align: right; }
  /* Totals */
  .totals-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 0 32px 24px;
  }
  .totals-table {
    border-collapse: collapse;
    min-width: 280px;
  }
  .totals-total-row td {
    background: #1a1a1a;
    color: #F5F2EA;
    font-weight: 700;
    font-size: 14px;
    padding: 12px 16px;
    letter-spacing: 0.5px;
  }
  .totals-total-row td:last-child {
    text-align: right;
    font-size: 16px;
  }
  /* Footer */
  .footer {
    border-top: 1.5px solid #1a1a1a;
    display: flex;
    justify-content: space-between;
    padding: 12px 32px;
    font-size: 10px;
    color: #666;
    letter-spacing: 0.3px;
  }
</style>
</head>
<body>
<div class="page">

  <!-- Masthead -->
  <div class="masthead">
    <div class="masthead-logo"><em>AdSpot</em><span> media</span></div>
    <div class="masthead-address">130 High Level Rd &middot; Colombo 06 &middot; adspot77@gmail.com &middot; 070 161 1411</div>
    <div class="masthead-right">AdSpot Media</div>
  </div>

  <!-- Title band -->
  <div class="title-band">
    <div class="title-left">
      <div class="doc-label">${docLabel}</div>
      <div class="doc-title">${docTitle}</div>
    </div>
    <div class="title-right">
      <div class="inv-number">${inv.invoiceNumber}</div>
      <div class="inv-ref-line">Ref &middot; ${inv.quotationNumber}</div>
      <div class="inv-ref-line">Issued &middot; ${fmtDateUpper(inv.date)}</div>
    </div>
  </div>

  <!-- Meta row -->
  <div style="padding:0 32px;">
    <div class="meta-table">
      <div class="meta-cell">
        <div class="meta-label">Invoice #</div>
        <div class="meta-value" style="font-size:11px;">${inv.invoiceNumber}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Reference</div>
        <div class="meta-value" style="font-size:11px;">${inv.quotationNumber}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Issued</div>
        <div class="meta-value">${fmtDateShort(inv.date)}</div>
      </div>
      <div class="meta-cell" style="display:flex;align-items:center;justify-content:center;padding:8px;">
        <div class="meta-label" style="position:absolute;top:8px;left:12px;">Payment</div>
        ${paidStamp}
      </div>
    </div>
  </div>

  <!-- Addresses -->
  <div class="addresses">
    <div class="addr-block">
      <div class="addr-label">From</div>
      <div class="addr-name">AdSpot Media</div>
      <div class="addr-line">130 High Level Road, Colombo 06</div>
      <div class="addr-line">Sri Lanka</div>
      <div class="addr-line">adspot77@gmail.com</div>
      <div class="addr-line">070 161 1411 / 070 642 1998</div>
    </div>
    <div class="addr-block">
      <div class="addr-label">Bill To</div>
      <div class="addr-name">${inv.to.name}</div>
      ${inv.to.company ? `<div class="addr-company">${inv.to.company}</div>` : ''}
      ${inv.to.address ? `<div class="addr-line">${inv.to.address}</div>` : ''}
      <div class="addr-line">${inv.to.email}</div>
      ${inv.to.phone ? `<div class="addr-line">${inv.to.phone}</div>` : ''}
    </div>
  </div>

  <!-- Items -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:44%;">Publication</th>
        <th style="width:14%;text-align:center;">Pub. Date</th>
        <th style="width:8%;text-align:center;">Qty</th>
        <th style="width:17%;text-align:right;">Unit</th>
        <th style="width:17%;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Spacer -->
  <div style="height:16px;"></div>

  <!-- Totals -->
  <div class="totals-wrap">
    <table class="totals-table">
      ${totalsRows.join('')}
      <tr class="totals-total-row">
        <td style="text-transform:uppercase;letter-spacing:1px;">Total Due</td>
        <td>${fmtLKR(inv.total)}</td>
      </tr>
    </table>
  </div>

  ${inv.paymentStatus !== 'paid' ? `
  <div style="margin:0 32px 20px;padding:14px 16px;border:1px solid #ccc;background:rgba(255,255,255,0.5);font-size:11.5px;color:#444;">
    <strong style="color:#1a1a1a;">Bank Transfer Details</strong> &mdash;
    Please transfer the total amount to our bank account and email the payment slip to adspot77@gmail.com quoting your reference number.
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <span>AdSpot Media &middot; 070 161 1411 / 070 642 1998</span>
    <span>adspot77@gmail.com</span>
  </div>

</div>
</body>
</html>`;
}

async function generateInvoicePDF(invoiceData, bookingData, isPaid = true) {
    try {
        if (typeof jspdf === 'undefined') throw new Error('jsPDF library not loaded');
        if (typeof html2canvas === 'undefined') throw new Error('html2canvas library not loaded');

        const fmtDateShort = d => {
            try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
            catch (e) { return d || ''; }
        };

        // Build the adSpecs string from item.details if available
        const buildSpecs = item => {
            const d = item.details || {};
            const parts = [];
            if (d.columns && d.height) parts.push(`${d.columns} col × ${d.height}cm`);
            else if (d.size) parts.push(d.size);
            if (d.colour || d.color) parts.push((d.colour || d.color) === 'colour' ? 'Full colour' : (d.colour || d.color));
            if (d.language) parts.push(d.language.charAt(0).toUpperCase() + d.language.slice(1));
            if (d.classifiedText) parts.push(`"${d.classifiedText.substring(0, 40)}${d.classifiedText.length > 40 ? '…' : ''}"`);
            return parts.join(' · ');
        };

        const inv = {
            invoiceNumber: invoiceData.invoiceNumber,
            quotationNumber: invoiceData.quotationNumber || '',
            date: new Date(),
            paymentStatus: isPaid ? 'paid' : 'unpaid',
            to: {
                name: bookingData.customerName || '',
                company: bookingData.customerCompany || '',
                address: bookingData.customerAddress || '',
                email: bookingData.customerEmail || '',
                phone: bookingData.customerPhone || ''
            },
            items: (bookingData.items || []).map(item => ({
                description: `${item.newspaperName || ''} — ${item.adType === 'box' ? 'Box Ad' : 'Classified Ad'}`,
                specs: buildSpecs(item),
                pubDate: fmtDateShort(item.pubDate),
                qty: 1,
                unitPrice: item.price || 0,
                amount: item.price || 0
            })),
            subtotal: invoiceData.subtotal || 0,
            commission: invoiceData.commission || 0,
            vat: invoiceData.vat || 0,
            serviceCharge: invoiceData.serviceCharge || 0,
            promoDiscount: invoiceData.promoDiscount || 0,
            promoCode: invoiceData.promoCode || '',
            total: invoiceData.total || 0
        };

        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-9999;';
        container.innerHTML = buildInvoiceHTML(inv);
        document.body.appendChild(container);

        // Allow fonts to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        try { await document.fonts.ready; } catch (e) {}

        const pageEl = container.querySelector('.page');
        const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#F5F2EA',
            width: 794,
            windowWidth: 794
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const imgH = (canvas.height / canvas.width) * pageW;
        doc.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);

        // Upload to Firebase Storage
        const pdfBlob = doc.output('blob');
        const fileName = `invoices/${invoiceData.invoiceNumber}.pdf`;
        console.log('📤 Uploading PDF:', fileName);
        const storageRef = storage.ref(fileName);
        const snap = await storageRef.put(pdfBlob, { contentType: 'application/pdf' });
        const url = await snap.ref.getDownloadURL();
        console.log('✅ Invoice PDF uploaded:', url);
        return url;

    } catch (error) {
        console.error('❌ Error generating invoice PDF:', error);
        throw error;
    }
}

window.generateInvoicePDF = generateInvoicePDF;
console.log('✅ Invoice PDF generator (Variant C) loaded');
