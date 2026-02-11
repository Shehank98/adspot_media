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

        // ===== TABLE HEADER =====
        doc.setFillColor(...lightGray);
        doc.rect(20, y - 5, 170, 8, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text('DESCRIPTION', 22, y);
        doc.text('RATE', 100, y);
        doc.text('PUBLISH DATE', 145, y);
        doc.text('AMOUNT', 190, y, { align: 'right' });

        y += 8;

        // ===== TABLE ROWS - LINE ITEMS =====
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        bookingData.items.forEach((item, index) => {
            // Check if we need a new page
            if (y > 250) {
                doc.addPage();
                y = 25;
            }

            // Newspaper name + Ad type
            doc.setTextColor(...dark);
            doc.setFont('helvetica', 'bold');
            doc.text(item.newspaperName, 22, y);

            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...gray);
            doc.setFontSize(8);

            // Description based on ad type
            if (item.adType === 'box') {
                const details = item.details || {};
                doc.text(`Box Ad: ${details.columns || 1} col x ${details.height || 0} cm (${details.colorOption || 'B&W'})`, 22, y);
            } else if (item.adType === 'classified') {
                const details = item.details || {};
                doc.text(`Classified Ad: ${details.wordCount || 0} words`, 22, y);
            }

            // Rate (per sq cm or per word)
            y -= 4;
            doc.setFontSize(9);
            doc.setTextColor(...gray);
            if (item.adType === 'box') {
                const details = item.details || {};
                doc.text(formatCurrency(details.rate || 0) + '/col-cm', 100, y);
            } else {
                doc.text('Per word', 100, y);
            }

            // Publish Date
            doc.text(new Date(item.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 145, y);

            // Amount
            doc.setTextColor(...dark);
            doc.text(formatCurrency(item.price), 190, y, { align: 'right' });

            y += 10;

            // Separator line
            doc.setDrawColor(230, 230, 230);
            doc.line(20, y - 2, 190, y - 2);
        });

        y += 5;

        // ===== TOTALS SECTION =====
        const totalsX = 120;

        doc.setFontSize(9);
        doc.setTextColor(...gray);

        // Subtotal
        doc.text('Subtotal:', totalsX, y);
        doc.setTextColor(...dark);
        doc.text(formatCurrency(invoiceData.subtotal), 190, y, { align: 'right' });
        y += 6;

        // Commission (for box ads only)
        if (invoiceData.hasBoxAds && invoiceData.commission > 0) {
            doc.setTextColor(...gray);
            doc.text('Platform Commission (10%):', totalsX, y);
            doc.setTextColor(...dark);
            doc.text(formatCurrency(invoiceData.commission), 190, y, { align: 'right' });
            y += 6;
        }

        // VAT (for box ads only)
        if (invoiceData.hasBoxAds && invoiceData.vat > 0) {
            doc.setTextColor(...gray);
            doc.text('VAT (18%):', totalsX, y);
            doc.setTextColor(...dark);
            doc.text(formatCurrency(invoiceData.vat), 190, y, { align: 'right' });
            y += 6;
        }

        // Service Charge (for classified ads only)
        if (invoiceData.hasClassifiedAds && invoiceData.serviceCharge > 0) {
            doc.setTextColor(...gray);
            doc.text('Service Charge:', totalsX, y);
            doc.setTextColor(...dark);
            doc.text(formatCurrency(invoiceData.serviceCharge), 190, y, { align: 'right' });
            y += 6;
        }

        y += 2;

        // Total line
        doc.setDrawColor(...primary);
        doc.setLineWidth(0.5);
        doc.line(totalsX, y, 190, y);
        y += 8;

        // Total amount
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primary);
        doc.text('TOTAL:', totalsX, y);
        doc.text(formatCurrency(invoiceData.total), 190, y, { align: 'right' });

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
