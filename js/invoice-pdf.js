/**
 * Invoice PDF Generator for AdSpot Media
 * Generates PDF invoices and uploads to Firebase Storage
 */

/**
 * Generate invoice PDF and upload to Firebase Storage
 */
async function generateInvoicePDF(invoiceData, bookingData) {
    try {
        // Check if jsPDF is loaded
        if (typeof jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded');
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        // Colors
        const primaryColor = [102, 126, 234]; // #667eea
        const textColor = [30, 41, 59]; // #1e293b
        const secondaryColor = [100, 116, 139]; // #64748b

        let yPos = 20;

        // Header - Company Name
        doc.setFontSize(24);
        doc.setTextColor(...primaryColor);
        doc.text('AdSpot Media', 20, yPos);

        // Header - Invoice Title
        doc.setFontSize(20);
        doc.setTextColor(...textColor);
        doc.text('INVOICE', 150, yPos);

        yPos += 15;

        // Company Details
        doc.setFontSize(10);
        doc.setTextColor(...secondaryColor);
        doc.text('Newspaper Advertising Services', 20, yPos);
        yPos += 5;
        doc.text('Email: finance@adspotmedia.lk', 20, yPos);
        yPos += 5;
        doc.text('Phone: +94 70 642 1998', 20, yPos);

        // Invoice Details (right side)
        yPos = 35;
        doc.setFontSize(10);
        doc.setTextColor(...textColor);
        doc.text(`Invoice No: ${invoiceData.invoiceNumber}`, 150, yPos);
        yPos += 6;
        doc.text(`Quotation No: ${invoiceData.quotationNumber}`, 150, yPos);
        yPos += 6;
        doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 150, yPos);

        yPos = 60;

        // Customer Details
        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text('BILL TO:', 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(...textColor);
        doc.text(bookingData.customerName, 20, yPos);
        yPos += 5;
        if (bookingData.customerCompany) {
            doc.text(bookingData.customerCompany, 20, yPos);
            yPos += 5;
        }
        doc.text(bookingData.customerEmail, 20, yPos);
        yPos += 5;
        doc.text(bookingData.customerPhone || '', 20, yPos);

        yPos += 15;

        // Table Header
        doc.setFillColor(...primaryColor);
        doc.rect(20, yPos, 170, 10, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('Description', 25, yPos + 7);
        doc.text('Date', 110, yPos + 7);
        doc.text('Amount (LKR)', 155, yPos + 7);

        yPos += 15;

        // Table Rows - Items
        doc.setTextColor(...textColor);
        doc.setFontSize(9);

        bookingData.items.forEach((item, index) => {
            // Item name
            doc.text(item.newspaperName, 25, yPos);

            // Ad type and details
            yPos += 5;
            const adTypeText = item.adType === 'box' ? 'Box Advertisement' : 'Classified Advertisement';
            doc.setTextColor(...secondaryColor);
            doc.text(adTypeText, 25, yPos);

            // Details
            if (item.details) {
                if (item.adType === 'box') {
                    yPos += 4;
                    doc.text(`${item.details.columns} col × ${item.details.height} cm (${item.details.colorOption})`, 25, yPos);
                } else if (item.details.text) {
                    yPos += 4;
                    const wrappedText = doc.splitTextToSize(item.details.text, 75);
                    doc.text(wrappedText, 25, yPos);
                    yPos += (wrappedText.length - 1) * 4;
                }
            }

            // Date
            yPos -= 9;
            doc.setTextColor(...textColor);
            doc.text(item.pubDate, 110, yPos + 9);

            // Amount
            doc.text(formatCurrency(item.price), 155, yPos + 9, { align: 'right' });

            yPos += 15;

            // Add page break if needed
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
        });

        // Subtotal section
        yPos += 5;
        doc.setDrawColor(...secondaryColor);
        doc.line(110, yPos, 190, yPos);
        yPos += 8;

        // Subtotal
        doc.setTextColor(...secondaryColor);
        doc.text('Subtotal:', 110, yPos);
        doc.setTextColor(...textColor);
        doc.text(formatCurrency(invoiceData.subtotal), 180, yPos, { align: 'right' });
        yPos += 6;

        // Show commission/VAT for box ads OR service charge for classified ads
        if (invoiceData.hasBoxAds && invoiceData.commission > 0) {
            // Box ads: Show commission
            doc.setTextColor(...secondaryColor);
            doc.text('Platform Commission (10%):', 110, yPos);
            doc.setTextColor(...textColor);
            doc.text(formatCurrency(invoiceData.commission), 180, yPos, { align: 'right' });
            yPos += 6;
        }

        if (invoiceData.hasBoxAds && invoiceData.vat > 0) {
            // Box ads: Show VAT
            doc.setTextColor(...secondaryColor);
            doc.text('VAT (18%):', 110, yPos);
            doc.setTextColor(...textColor);
            doc.text(formatCurrency(invoiceData.vat), 180, yPos, { align: 'right' });
            yPos += 6;
        }

        if (invoiceData.hasClassifiedAds && invoiceData.serviceCharge > 0) {
            // Classified ads: Show service charge
            doc.setTextColor(...secondaryColor);
            doc.text('Service Charge:', 110, yPos);
            doc.setTextColor(...textColor);
            doc.text(formatCurrency(invoiceData.serviceCharge), 180, yPos, { align: 'right' });
            yPos += 6;
        }

        yPos += 2; // Extra spacing before total

        // Total
        doc.setLineWidth(0.5);
        doc.line(110, yPos, 190, yPos);
        yPos += 8;

        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text('TOTAL:', 110, yPos);
        doc.setFontSize(14);
        doc.text(formatCurrency(invoiceData.total), 180, yPos, { align: 'right' });

        // Footer - Payment Status
        yPos += 15;
        doc.setFontSize(10);
        doc.setTextColor(...secondaryColor);
        const paymentStatus = bookingData.paymentStatus === 'completed' ? 'PAID' : 'PENDING';
        const statusColor = bookingData.paymentStatus === 'completed' ? [22, 101, 52] : [153, 27, 27];
        doc.setTextColor(...statusColor);
        doc.text(`Payment Status: ${paymentStatus}`, 20, yPos);

        // Footer - Payment Method
        if (bookingData.paymentMethod) {
            yPos += 6;
            doc.setTextColor(...secondaryColor);
            const methodText = bookingData.paymentMethod === 'bank' ? 'Bank Transfer' : 'Card Payment';
            doc.text(`Payment Method: ${methodText}`, 20, yPos);
        }

        // Footer Note
        yPos = 280;
        doc.setFontSize(8);
        doc.setTextColor(...secondaryColor);
        doc.text('Thank you for your business with AdSpot Media!', 105, yPos, { align: 'center' });
        yPos += 4;
        doc.text('For inquiries, contact: finance@adspotmedia.lk', 105, yPos, { align: 'center' });

        // Generate PDF as blob
        const pdfBlob = doc.output('blob');

        // Upload to Firebase Storage
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

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    return 'LKR ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Export function
window.generateInvoicePDF = generateInvoicePDF;

console.log('✅ Invoice PDF generator loaded');
