/**
 * Invoice PDF Generator — Variant C · Stamped Classified
 * Exact faithful port of adspot-2/project/invoice-c-stamped.jsx + invoice.css
 */

function buildInvoiceHTML(inv, isPaid) {
  const fmtLKR = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtShort = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK');
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch(e) { return d || ''; } };
  const fmtDateUp = d => fmtDate(d).toUpperCase();

  const itemRows = inv.items.map(it => `
    <div class="st-item">
      <div class="st-item-desc" style="padding:10px 12px;border-right:1px solid var(--rule);">
        <div class="st-item-desc-name">${it.paper} — ${it.adType}</div>
        <div class="st-item-desc-sub">${it.spec}${it.lang ? ' · ' + it.lang : ''}</div>
      </div>
      <span class="st-item-pub">${fmtDate(it.pubDate)}</span>
      <span class="st-item-qty">${it.qty}</span>
      <span class="st-item-unit">${fmtShort(it.unitPrice)}</span>
      <span class="st-item-amt">${fmtShort(it.qty * it.unitPrice)}</span>
    </div>`).join('');

  const totals = (() => {
    const subtotal = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const commission = Math.round(subtotal * (inv.commissionPct || 0) / 100);
    const discount = inv.promo ? Math.round(subtotal * (inv.promo.pct / 100)) : 0;
    const afterDiscount = subtotal - discount + commission;
    const vat = Math.round(afterDiscount * (inv.vatPct || 0) / 100);
    const service = inv.serviceCharge || 0;
    const total = afterDiscount + vat + service;
    return { subtotal, commission, discount, vat, service, total };
  })();

  // Override total with the one passed in (already computed in booking.js)
  const displayTotal = inv.total || totals.total;

  const totalRows = [
    `<div class="st-tr"><span>Subtotal</span><span class="v">${fmtLKR(totals.subtotal)}</span></div>`,
    totals.commission > 0 ? `<div class="st-tr"><span>Commission (${inv.commissionPct}%)</span><span class="v">${fmtLKR(totals.commission)}</span></div>` : '',
    totals.discount > 0 ? `<div class="st-tr discount"><span>Discount · ${inv.promo.code}</span><span class="v">− ${fmtLKR(totals.discount)}</span></div>` : '',
    totals.vat > 0 ? `<div class="st-tr"><span>VAT (${inv.vatPct}%)</span><span class="v">${fmtLKR(totals.vat)}</span></div>` : '',
    totals.service > 0 ? `<div class="st-tr"><span>Service charge</span><span class="v">${fmtLKR(totals.service)}</span></div>` : '',
  ].filter(Boolean).join('');

  const stampHTML = isPaid ? `
    <div class="st-stamp">
      <div class="st-stamp-inner">
        <div class="st-stamp-text">PAID</div>
        <div class="st-stamp-sub">In Full</div>
        <div class="st-stamp-date">${fmtDateUp(inv.paidAt || new Date())}</div>
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500;1,6..72,600;1,6..72,700&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --ink: #181613;
  --ink-2: #5C544A;
  --ink-3: #8a8275;
  --paper: #FBF8F0;
  --paper-warm: #F3EDDE;
  --accent: #0E6B47;
  --accent-soft: rgba(14,107,71,0.10);
  --red: #B83A1F;
  --rule: rgba(24,22,19,0.18);
  --rule-strong: rgba(24,22,19,0.55);
  --font-display: "Newsreader", Georgia, serif;
  --font-ui: "Geist", -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--paper-warm); }

.inv {
  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
  width: 794px;
  min-height: 1123px;
  box-sizing: border-box;
  position: relative;
}
.inv *, .inv *::before, .inv *::after { box-sizing: border-box; }

/* VARIANT C — STAMPED CLASSIFIED */
.inv-st {
  background: var(--paper-warm);
  padding: 56px;
  font-size: 13px;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 1123px;
}
.inv-st::before {
  content: '';
  position: absolute;
  inset: 56px;
  border: 1px solid var(--rule-strong);
  pointer-events: none;
}
.inv-st::after {
  content: '';
  position: absolute;
  inset: 60px;
  border: 1px solid var(--rule);
  pointer-events: none;
}

.st-frame {
  position: relative;
  z-index: 1;
  background: var(--paper);
  margin: 8px;
  padding: 32px 36px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Header */
.st-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 18px;
  border-bottom: 3px double var(--ink);
  margin-bottom: 22px;
}
.st-hd-l { display: flex; align-items: baseline; gap: 8px; }
.st-hd-brand {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.015em;
}
.st-hd-tld {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  font-weight: 300;
  color: var(--ink-2);
}
.st-hd-r {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-2);
  text-align: right;
}
.st-hd-r strong { color: var(--ink); display: block; font-size: 12px; font-weight: 600; }

/* Title row */
.st-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
  gap: 24px;
}
.st-title-l { display: flex; flex-direction: column; gap: 4px; }
.st-kicker {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--red);
}
.st-title {
  font-family: var(--font-display);
  font-size: 64px;
  font-weight: 500;
  line-height: 0.9;
  letter-spacing: -0.035em;
  margin: 0;
  font-style: italic;
}
.st-title-r {
  text-align: right;
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-2);
}

/* Stamp */
.st-stamp {
  position: absolute;
  top: 200px;
  right: 90px;
  width: 150px;
  height: 150px;
  transform: rotate(-12deg);
  z-index: 3;
  pointer-events: none;
}
.st-stamp-inner {
  width: 100%;
  height: 100%;
  border: 3px solid var(--accent);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  opacity: 0.88;
}
.st-stamp-inner::before {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px solid var(--accent);
  border-radius: 50%;
}
.st-stamp-text {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
  line-height: 0.9;
  letter-spacing: -0.02em;
  text-align: center;
}
.st-stamp-sub {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--accent);
  margin-top: 4px;
}
.st-stamp-date {
  font-family: var(--font-mono);
  font-size: 8.5px;
  color: var(--accent);
  margin-top: 2px;
  letter-spacing: 0.08em;
}

/* Meta grid */
.st-meta {
  border: 1px solid var(--ink);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-bottom: 20px;
}
.st-meta-c {
  padding: 10px 14px;
  border-right: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.st-meta-c:last-child { border-right: 0; }
.st-meta-lbl {
  font-family: var(--font-mono);
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--ink-3);
}
.st-meta-val {
  font-size: 12.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* Parties */
.st-parties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--ink);
  border-bottom: 0;
  margin-bottom: 0;
}
.st-party {
  padding: 14px 16px;
  border-right: 1px solid var(--ink);
}
.st-party:last-child { border-right: 0; }
.st-party-lbl {
  font-family: var(--font-mono);
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--ink-3);
  margin-bottom: 4px;
}
.st-party-name {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.15;
  margin-bottom: 2px;
}
.st-party-line {
  color: var(--ink-2);
  font-size: 11.5px;
  line-height: 1.5;
}

/* Items */
.st-items { border: 1px solid var(--ink); margin-bottom: 16px; }
.st-items-head {
  display: grid;
  grid-template-columns: 1fr 90px 70px 90px 90px;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-mono);
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.st-items-head span { padding: 8px 12px; border-right: 1px solid var(--rule-strong); }
.st-items-head span:last-child { border-right: 0; }
.st-items-head span:nth-child(n+3) { text-align: right; }
.st-item {
  display: grid;
  grid-template-columns: 1fr 90px 70px 90px 90px;
  border-top: 1px solid var(--rule);
}
.st-item > span { padding: 10px 12px; border-right: 1px solid var(--rule); font-variant-numeric: tabular-nums; }
.st-item > span:last-child { border-right: 0; }
.st-item-desc {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.st-item-desc-name { font-weight: 500; font-size: 13px; }
.st-item-desc-sub { font-size: 10.5px; color: var(--ink-3); }
.st-item-pub, .st-item-qty, .st-item-unit, .st-item-amt {
  text-align: right;
  font-size: 12px;
  align-content: center;
}
.st-item-amt { font-weight: 600; }

/* Totals */
.st-totals { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.st-totals-inner {
  width: 320px;
  border: 1px solid var(--ink);
}
.st-tr {
  display: flex;
  justify-content: space-between;
  padding: 6px 14px;
  font-size: 12.5px;
  color: var(--ink-2);
  border-bottom: 1px solid var(--rule);
}
.st-tr:last-child { border-bottom: 0; }
.st-tr .v { color: var(--ink); font-weight: 500; font-variant-numeric: tabular-nums; }
.st-tr.discount, .st-tr.discount .v { color: var(--accent); }
.st-tr-grand {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 14px;
  background: var(--ink);
  color: var(--paper);
}
.st-tr-grand-l {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
.st-tr-grand-v {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

/* Footer */
.st-foot {
  margin-top: auto;
  padding-top: 14px;
  border-top: 3px double var(--ink);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-2);
}
.st-foot-c { display: flex; flex-direction: column; gap: 2px; }
.st-foot-c strong {
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}
.st-foot-c.right { text-align: right; }
.st-foot-c.center { text-align: center; }
.st-foot-thanks {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
  color: var(--ink);
  text-transform: none;
  letter-spacing: 0;
}
</style>
</head>
<body>
<div class="inv inv-st">
  ${stampHTML}
  <div class="st-frame">

    <header class="st-hd">
      <div class="st-hd-l">
        <span class="st-hd-brand">AdSpot</span>
        <span class="st-hd-tld">media</span>
      </div>
      <div class="st-hd-r">
        <strong>AdSpot Media</strong>
        <span>130 High Level Rd · Colombo 06</span>
        <span>adspot77@gmail.com · 070 161 1411</span>
      </div>
    </header>

    <div class="st-title-row">
      <div class="st-title-l">
        <span class="st-kicker">— ${isPaid ? 'Tax Invoice · Receipt' : 'Quotation · Payment Due'} —</span>
        <h1 class="st-title">${isPaid ? 'Invoice' : 'Quotation'}</h1>
      </div>
      <div class="st-title-r">
        <div style="font-family:var(--font-display);font-size:22px;font-weight:600;font-style:normal;letter-spacing:-0.01em;color:var(--ink);">${inv.invoiceNumber}</div>
        <div style="margin-top:4px;">Ref · ${inv.quotationNumber}</div>
        <div>Issued · ${fmtDateUp(inv.issueDate)}</div>
      </div>
    </div>

    <section class="st-meta">
      <div class="st-meta-c">
        <span class="st-meta-lbl">Invoice №</span>
        <span class="st-meta-val">${inv.invoiceNumber}</span>
      </div>
      <div class="st-meta-c">
        <span class="st-meta-lbl">Reference</span>
        <span class="st-meta-val">${inv.quotationNumber}</span>
      </div>
      <div class="st-meta-c">
        <span class="st-meta-lbl">Issued</span>
        <span class="st-meta-val">${fmtDate(inv.issueDate)}</span>
      </div>
      <div class="st-meta-c">
        <span class="st-meta-lbl">Payment</span>
        <span class="st-meta-val">${inv.paymentMethod === 'helapay' ? 'HelaPay' : 'Bank Transfer'}</span>
      </div>
    </section>

    <section class="st-parties">
      <div class="st-party">
        <div class="st-party-lbl">From</div>
        <div class="st-party-name">AdSpot Media</div>
        <div class="st-party-line">130 High Level Road, Colombo 06, Sri Lanka</div>
        <div class="st-party-line">adspot77@gmail.com</div>
        <div class="st-party-line">070 161 1411 / 070 642 1998</div>
      </div>
      <div class="st-party">
        <div class="st-party-lbl">Bill to</div>
        <div class="st-party-name">${inv.customer.name}</div>
        ${inv.customer.company ? `<div class="st-party-line" style="font-weight:500;color:var(--ink);">${inv.customer.company}</div>` : ''}
        ${inv.customer.address ? `<div class="st-party-line">${inv.customer.address}</div>` : ''}
        <div class="st-party-line">${inv.customer.email}</div>
        ${inv.customer.phone ? `<div class="st-party-line">${inv.customer.phone}</div>` : ''}
      </div>
    </section>

    <section class="st-items">
      <div class="st-items-head">
        <span>Publication</span>
        <span>Pub. date</span>
        <span style="text-align:right;">Qty</span>
        <span style="text-align:right;">Unit</span>
        <span style="text-align:right;">Amount</span>
      </div>
      ${itemRows}
    </section>

    <section class="st-totals">
      <div class="st-totals-inner">
        ${totalRows}
        <div class="st-tr-grand">
          <span class="st-tr-grand-l">Total Due</span>
          <span class="st-tr-grand-v">${fmtLKR(displayTotal)}</span>
        </div>
      </div>
    </section>

    <footer class="st-foot">
      <div class="st-foot-c">
        <strong>070 161 1411</strong>
        <span>· 070 642 1998</span>
      </div>
      <div class="st-foot-c center">
        <span class="st-foot-thanks">Thank you for advertising with us.</span>
        <span>Reg. PV 0023411</span>
      </div>
      <div class="st-foot-c right">
        <strong>adspot77@gmail.com</strong>
        <span>· adspotmedia.lk</span>
      </div>
    </footer>

  </div>
</div>
</body>
</html>`;
}

