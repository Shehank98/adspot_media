/**
 * Invoice / Quotation PDF Generator — Native vector PDF (jsPDF)
 * Draws the invoice directly with jsPDF primitives (real text + lines), so the
 * output is crisp, selectable, small, and never stretched/rasterised.
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

/**
 * Draw the invoice/quotation onto a jsPDF document (A4, mm units).
 */
function drawInvoice(doc, inv, isPaid) {
  const fmtLKR = n => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return d || ''; } };

  // Geometry (mm) and palette (RGB)
  const ML = 15, MR = 195, CW = MR - ML;
  const INK = [17, 24, 39], INK2 = [75, 85, 99], INK3 = [156, 163, 175];
  const LINE = [229, 231, 235], LINE2 = [209, 213, 219], ACCENT = [14, 107, 71];
  const DUEBG = [254, 243, 199], DUETX = [146, 64, 14], PAIDBG = [224, 238, 232];

  const T = (txt, x, y, o = {}) => {
    const { size = 9, style = 'normal', color = INK, align = 'left', charSpace = 0 } = o;
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(String(txt), x, y, { align, charSpace });
  };
  const rule = (x1, y1, x2, y2, c = LINE, w = 0.3) => {
    doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(w); doc.line(x1, y1, x2, y2);
  };
  const textW = (txt, size, style = 'normal') => {
    doc.setFont('helvetica', style); doc.setFontSize(size); return doc.getTextWidth(String(txt));
  };

  const docLabel = isPaid ? 'INVOICE' : 'QUOTATION';
  const statusLabel = isPaid ? 'PAID' : 'PAYMENT DUE';

  // ── Header ──────────────────────────────────────────────────────────────
  const by = 20;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  let bx = ML;
  doc.setTextColor(...INK); doc.text('AdSpot', bx, by); bx += doc.getTextWidth('AdSpot');
  doc.setTextColor(...ACCENT); doc.text('.', bx, by); bx += doc.getTextWidth('.');
  doc.setTextColor(...INK); doc.text('Media', bx, by);
  T('Newspaper Advertising · Sri Lanka', ML, by + 5, { size: 8, color: INK3 });

  T(docLabel, MR, by - 1, { size: 19, style: 'bold', align: 'right', charSpace: 0.3 });
  T(inv.invoiceNumber || '', MR, by + 5, { size: 9.5, style: 'bold', align: 'right' });
  const stFS = 7.5, stW = textW(statusLabel, stFS, 'bold') + 6, stH = 5.4, stX = MR - stW, stY = by + 8;
  doc.setFillColor(...(isPaid ? PAIDBG : DUEBG));
  doc.roundedRect(stX, stY, stW, stH, 1.2, 1.2, 'F');
  T(statusLabel, stX + 3, stY + 3.7, { size: stFS, style: 'bold', color: isPaid ? ACCENT : DUETX, charSpace: 0.3 });

  let y = by + 18;
  rule(ML, y, MR, y, INK, 0.6);

  // ── Meta strip ──────────────────────────────────────────────────────────
  y += 9;
  const meta = [
    { l: isPaid ? 'INVOICE NO.' : 'QUOTATION NO.', v: isPaid ? inv.invoiceNumber : (inv.quotationNumber || inv.invoiceNumber) },
    { l: 'REFERENCE', v: inv.quotationNumber || inv.invoiceNumber || '-' },
    { l: isPaid ? 'PAID ON' : 'ISSUED', v: fmtDate(isPaid ? (inv.paidAt || inv.issueDate) : inv.issueDate) },
    { l: 'PAYMENT METHOD', v: inv.paymentMethod === 'helapay' ? 'HelaPay QR' : 'Bank Transfer' }
  ];
  const colW = CW / 4;
  meta.forEach((c, i) => {
    const x = ML + i * colW;
    T(c.l, x, y, { size: 6.5, color: INK3, style: 'bold', charSpace: 0.3 });
    T(c.v, x, y + 4.6, { size: 9, style: 'normal' });
  });

  // ── Parties ─────────────────────────────────────────────────────────────
  y += 14;
  const drawParty = (x, label, name, lines) => {
    let yy = y;
    T(label, x, yy, { size: 6.5, color: INK3, style: 'bold', charSpace: 0.3 }); yy += 5.4;
    T(name, x, yy, { size: 11.5, style: 'bold' }); yy += 5;
    lines.forEach(ln => {
      if (!ln) return;
      T(ln.t, x, yy, { size: 8.5, color: ln.ink ? INK : INK2, style: ln.ink ? 'bold' : 'normal' });
      yy += 4.3;
    });
    return yy;
  };
  const fromLines = [
    ...ADSPOT_SELLER.addressLines.map(t => ({ t })),
    { t: ADSPOT_SELLER.email }, { t: ADSPOT_SELLER.phones }, { t: ADSPOT_SELLER.reg }
  ];
  const billLines = [
    inv.customer.company ? { t: inv.customer.company, ink: true } : null,
    inv.customer.address ? { t: inv.customer.address } : null,
    (inv.customer.email && inv.customer.email !== 'TBD') ? { t: inv.customer.email } : null,
    inv.customer.phone ? { t: inv.customer.phone } : null
  ].filter(Boolean);
  const yA = drawParty(ML, 'FROM', ADSPOT_SELLER.name, fromLines);
  const yB = drawParty(ML + CW / 2, 'BILL TO', inv.customer.name || '-', billLines);
  y = Math.max(yA, yB) + 8;

  // ── Items table ─────────────────────────────────────────────────────────
  T('#', ML, y, { size: 6.5, color: INK2, style: 'bold' });
  T('DESCRIPTION', ML + 8, y, { size: 6.5, color: INK2, style: 'bold', charSpace: 0.3 });
  T('AMOUNT', MR, y, { size: 6.5, color: INK2, style: 'bold', align: 'right', charSpace: 0.3 });
  y += 2.5; rule(ML, y, MR, y, INK, 0.5); y += 0.5;

  (inv.items || []).forEach((it, i) => {
    let ty = y + 4.6;
    T(String(i + 1), ML, ty, { size: 8.5, color: INK3 });
    T(it.paper || '', ML + 8, ty, { size: 9.5, style: 'bold' });
    T(fmtLKR(it.base), MR, ty, { size: 9.5, align: 'right' });
    ty += 4;
    const sub = `${it.adType}${it.lang ? ' · ' + it.lang : ''}${it.pubDate ? ' · Publishes ' + fmtDate(it.pubDate) : ''}`;
    T(sub, ML + 8, ty, { size: 8, color: INK2 }); ty += 3.7;
    if (it.detail) { T(it.detail, ML + 8, ty, { size: 7.5, color: INK3 }); ty += 3.7; }
    y = ty + 2.6;
    rule(ML, y, MR, y, LINE, 0.3); y += 0.3;
  });

  // ── Cost breakdown (right-aligned) ───────────────────────────────────────
  y += 5;
  const bxL = MR - 92;
  const money = {
    vat: inv.vat || 0, service: inv.serviceCharge || 0,
    discount: inv.promoDiscount || 0, total: inv.total || 0
  };
  // Derive advertising subtotal from the authoritative total so it reconciles
  const displaySubtotal = money.total - money.vat - money.service + money.discount;
  const rows = [['Subtotal · advertising', fmtLKR(displaySubtotal), false]];
  // Discount is shown before VAT — it reduces the taxable amount
  if (money.discount > 0) rows.push([`Discount${inv.promo && inv.promo.code ? ' · ' + inv.promo.code : ''}`, '- ' + fmtLKR(money.discount), true]);
  if (money.vat > 0) rows.push([`VAT${inv.vatPct ? ` (${inv.vatPct}%)` : ''}`, fmtLKR(money.vat), false]);
  if (money.service > 0) rows.push(['Classified service charge', fmtLKR(money.service), false]);
  rows.forEach(r => {
    T(r[0], bxL, y, { size: 9, color: r[2] ? ACCENT : INK2 });
    T(r[1], MR, y, { size: 9, align: 'right', color: r[2] ? ACCENT : INK });
    y += 5.3;
  });
  y += 2; rule(bxL, y, MR, y, INK, 0.6); y += 6.6;
  T(isPaid ? 'TOTAL PAID' : 'TOTAL DUE', bxL, y, { size: 9, style: 'bold', charSpace: 0.3 });
  T(fmtLKR(money.total), MR, y, { size: 15, style: 'bold', align: 'right' });
  y += 4;

  // ── Bank block (unpaid quotations only) ──────────────────────────────────
  if (!isPaid) {
    y += 8;
    const noteStr = `Please use your reference ${inv.quotationNumber || inv.invoiceNumber} when making the transfer, then upload your receipt from "My Bookings".`;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    const noteLines = doc.splitTextToSize(noteStr, CW - 12);
    const boxH = 32 + noteLines.length * 3.4;
    doc.setDrawColor(...LINE2); doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, CW, boxH, 2, 2, 'S');
    let iy = y + 6;
    T('HOW TO PAY BY BANK TRANSFER', ML + 6, iy, { size: 8, style: 'bold', charSpace: 0.3 }); iy += 6.5;
    const cL = ML + 6, cR = ML + CW / 2 + 2;
    T('BANK', cL, iy, { size: 6.5, color: INK3, style: 'bold', charSpace: 0.2 });
    T('ACCOUNT NAME', cR, iy, { size: 6.5, color: INK3, style: 'bold', charSpace: 0.2 }); iy += 4;
    T(ADSPOT_BANK.bank, cL, iy, { size: 9, style: 'bold' });
    T(ADSPOT_BANK.name, cR, iy, { size: 9, style: 'bold' }); iy += 6.5;
    T('ACCOUNT NO.', cL, iy, { size: 6.5, color: INK3, style: 'bold', charSpace: 0.2 });
    T('BRANCH', cR, iy, { size: 6.5, color: INK3, style: 'bold', charSpace: 0.2 }); iy += 4;
    T(ADSPOT_BANK.account, cL, iy, { size: 9, style: 'bold' });
    T(ADSPOT_BANK.branch, cR, iy, { size: 9, style: 'bold' }); iy += 5.5;
    noteLines.forEach((ln, k) => T(ln, ML + 6, iy + k * 3.4, { size: 7.5, color: INK2 }));
  }

  // ── Footer (anchored near page bottom) ───────────────────────────────────
  const fy = 280;
  rule(ML, fy, MR, fy, LINE, 0.3);
  T('Thank you for advertising with us.', ML, fy + 5, { size: 9.5, style: 'bold' });
  T(`${ADSPOT_SELLER.name} · ${ADSPOT_SELLER.reg}`, ML, fy + 9.5, { size: 7.5, color: INK3 });
  T(ADSPOT_SELLER.email, MR, fy + 5, { size: 7.5, color: INK3, align: 'right' });
  T(ADSPOT_SELLER.phones, MR, fy + 9, { size: 7.5, color: INK3, align: 'right' });
  T(ADSPOT_SELLER.web, MR, fy + 13, { size: 7.5, color: INK3, align: 'right' });
}

