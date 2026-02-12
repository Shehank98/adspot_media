/**
 * Invoice PDF Generator for AdSpot Media
 * Professional Anthropic-style invoice with complete breakdown
 */

async function generateInvoicePDF(invoiceData, bookingData) {
    try {
        if (typeof jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded');
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        // Professional color scheme
        const primary = [26, 86, 219]; // #1a56db (AdSpot blue)
        const dark = [31, 41, 55]; // #1f2937
        const gray = [107, 114, 128]; // #6b7280
        const lightGray = [243, 244, 246]; // #f3f4f6

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

        // ===== HEADER =====
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primary);
        doc.text('AdSpot Media', 20, y);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        doc.text('Newspaper Advertising Services', 20, y + 7);

        // Invoice number (right side)
        doc.setFontSize(11);
        doc.setTextColor(...gray);
        doc.text('Invoice', 190, y, { align: 'right' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text(invoiceData.invoiceNumber, 190, y + 7, { align: 'right' });

        y += 25;

        // ===== COMPANY & INVOICE INFO =====
        // Left column - Company details
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        doc.text('AdSpot Media', 20, y);
        doc.text('Email: adspot77@gmail.com', 20, y + 5);
        doc.text('Phone: +94 70 642 1998', 20, y + 10);
        doc.text('Colombo, Sri Lanka', 20, y + 15);

        // Right column - Invoice details
        doc.text('Quotation No:', 140, y);
        doc.setTextColor(...dark);
        doc.text(invoiceData.quotationNumber, 190, y, { align: 'right' });

        doc.setTextColor(...gray);
        doc.text('Issue Date:', 140, y + 5);
        doc.setTextColor(...dark);
        doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 190, y + 5, { align: 'right' });

        doc.setTextColor(...gray);
        doc.text('Payment Status:', 140, y + 10);
        const statusText = bookingData.paymentStatus === 'completed' ? 'PAID' : 'PENDING';
        const statusColor = bookingData.paymentStatus === 'completed' ? [34, 197, 94] : [234, 179, 8];
        doc.setTextColor(...statusColor);
        doc.setFont('helvetica', 'bold');
        doc.text(statusText, 190, y + 10, { align: 'right' });

        y += 30;

        // ===== BILL TO =====
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text('BILL TO', 20, y);

        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(bookingData.customerName, 20, y);

        if (bookingData.customerCompany) {
            y += 5;
            doc.text(bookingData.customerCompany, 20, y);
        }

        y += 5;
        doc.setTextColor(...gray);
        doc.text(bookingData.customerEmail, 20, y);
        y += 5;
        doc.text(bookingData.customerPhone || '', 20, y);

        y += 15;

        // ===== AD ITEMS SECTION =====
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text(`Ad Items (${bookingData.items.length})`, 20, y);
        y += 8;

        // Draw background box for items
        const itemsStartY = y;

        bookingData.items.forEach((item, index) => {
            // Check if we need a new page
            if (y > 240) {
                doc.addPage();
                y = 25;
            }

            // Item background (alternating colors)
            const bgColor = index % 2 === 0 ? [249, 250, 251] : [255, 255, 255];
            doc.setFillColor(...bgColor);
            doc.rect(20, y - 3, 170, 18, 'F');

            // Newspaper name
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...dark);
            doc.text(item.newspaperName, 22, y + 2);

            // Ad details line 2
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...gray);

            if (item.adType === 'box') {
                const details = item.details || {};
                doc.text(`Box Ad: ${details.columns || 1} col x ${details.height || 0} cm (${details.colorOption === 'color' ? 'Color' : 'B&W'})`, 22, y);
            } else if (item.adType === 'classified') {
                const details = item.details || {};
                const categoryName = getCategoryName(details.category);
                doc.text(`Classified: ${details.wordCount || 0} words (${categoryName})`, 22, y);
            }

            // Publication date line 3
            y += 4;
            doc.text(new Date(item.pubDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }), 22, y);

            // Amount (right side)
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...dark);
            doc.text(formatCurrency(item.price), 188, y - 4, { align: 'right' });

            y += 8;
        });

        y += 8;

        // ===== CHARGES BREAKDOWN =====
        // Background box for breakdown
        doc.setFillColor(249, 250, 251);
        doc.rect(20, y - 3, 170, 50, 'F');

        const breakdownX = 22;
        const amountX = 188;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        // Ad Subtotal
        doc.setTextColor(...gray);
        doc.text('Ad Subtotal:', breakdownX, y);
        doc.setTextColor(...dark);
        doc.text(formatCurrency(invoiceData.subtotal), amountX, y, { align: 'right' });
        y += 6;

        // Platform Commission (for box ads only)
        if (invoiceData.hasBoxAds && invoiceData.commission > 0) {
            doc.setTextColor(...gray);
            doc.text('Platform Commission (10%):', breakdownX, y);
            doc.setTextColor(...dark);
            doc.text(formatCurrency(invoiceData.commission), amountX, y, { align: 'right' });
            y += 6;
        }

        // VAT (for box ads only)
        if (invoiceData.hasBoxAds && invoiceData.vat > 0) {
            doc.setTextColor(...gray);
            doc.text('VAT (18%):', breakdownX, y);
            doc.setTextColor(...dark);
            doc.text(formatCurrency(invoiceData.vat), amountX, y, { align: 'right' });
            y += 6;
        }

        // Service Charge (for classified ads only)
        if (invoiceData.hasClassifiedAds && invoiceData.serviceCharge > 0) {
            doc.setTextColor(...gray);
            doc.text('Service Charge:', breakdownX, y);
            doc.setTextColor(...dark);
            doc.text(formatCurrency(invoiceData.serviceCharge), amountX, y, { align: 'right' });
            y += 6;
        }

        // Promo Discount (if applied)
        if (invoiceData.promoCode && invoiceData.promoDiscount > 0) {
            doc.setTextColor(5, 150, 105); // Green color for discount
            doc.text(`Promo Discount (${invoiceData.promoCode}):`, breakdownX, y);
            doc.text('-' + formatCurrency(invoiceData.promoDiscount), amountX, y, { align: 'right' });
            y += 6;
        }

        y += 5;

        // Total line separator
        doc.setDrawColor(...primary);
        doc.setLineWidth(0.8);
        doc.line(breakdownX, y, amountX, y);
        y += 8;

        // Total amount (prominent)
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primary);
        doc.text('Total Amount:', breakdownX, y);
        doc.text(formatCurrency(invoiceData.total), amountX, y, { align: 'right' });

        // ===== FOOTER =====
        y = 270;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        doc.text('Thank you for your business with AdSpot Media!', 105, y, { align: 'center' });
        y += 4;
        doc.text('For inquiries, please contact: adspot77@gmail.com | +94 70 642 1998', 105, y, { align: 'center' });

        // ===== UPLOAD TO FIREBASE =====
        const pdfBlob = doc.output('blob');
        const fileName = `invoices/${invoiceData.invoiceNumber}.pdf`;
        const storageRef = storage.ref(fileName);
        const uploadTask = await storageRef.put(pdfBlob);
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