async function generateInvoicePDF(invoiceData, bookingData, isPaid = true) {
  try {
    if (typeof jspdf === 'undefined') throw new Error('jsPDF not loaded');
    if (typeof html2canvas === 'undefined') throw new Error('html2canvas not loaded');

    const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch(e) { return ''; } };

    // Build spec string from item.details
    const buildSpec = item => {
      const d = item.details || {};
      const parts = [];
      if (d.columns && d.height) parts.push(`${d.columns} col × ${d.height}cm`);
      else if (d.size) parts.push(d.size);
      if (d.colour || d.color) {
        const c = d.colour || d.color;
        parts.push(c === 'colour' || c === 'color' || c === 'full' ? 'Full colour' : c);
      }
      return parts.join(' · ');
    };

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
      items: (bookingData.items || []).map(item => ({
        paper: item.newspaperName || '',
        adType: item.adType === 'box' ? 'Box Ad' : 'Classified Ad',
        spec: buildSpec(item),
        lang: item.details?.language || '',
        pubDate: item.pubDate,
        qty: 1,
        unitPrice: item.price || 0
      })),
      commissionPct: invoiceData.commission && invoiceData.subtotal
        ? Math.round((invoiceData.commission / invoiceData.subtotal) * 100) : 0,
      vatPct: invoiceData.vat && invoiceData.subtotal
        ? Math.round((invoiceData.vat / (invoiceData.subtotal - (invoiceData.promoDiscount || 0) + (invoiceData.commission || 0))) * 100) : 0,
      serviceCharge: invoiceData.serviceCharge || 0,
      promo: invoiceData.promoCode && invoiceData.promoDiscount > 0
        ? { code: invoiceData.promoCode, pct: Math.round((invoiceData.promoDiscount / invoiceData.subtotal) * 100) }
        : null,
      total: invoiceData.total || 0
    };

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-9999;width:794px;';
    container.innerHTML = buildInvoiceHTML(inv, isPaid);
    document.body.appendChild(container);

    // Wait for Google Fonts to load
    await new Promise(r => setTimeout(r, 1200));
    try { await document.fonts.ready; } catch(e) {}

    const el = container.querySelector('.inv-st');
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#F3EDDE',
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
console.log('✅ Invoice PDF generator (Variant C · Stamped Classified) loaded');
