/**
 * Invoice PDF Generator — Variant C "Stamped Classified"
 * Renders HTML/CSS template via html2canvas, exports to jsPDF, uploads to Firebase Storage.
 */

function buildInvoiceHTML(inv) {
    const fmtLKR = n => `Rs. ${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = d => {
        try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch (e) { return d || ''; }
    };

    const itemRows = inv.items.map(item => `
        <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #d4cfc5;vertical-align:top;">
                <div style="font-weight:600;color:#181613;">${item.description}</div>
                <div style="font-size:12px;color:#6b6560;margin-top:2px;">${item.detail}</div>
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid #d4cfc5;text-align:center;font-family:'JetBrains Mono',monospace;color:#181613;">${item.qty}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #d4cfc5;text-align:right;font-family:'JetBrains Mono',monospace;color:#181613;">${fmtLKR(item.unitPrice)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #d4cfc5;text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600;color:#181613;">${fmtLKR(item.amount)}</td>
        </tr>`).join('');

    const totalsRows = [];
    totalsRows.push(`<tr><td style="padding:6px 14px;color:#6b6560;font-size:13px;">Subtotal</td><td style="padding:6px 14px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;">${fmtLKR(inv.subtotal)}</td></tr>`);
    if (inv.commission > 0) totalsRows.push(`<tr><td style="padding:6px 14px;color:#6b6560;font-size:13px;">Platform Commission (10%)</td><td style="padding:6px 14px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;">${fmtLKR(inv.commission)}</td></tr>`);
    if (inv.vat > 0) totalsRows.push(`<tr><td style="padding:6px 14px;color:#6b6560;font-size:13px;">VAT (18%)</td><td style="padding:6px 14px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;">${fmtLKR(inv.vat)}</td></tr>`);
    if (inv.serviceCharge > 0) totalsRows.push(`<tr><td style="padding:6px 14px;color:#6b6560;font-size:13px;">Service Charge</td><td style="padding:6px 14px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;">${fmtLKR(inv.serviceCharge)}</td></tr>`);
    if (inv.promoDiscount > 0) totalsRows.push(`<tr><td style="padding:6px 14px;color:#0E6B47;font-size:13px;">Discount (${inv.promoCode})</td><td style="padding:6px 14px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;color:#0E6B47;">−${fmtLKR(inv.promoDiscount)}</td></tr>`);

    const stampHTML = inv.paymentStatus === 'paid' ? `
        <div style="position:absolute;top:190px;right:80px;width:160px;height:160px;border-radius:50%;
                    background:#0E6B47;transform:rotate(-12deg);display:flex;flex-direction:column;
                    align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(14,107,71,0.35);
                    border:4px solid rgba(255,255,255,0.3);z-index:10;">
            <div style="color:white;font-family:Newsreader,Georgia,serif;font-size:30px;font-weight:700;letter-spacing:3px;line-height:1;">PAID</div>
            <div style="color:rgba(255,255,255,0.8);font-size:10px;font-family:Geist,sans-serif;margin-top:4px;">${fmtDate(new Date())}</div>
        </div>` : '';

    const docTitle = inv.paymentStatus === 'paid' ? 'Invoice' : 'Quotation';
    const statusLabel = inv.paymentStatus === 'paid' ? 'PAID' : 'PAYMENT DUE';
    const statusBg = inv.paymentStatus === 'paid' ? '#0E6B47' : '#8B7355';

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,700;1,400&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F3EDDE;">
<div class="inv-st" style="background:#F3EDDE;font-family:Geist,system-ui,sans-serif;color:#181613;width:794px;min-height:1123px;padding:40px;box-sizing:border-box;position:relative;">

    ${stampHTML}

    <!-- Outer double-border frame -->
    <div style="border:2.5px solid #181613;padding:32px;position:relative;
                outline:2.5px solid #181613;outline-offset:-10px;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #181613;">
            <div>
                <h1 style="font-family:Newsreader,Georgia,serif;font-size:42px;font-weight:700;margin:0;line-height:1;color:#181613;">${docTitle}</h1>
                <div style="margin-top:10px;display:inline-block;background:${statusBg};color:white;font-size:10px;font-weight:600;letter-spacing:2px;padding:3px 10px;font-family:Geist,sans-serif;">${statusLabel}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-family:Newsreader,Georgia,serif;font-size:22px;font-weight:700;color:#181613;">AdSpot Media</div>
                <div style="font-size:12px;color:#6b6560;margin-top:6px;line-height:1.7;">
                    130 High Level Road<br>Colombo 06, Sri Lanka<br>adspot77@gmail.com
                </div>
            </div>
        </div>

        <!-- Meta table -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;">
            <div>
                <table style="border-collapse:collapse;font-size:12px;">
                    <tr><td style="color:#6b6560;padding-bottom:5px;padding-right:20px;white-space:nowrap;">${docTitle} number</td><td style="font-family:'JetBrains Mono',monospace;font-weight:600;padding-bottom:5px;">${inv.invoiceNumber}</td></tr>
                    <tr><td style="color:#6b6560;padding-bottom:5px;padding-right:20px;">Date of issue</td><td style="font-family:'JetBrains Mono',monospace;padding-bottom:5px;">${inv.date}</td></tr>
                    <tr><td style="color:#6b6560;padding-bottom:5px;padding-right:20px;">Date due</td><td style="font-family:'JetBrains Mono',monospace;padding-bottom:5px;">${inv.dueDate}</td></tr>
                    <tr><td style="color:#6b6560;padding-right:20px;">Reference</td><td style="font-family:'JetBrains Mono',monospace;">${inv.quotationNumber}</td></tr>
                </table>
            </div>
        </div>

        <!-- From / Bill To -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
            <div>
                <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6b6560;margin-bottom:8px;">From</div>
                <div style="font-size:13px;line-height:1.7;color:#181613;">
                    <strong>${inv.from.name}</strong><br>
                    ${inv.from.address}<br>
                    ${inv.from.city}, ${inv.from.country}<br>
                    ${inv.from.email}
                </div>
            </div>
            <div>
                <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6b6560;margin-bottom:8px;">Bill To</div>
                <div style="font-size:13px;line-height:1.7;color:#181613;">
                    <strong>${inv.to.name}</strong><br>
                    ${inv.to.company ? inv.to.company + '<br>' : ''}
                    ${inv.to.email}
                    ${inv.to.phone ? '<br>' + inv.to.phone : ''}
                </div>
            </div>
        </div>

        <!-- Items table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
            <thead>
                <tr style="background:#181613;color:#F3EDDE;">
                    <th style="padding:10px 14px;text-align:left;font-weight:600;letter-spacing:0.5px;">Description</th>
                    <th style="padding:10px 14px;text-align:center;font-weight:600;width:60px;">Qty</th>
                    <th style="padding:10px 14px;text-align:right;font-weight:600;width:130px;">Unit Price</th>
                    <th style="padding:10px 14px;text-align:right;font-weight:600;width:130px;">Amount</th>
                </tr>
            </thead>
            <tbody style="background:white;">
                ${itemRows}
            </tbody>
        </table>

        <!-- Totals box -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
            <table style="border-collapse:collapse;min-width:320px;border:1.5px solid #181613;font-size:13px;">
                ${totalsRows.join('')}
                <tr style="background:#181613;color:#F3EDDE;">
                    <td style="padding:12px 14px;font-weight:700;font-size:14px;letter-spacing:0.5px;">Total Due</td>
                    <td style="padding:12px 14px;text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:16px;">${fmtLKR(inv.total)}</td>
                </tr>
            </table>
        </div>

        ${inv.paymentStatus !== 'paid' ? `
        <!-- Bank transfer details -->
        <div style="border:1.5px solid #d4cfc5;padding:16px;background:white;font-size:12px;margin-bottom:20px;">
            <div style="font-weight:700;margin-bottom:8px;color:#181613;">Bank Transfer Details</div>
            <div style="color:#6b6560;line-height:1.8;">
                Please transfer the total amount to the account below and reply with your payment receipt.
            </div>
        </div>` : ''}

        <!-- Footer -->
        <div style="border-top:1.5px solid #d4cfc5;padding-top:14px;font-size:11px;color:#6b6560;display:flex;justify-content:space-between;">
            <span>AdSpot Media · 070 161 1411 / 070 642 1998</span>
            <span>adspot77@gmail.com</span>
        </div>

    </div><!-- end frame -->
</div><!-- end inv-st -->
</body>
</html>`;
}