// Build the jsPDF document for an invoice/quotation (shared by the upload and
// download paths).
function buildInvoiceDoc(invoiceData, bookingData, isPaid = true) {
    if (typeof jspdf === 'undefined') throw new Error('jsPDF not loaded');

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
        if (c) parts.push(c === 'colour' || c === 'color' || c === 'full' ? 'Full colour' : (c === 'bw' || c === 'black' ? 'Black & white' : c));
        if (d.positionPct > 0) parts.push(`${d.positionLabel || 'Special position'} +${d.positionPct}%`);
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
        // baked in (commission is not shown as a separate line). VAT / service
        // charge remain itemised in the breakdown below.
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
      subtotal: invoiceData.subtotal || 0,
      commission: invoiceData.commission || 0,
      vat: invoiceData.vat || 0,
      serviceCharge: invoiceData.serviceCharge || 0,
      promoDiscount: invoiceData.promoDiscount || 0,
      promo: invoiceData.promoCode && invoiceData.promoDiscount > 0 ? { code: invoiceData.promoCode } : null,
      commissionPct: invoiceData.commission && invoiceData.subtotal
        ? Math.round((invoiceData.commission / invoiceData.subtotal) * 100) : 0,
      // Use the actual configured VAT rate, not one back-calculated from
      // amounts (which rounds wrong when the base includes commission or
      // no-VAT classified items). Prefer an explicit rate, then the live
      // CONFIG setting, then a last-resort derivation.
      vatPct: invoiceData.vatPct != null ? invoiceData.vatPct
        : ((typeof CONFIG !== 'undefined' && CONFIG.CHARGES && CONFIG.CHARGES.vatRate)
            ? Math.round(CONFIG.CHARGES.vatRate * 100)
            : (invoiceData.vat && invoiceData.subtotal
                ? Math.round((invoiceData.vat / invoiceData.subtotal) * 100) : 0)),
      total: invoiceData.total || 0
    };

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    drawInvoice(doc, inv, isPaid);
    return doc;
}

// Build the PDF and upload it to Firebase Storage; returns the download URL.
async function generateInvoicePDF(invoiceData, bookingData, isPaid = true) {
  try {
    const doc = buildInvoiceDoc(invoiceData, bookingData, isPaid);
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

// Build the PDF and trigger a local download in the browser (no upload / email
// needed) — used when a customer has no email on file.
function downloadInvoicePDF(invoiceData, bookingData, isPaid = true, filename) {
  const doc = buildInvoiceDoc(invoiceData, bookingData, isPaid);
  doc.save(filename || `${invoiceData.invoiceNumber || invoiceData.quotationNumber || 'quotation'}.pdf`);
}

window.generateInvoicePDF = generateInvoicePDF;
window.downloadInvoicePDF = downloadInvoicePDF;
console.log('✅ Invoice PDF generator (native vector) loaded');
