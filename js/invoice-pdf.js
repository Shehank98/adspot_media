/**
 * Invoice PDF Generator for AdSpot Media
 * Clean minimal design inspired by Anthropic/Stripe
 */

async function generateInvoicePDF(invoiceData, bookingData) {
    try {
        if (typeof jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded');
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        // Clean color scheme (matching HTML template)
        const primary = [30, 64, 175]; // #1e40af (blue)
        const dark = [31, 41, 55]; // #1f2937
        const gray = [107, 114, 128]; // #6b7280
        const lightGray = [229, 231, 235]; // #e5e7eb
        const green = [16, 185, 129]; // #10b981

        const formatCurrency = (amount) => {
            return `Rs. ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        const getCategoryName = (categoryKey) => {
            const categories = {
                'jobs': 'Jobs / Vacancies',
                'property': 'Property / Real Estate',
                'vehicles': 'Vehicles',
                'matrimonial': 'Matrimonial',
                'education': 'Education',
                'services': 'Services',
                'obituary': 'Obituary',
                'tenders': 'Tenders / Notices',
                'general': 'General'
            };
            return categories[categoryKey] || categoryKey || 'General';
        };

        let y = 25;

        // ===== HEADER (Clean minimal style) =====
        // "Invoice" on the left
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primary);
        doc.text('Invoice', 20, y);

        // "◈ AdSpot" on the right
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primary);
        doc.text('◈ AdSpot', 190, y, { align: 'right' });

        y += 15;

        // ===== INVOICE DETAILS TABLE =====
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);

        const labelX = 20;
        const valueX = 65;

        doc.text('Invoice number', labelX, y);
        doc.setTextColor(...dark);
        doc.setFont('helvetica', 'normal');
        doc.text(invoiceData.invoiceNumber, valueX, y);

        y += 6;
        doc.setTextColor(...gray);
        doc.text('Date of issue', labelX, y);
        doc.setTextColor(...dark);
        doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), valueX, y);

        y += 6;
        doc.setTextColor(...gray);
        doc.text('Date due', labelX, y);
        doc.setTextColor(...dark);
        doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), valueX, y);

        y += 6;
        doc.setTextColor(...gray);
        doc.text('Reference', labelX, y);
        doc.setTextColor(...dark);
        doc.text(invoiceData.quotationNumber, valueX, y);

        y += 15;

        // ===== COMPANY & CUSTOMER INFO (Two columns) =====
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text('AdSpot Media', 20, y);

        doc.text('Bill to', 110, y);

        y += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);

        // Left column - Company details
        doc.text('130 High Level Road', 20, y);
        y += 5;
        doc.text('Colombo 06', 20, y);
        y += 5;
        doc.text('Sri Lanka', 20, y);
        y += 5;
        doc.text('adspot77@gmail.com', 20, y);

        // Right column - Customer details
        y -= 15; // Reset to top of customer section
        doc.text(bookingData.customerName, 110, y);
        y += 5;
        if (bookingData.customerCompany) {
            doc.text(bookingData.customerCompany, 110, y);
            y += 5;
        }
        doc.text(bookingData.customerEmail, 110, y);

        y += 20;

        // ===== ITEMS TABLE =====
        // Table header
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);

        const colDesc = 20;
        const colQty = 115;
        const colUnit = 140;
        const colAmount = 190;

        doc.text('Description', colDesc, y);
        doc.text('Qty', colQty, y, { align: 'center' });
        doc.text('Unit price', colUnit, y, { align: 'right' });
        doc.text('Amount', colAmount, y, { align: 'right' });

        // Header line
        y += 2;
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.5);
        doc.line(20, y, 190, y);
        y += 8;

        // Items
        bookingData.items.forEach((item, index) => {
            // Check if we need a new page
            if (y > 230) {
                doc.addPage();
                y = 25;
            }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...dark);

            // Description with newspaper name
            let adTypeName = '';
            if (item.adType === 'box') {
                adTypeName = 'Box Ad';
            } else if (item.adType === 'classified') {
                adTypeName = 'Classified Ad';
            }

            const descLine1 = `${item.newspaperName} - ${adTypeName}`;
            doc.text(descLine1, colDesc, y);

            // Publication date
            y += 4;
            doc.setFontSize(8);
            doc.setTextColor(...gray);
            doc.text(`Publication: ${new Date(item.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, colDesc, y);

            // Quantity, unit price, amount
            y -= 2;
            doc.setFontSize(9);
            doc.setTextColor(...dark);
            doc.text('1', colQty, y, { align: 'center' });
            doc.text(formatCurrency(item.price), colUnit, y, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.text(formatCurrency(item.price), colAmount, y, { align: 'right' });

            // Item divider line
            y += 6;
            doc.setDrawColor(...lightGray);
            doc.setLineWidth(0.3);
            doc.line(20, y, 190, y);
            y += 8;
        });

        y += 5;

        // ===== TOTALS TABLE =====
        const labelX = 130;
        const valueX = 190;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        // Subtotal
        doc.setTextColor(...gray);
        doc.text('Subtotal', labelX, y);
        doc.setTextColor(...dark);
        doc.text(formatCurrency(invoiceData.subtotal), valueX, y, { align: 'right' });
        y += 6;

        // Platform Commission (for box ads only)
        if (invoiceData.hasBoxAds && invoiceData.commission > 0) {
            doc.setTextColor(...gray);
            doc.text('Platform Commission (10%)', labelX, y);
            doc.setTextColor(...dark);
            doc.text(formatCurrency(invoiceData.commission), valueX, y, { align: 'right' });
            y += 6;
        }

        // VAT (for box ads only)
        if (invoiceData.hasBoxAds && invoiceData.vat > 0) {
            doc.setTextColor(...gray);
            doc.text('VAT (18%)', labelX, y);
            doc.setTextColor(...dark);
            doc.text(formatCurrency(invoiceData.vat), valueX, y, { align: 'right' });
            y += 6;
        }

        // Service Charge (for classified ads only)
        if (invoiceData.hasClassifiedAds && invoiceData.serviceCharge > 0) {
            doc.setTextColor(...gray);
            doc.text('Service Charge', labelX, y);
            doc.setTextColor(...dark);
            doc.text(formatCurrency(invoiceData.serviceCharge), valueX, y, { align: 'right' });
            y += 6;
        }

        // Promo Discount (if applied)
        if (invoiceData.promoCode && invoiceData.promoDiscount > 0) {
            doc.setTextColor(5, 150, 105);
            doc.text(`Discount (${invoiceData.promoCode})`, labelX, y);
            doc.text('-' + formatCurrency(invoiceData.promoDiscount), valueX, y, { align: 'right' });
            y += 6;
        }

        // Total
        doc.setTextColor(...gray);
        doc.text('Total', labelX, y);
        doc.setTextColor(...dark);
        doc.text(formatCurrency(invoiceData.total), valueX, y, { align: 'right' });
        y += 8;

        // Amount paid line (with green highlight)
        doc.setDrawColor(...green);
        doc.setLineWidth(0.5);
        doc.line(labelX, y - 2, valueX, y - 2);

        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...green);
        doc.text('Amount paid ✓', labelX, y);
        doc.text(formatCurrency(invoiceData.total), valueX, y, { align: 'right' });

        // ===== FOOTER =====
        y = 270;

        // Footer divider line
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.line(20, y, 190, y);
        y += 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        doc.text('AdSpot Media Services', 20, y);
        y += 4;
        doc.text('Phone: 070 161 1411 / 070 642 1998 | Email: adspot77@gmail.com', 20, y);

        // ===== UPLOAD TO FIREBASE =====
        console.log('📤 Preparing to upload PDF to Firebase Storage...');
        const pdfBlob = doc.output('blob');
        console.log('📦 PDF blob created, size:', pdfBlob.size, 'bytes');

        const fileName = `invoices/${invoiceData.invoiceNumber}.pdf`;
        console.log('📁 Upload path:', fileName);

        const storageRef = storage.ref(fileName);
        console.log('⏳ Starting upload...');

        const uploadTask = await storageRef.put(pdfBlob);
        console.log('✅ Upload complete!');

        const downloadURL = await uploadTask.ref.getDownloadURL();
        console.log('✅ Invoice PDF uploaded to Firebase Storage:', downloadURL);

        return downloadURL;

    } catch (error) {
        console.error('❌ Error generating invoice PDF:', error);
        throw error;
    }
}

// Export for global access
window.generateInvoicePDF = generateInvoicePDF;

console.log('✅ Invoice PDF generator loaded');
