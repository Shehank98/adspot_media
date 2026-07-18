/**
 * Invoice / Quotation PDF Generator — Minimal Clean Layout
 * Plain, professional document: clear header, full addresses, and an
 * itemised cost breakdown (per-line specs + component-level totals).
 */

// Seller / issuer details (kept in one place so they are easy to update)
const ADSPOT_SELLER = {
  name: 'AdSpot Media',
  addressLines: ['130 High Level Road', 'Colombo 06, Sri Lanka'],
  email: 'adspot77@gmail.com',
  phones: '070 161 1411 · 070 642 1998',
  web: 'adspotmedia.lk',
  reg: 'Reg. No. PV 0023411'
};

// Bank details shown on unpaid quotations so the customer knows where to pay
const ADSPOT_BANK = {
  bank: 'Sampath Bank PLC',
  name: 'P S Kavishka',
  account: '1210 5770 0812',
  branch: 'Karagampitiya'
};

function buildInvoiceHTML(inv, isPaid) {
  const fmtLKR = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return d || ''; } };

  const docLabel = isPaid ? 'INVOICE' : 'QUOTATION';
  const statusLabel = isPaid ? 'PAID' : 'PAYMENT DUE';

  // ---- Line items -----------------------------------------------------------
  const itemRows = (inv.items || []).map((it, i) => `
    <tr class="li">
      <td class="li-no">${i + 1}</td>
      <td class="li-desc">
        <div class="li-name">${it.paper}</div>
        <div class="li-sub">${it.adType}${it.lang ? ' · ' + it.lang : ''}${it.pubDate ? ' · Publishes ' + fmtDate(it.pubDate) : ''}</div>
        ${it.detail ? `<div class="li-spec">${it.detail}</div>` : ''}
      </td>
      <td class="li-amt">${fmtLKR(it.base)}</td>
    </tr>`).join('');

  // ---- Cost breakdown -------------------------------------------------------
  const money = {
    subtotal: inv.subtotal || 0,
    commission: inv.commission || 0,
    vat: inv.vat || 0,
    service: inv.serviceCharge || 0,
    discount: inv.promoDiscount || 0,
    total: inv.total || 0
  };

  // Commission is folded into the advertising subtotal — never shown as its
  // own line to the customer.
  const displaySubtotal = money.subtotal + money.commission;
  const breakdownRows = [
    `<div class="bd-row"><span>Subtotal · advertising</span><span class="bd-v">${fmtLKR(displaySubtotal)}</span></div>`,
    money.vat > 0 ? `<div class="bd-row"><span>VAT${inv.vatPct ? ` (${inv.vatPct}%)` : ''}</span><span class="bd-v">${fmtLKR(money.vat)}</span></div>` : '',
    money.service > 0 ? `<div class="bd-row"><span>Classified service charge</span><span class="bd-v">${fmtLKR(money.service)}</span></div>` : '',
    money.discount > 0 ? `<div class="bd-row discount"><span>Discount${inv.promo && inv.promo.code ? ` · ${inv.promo.code}` : ''}</span><span class="bd-v">− ${fmtLKR(money.discount)}</span></div>` : ''
  ].filter(Boolean).join('');

  // ---- Bank block (unpaid quotations only) ----------------------------------
  const bankBlock = !isPaid ? `
    <section class="pay">
      <div class="pay-title">How to pay — bank transfer</div>
      <div class="pay-grid">
        <div class="pay-c"><span class="pay-lbl">Bank</span><span class="pay-val">${ADSPOT_BANK.bank}</span></div>
        <div class="pay-c"><span class="pay-lbl">Account name</span><span class="pay-val">${ADSPOT_BANK.name}</span></div>
        <div class="pay-c"><span class="pay-lbl">Account no.</span><span class="pay-val">${ADSPOT_BANK.account}</span></div>
        <div class="pay-c"><span class="pay-lbl">Branch</span><span class="pay-val">${ADSPOT_BANK.branch}</span></div>
      </div>
      <div class="pay-note">Please use your reference <strong>${inv.quotationNumber || inv.invoiceNumber}</strong> when making the transfer, then upload your receipt from “My Bookings”.</div>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --ink: #111827;
  --ink-2: #4b5563;
  --ink-3: #9ca3af;
  --line: #e5e7eb;
  --line-2: #d1d5db;
  --accent: #0E6B47;
  --paper: #ffffff;
  --font: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f3f4f6; }

.inv {
  font-family: var(--font);
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
  width: 794px;
  min-height: 1123px;
  padding: 52px 56px;
  display: flex;
  flex-direction: column;
  font-size: 12.5px;
  line-height: 1.5;
}
.inv *, .inv *::before, .inv *::after { box-sizing: border-box; }
.num { font-variant-numeric: tabular-nums; }

/* Header */
.hd { display: flex; justify-content: space-between; align-items: flex-start; }
.hd-brand { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.hd-brand span { color: var(--accent); }
.hd-tag { font-size: 11px; color: var(--ink-3); margin-top: 2px; letter-spacing: 0.02em; }
.hd-r { text-align: right; }
.hd-doc { font-size: 26px; font-weight: 700; letter-spacing: 0.06em; color: var(--ink); }
.hd-no { font-size: 13px; font-weight: 600; margin-top: 4px; }
.hd-status {
  display: inline-block; margin-top: 8px; padding: 3px 10px; border-radius: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
}
.hd-status.paid { background: rgba(14,107,71,0.10); color: var(--accent); }
.hd-status.due { background: #fef3c7; color: #92400e; }

.rule { height: 2px; background: var(--ink); margin: 20px 0 0; }

/* Meta strip */
.meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 18px; }
.meta-c { display: flex; flex-direction: column; gap: 2px; }
.meta-lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-3); font-weight: 600; }
.meta-val { font-size: 12.5px; font-weight: 500; }

/* Parties */
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 26px; }
.party-lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-3); font-weight: 600; margin-bottom: 6px; }
.party-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.party-line { color: var(--ink-2); font-size: 12px; line-height: 1.55; }

/* Items table */
.items { width: 100%; border-collapse: collapse; margin-top: 28px; }
.items thead th {
  font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600;
  color: var(--ink-2); text-align: left; padding: 0 0 8px; border-bottom: 1.5px solid var(--ink);
}
.items thead th.r { text-align: right; }
.items th.c-no { width: 30px; }
.items th.c-amt { width: 130px; }
.li td { padding: 12px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.li-no { color: var(--ink-3); font-size: 12px; }
.li-name { font-weight: 600; font-size: 13px; }
.li-sub { color: var(--ink-2); font-size: 11.5px; margin-top: 1px; }
.li-spec { color: var(--ink-3); font-size: 11px; margin-top: 3px; }
.li-amt { text-align: right; font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* Breakdown */
.summary { display: flex; justify-content: flex-end; margin-top: 20px; }
.bd { width: 340px; }
.bd-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12.5px; color: var(--ink-2); }
.bd-v { color: var(--ink); font-weight: 500; font-variant-numeric: tabular-nums; }
.bd-row.discount, .bd-row.discount .bd-v { color: var(--accent); }
.bd-total {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-top: 8px; padding-top: 12px; border-top: 2px solid var(--ink);
}
.bd-total-l { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.bd-total-v { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }

/* Payment / bank */
.pay { margin-top: 30px; border: 1px solid var(--line-2); border-radius: 8px; padding: 16px 18px; }
.pay-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink); margin-bottom: 12px; }
.pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
.pay-c { display: flex; flex-direction: column; gap: 1px; }
.pay-lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); font-weight: 600; }
.pay-val { font-size: 12.5px; font-weight: 600; }
.pay-note { margin-top: 12px; font-size: 11px; color: var(--ink-2); line-height: 1.5; }
.pay-note strong { color: var(--ink); }

/* Footer */
.foot {
  margin-top: auto; padding-top: 18px; border-top: 1px solid var(--line);
  display: flex; justify-content: space-between; align-items: flex-end;
  font-size: 10.5px; color: var(--ink-3); line-height: 1.6;
}
.foot-thanks { font-size: 13px; font-weight: 600; color: var(--ink); }
.foot-r { text-align: right; }
</style>
</head>
<body>
<div class="inv">

  <header class="hd">
    <div class="hd-l">
      <div class="hd-brand">AdSpot<span>.</span>Media</div>
      <div class="hd-tag">Newspaper Advertising · Sri Lanka</div>
    </div>
    <div class="hd-r">
      <div class="hd-doc">${docLabel}</div>
      <div class="hd-no num">${inv.invoiceNumber || ''}</div>
      <div class="hd-status ${isPaid ? 'paid' : 'due'}">${statusLabel}</div>
    </div>
  </header>

  <div class="rule"></div>

  <section class="meta">
    <div class="meta-c">
      <span class="meta-lbl">${isPaid ? 'Invoice No.' : 'Quotation No.'}</span>
      <span class="meta-val num">${isPaid ? inv.invoiceNumber : (inv.quotationNumber || inv.invoiceNumber)}</span>
    </div>
    <div class="meta-c">
      <span class="meta-lbl">Reference</span>
      <span class="meta-val num">${inv.quotationNumber || inv.invoiceNumber || '—'}</span>
    </div>
    <div class="meta-c">
      <span class="meta-lbl">${isPaid ? 'Paid on' : 'Issued'}</span>
      <span class="meta-val">${fmtDate(isPaid ? (inv.paidAt || inv.issueDate) : inv.issueDate)}</span>
    </div>
    <div class="meta-c">
      <span class="meta-lbl">Payment method</span>
      <span class="meta-val">${inv.paymentMethod === 'helapay' ? 'HelaPay QR' : 'Bank Transfer'}</span>
    </div>
  </section>

  <section class="parties">
    <div>
      <div class="party-lbl">From</div>
      <div class="party-name">${ADSPOT_SELLER.name}</div>
      ${ADSPOT_SELLER.addressLines.map(l => `<div class="party-line">${l}</div>`).join('')}
      <div class="party-line">${ADSPOT_SELLER.email}</div>
      <div class="party-line">${ADSPOT_SELLER.phones}</div>
      <div class="party-line">${ADSPOT_SELLER.reg}</div>
    </div>
    <div>
      <div class="party-lbl">Bill to</div>
      <div class="party-name">${inv.customer.name || '—'}</div>
      ${inv.customer.company ? `<div class="party-line" style="font-weight:500;color:var(--ink);">${inv.customer.company}</div>` : ''}
      ${inv.customer.address ? `<div class="party-line">${inv.customer.address}</div>` : ''}
      <div class="party-line">${inv.customer.email || ''}</div>
      ${inv.customer.phone ? `<div class="party-line">${inv.customer.phone}</div>` : ''}
    </div>
  </section>

  <table class="items">
    <thead>
      <tr>
        <th class="c-no">#</th>
        <th>Description</th>
        <th class="c-amt r">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <section class="summary">
    <div class="bd">
      ${breakdownRows}
      <div class="bd-total">
        <span class="bd-total-l">${isPaid ? 'Total Paid' : 'Total Due'}</span>
        <span class="bd-total-v">${fmtLKR(money.total)}</span>
      </div>
    </div>
  </section>

  ${bankBlock}

  <footer class="foot">
    <div>
      <div class="foot-thanks">Thank you for advertising with us.</div>
      <div>${ADSPOT_SELLER.name} · ${ADSPOT_SELLER.reg}</div>
    </div>
    <div class="foot-r">
      <div>${ADSPOT_SELLER.email}</div>
      <div>${ADSPOT_SELLER.phones}</div>
      <div>${ADSPOT_SELLER.web}</div>
    </div>
  </footer>

</div>
</body>
</html>`;
}