async function generateInvoicePDF(invoiceData, bookingData, isPaid = true) {
    try {
        if (typeof jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded');
        }
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas library not loaded');
        }

        const fmtDate = d => {
            try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
            catch (e) { return ''; }
        };

        const inv = {
            invoiceNumber: invoiceData.invoiceNumber,
            quotationNumber: invoiceData.quotationNumber || '',
            date: fmtDate(new Date()),
            dueDate: fmtDate(new Date()),
            paymentStatus: isPaid ? 'paid' : 'unpaid',
            from: {
                name: 'AdSpot Media',
                address: '130 High Level Road',
                city: 'Colombo 06',
                country: 'Sri Lanka',
                email: 'adspot77@gmail.com'
            },
            to: {
                name: bookingData.customerName || '',
                company: bookingData.customerCompany || '',
                email: bookingData.customerEmail || '',
                phone: bookingData.customerPhone || ''
            },
            items: (bookingData.items || []).map(item => ({
                description: `${item.newspaperName || ''} — ${item.adType === 'box' ? 'Box Ad' : 'Classified Ad'}`,
                detail: `Publication: ${fmtDate(item.pubDate)}`,
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

        // Build and inject off-screen container
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
        container.innerHTML = buildInvoiceHTML(inv);
        document.body.appendChild(container);

        // Wait for fonts to load (Google Fonts via @import in injected HTML)
        await new Promise(resolve => setTimeout(resolve, 800));
        try { await document.fonts.ready; } catch (e) {}

        const invoiceEl = container.querySelector('.inv-st');
        const canvas = await html2canvas(invoiceEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#F3EDDE',
            width: 794,
            windowWidth: 794
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const { jsPDF } = jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const imgAspect = canvas.height / canvas.width;
        const renderedH = pageW * imgAspect;

        if (renderedH <= pageH) {
            doc.addImage(imgData, 'JPEG', 0, 0, pageW, renderedH);
        } else {
            // Multi-page: scale to fit width, split at page boundary
            doc.addImage(imgData, 'JPEG', 0, 0, pageW, renderedH);
        }

        // Upload to Firebase Storage
        const pdfBlob = doc.output('blob');
        const fileName = `invoices/${invoiceData.invoiceNumber}.pdf`;
        console.log('📤 Uploading PDF to Firebase Storage:', fileName);

        const storageRef = storage.ref(fileName);
        const uploadTask = await storageRef.put(pdfBlob, { contentType: 'application/pdf' });
        const downloadURL = await uploadTask.ref.getDownloadURL();

        console.log('✅ Invoice PDF uploaded:', downloadURL);
        return downloadURL;

    } catch (error) {
        console.error('❌ Error generating invoice PDF:', error);
        throw error;
    }
}

window.generateInvoicePDF = generateInvoicePDF;
console.log('✅ Invoice PDF generator (Variant C) loaded');