async function generateInvoicePDF(invoiceData, bookingData, isPaid = true) {
  try {
    if (typeof jspdf === 'undefined') throw new Error('jsPDF not loaded');
    if (typeof html2canvas === 'undefined') throw new Error('html2canvas not loaded');

    const fmtShort = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK');

    // Detail fields may be nested under item.details (booking + admin quotation
    // builder) or flat on the item itself (admin-quotation.html). Support both.
    const buildDetail = (item, d) => {
      const parts = [];
      if (item.adType === 'box') {
        if (d.columns && d.height) parts.push(`${d.columns} col × ${d.height} cm`);
        if (d.area) parts.push(`${d.area} cm²`);
        else if (d.size) parts.push(d.size);
        const c = d.colour || d.color || d.colorOption;
        if (c) parts.push(c === 'colour' || c === 'color' || c === 'full' ? 'Full colour' : (c === 'bw' ? 'Black & white' : c));
      } else {
        if (d.wordCount != null) parts.push(`${d.wordCount} words`);
        const extra = Math.max(0, (d.wordCount || 0) - (d.freeWords || 0));
        if (extra > 0 && d.extraRate) parts.push(`${d.freeWords || 0} free + ${extra} extra @ ${fmtShort(d.extraRate)}/word`);
        else if (d.freeWords != null) parts.push(`within ${d.freeWords} free words`);
      }
      return parts.join(' · ');
    };

    const items = (bookingData.items || []).map(item => {
      const d = item.details || item; // nested or flat
      return {
        paper: item.newspaperName || '',
        adType: item.adType === 'box' ? 'Box Advertisement' : 'Classified Advertisement',
        lang: d.language || '',
        detail: buildDetail(item, d),
        pubDate: item.pubDate,
        // "Amount" column shows the advertising cost with platform commission
        // baked in (commission is not shown to the customer as a separate line).
        // VAT / service charge remain itemised in the breakdown below.
        base: (d.adTotal != null ? d.adTotal + (d.commission || 0) : item.price) || 0
      };
    });

    const inv = {
      invoiceNumber: invoiceData.invoiceNumber,
      quotationNumber: invoiceData.quotationNumber || '',
      issueDate: new Date(),
      paidAt: new Date(),
      paymentMethod: bookingData.paymentMethod || 'bank',
      customer: {
        name: bookingData.customerName || '',
        company: bookingData.customerCompany || '',
        address: bookingData.customerAddress || '',
        email: bookingData.customerEmail || '',
        phone: bookingData.customerPhone || ''
      },
      items,
      // Absolute money values (accurate) + percentages for labels
      subtotal: invoiceData.subtotal || 0,
      commission: invoiceData.commission || 0,
      vat: invoiceData.vat || 0,
      serviceCharge: invoiceData.serviceCharge || 0,
      promoDiscount: invoiceData.promoDiscount || 0,
      promo: invoiceData.promoCode && invoiceData.promoDiscount > 0 ? { code: invoiceData.promoCode } : null,
      commissionPct: invoiceData.commission && invoiceData.subtotal
        ? Math.round((invoiceData.commission / invoiceData.subtotal) * 100) : 0,
      vatPct: invoiceData.vat && invoiceData.subtotal
        ? Math.round((invoiceData.vat / (invoiceData.subtotal - (invoiceData.promoDiscount || 0) + (invoiceData.commission || 0))) * 100) : 0,
      total: invoiceData.total || 0
    };

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-9999;width:794px;';
    container.innerHTML = buildInvoiceHTML(inv, isPaid);
    document.body.appendChild(container);

    // Wait for Google Fonts to load
    await new Promise(r => setTimeout(r, 1200));
    try { await document.fonts.ready; } catch (e) {}

    const el = container.querySelector('.inv');
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794
    });
    document.body.removeChild(container);

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const imgH = (canvas.height / canvas.width) * pw;
    doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pw, Math.min(imgH, ph));

    const blob = doc.output('blob');
    const path = `invoices/${invoiceData.invoiceNumber}.pdf`;
    console.log('📤 Uploading PDF:', path);
    const snap = await storage.ref(path).put(blob, { contentType: 'application/pdf' });
    const url = await snap.ref.getDownloadURL();
    console.log('✅ PDF uploaded:', url);
    return url;

  } catch (err) {
    console.error('❌ Invoice PDF error:', err);
    throw err;
  }
}

window.generateInvoicePDF = generateInvoicePDF;
console.log('✅ Invoice PDF generator (Minimal Clean Layout) loaded');
