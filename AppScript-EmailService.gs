/**
 * AdSpot Media - Email Service via Google Apps Script
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create new project: "AdSpot Email Service"
 * 3. Paste this code
 * 4. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the web app URL to firebase-db.js APPS_SCRIPT_URL
 */

/**
 * Handle POST requests from website
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    Logger.log('Received request type: ' + data.type);

    switch(data.type) {
      case 'invoice_email':
        return sendInvoiceEmail(data);
      case 'booking_confirmation':
        return sendBookingConfirmation(data);
      case 'payment_confirmation':
        return sendPaymentConfirmation(data);
      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Unknown request type'
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('Error: ' + error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Send invoice email to customer
 */
function sendInvoiceEmail(data) {
  try {
    const customerEmail = data.customerEmail;
    const invoiceNumber = data.invoiceNumber;
    const quotationNumber = data.quotationNumber;
    const customerName = data.customerName;
    const totalAmount = data.totalAmount;
    const subtotal = data.subtotal;
    const commission = data.commission;
    const vat = data.vat;
    const paymentStatus = data.paymentStatus || 'pending';
    const items = data.items || [];
    const pdfUrl = data.pdfUrl || '';

    // Email subject
    const subject = `Invoice ${invoiceNumber} - AdSpot Media`;

    // Build items list for email
    let itemsList = '';
    items.forEach(function(item, index) {
      itemsList += `\n${index + 1}. ${item.newspaperName}`;
      itemsList += `\n   Type: ${item.adType === 'box' ? 'Box Advertisement' : 'Classified Advertisement'}`;
      itemsList += `\n   Publication Date: ${item.pubDate}`;
      itemsList += `\n   Amount: LKR ${formatNumber(item.price)}`;
      if (item.details) {
        if (item.adType === 'box') {
          itemsList += `\n   Size: ${item.details.columns} col × ${item.details.height} cm (${item.details.colorOption})`;
        } else if (item.details.text) {
          itemsList += `\n   Text: ${item.details.text.substring(0, 100)}${item.details.text.length > 100 ? '...' : ''}`;
        }
      }
      itemsList += '\n';
    });

    // Email body
    const body = `
Dear ${customerName},

Thank you for your payment! Your invoice is now ready.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 INVOICE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invoice Number: ${invoiceNumber}
Quotation Number: ${quotationNumber}
Invoice Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Payment Status: ${paymentStatus === 'completed' ? '✅ PAID' : '⏳ PENDING'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 AD BOOKINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 PAYMENT BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subtotal:                    LKR ${formatNumber(subtotal)}
Platform Commission (10%):   LKR ${formatNumber(commission)}
VAT (18%):                   LKR ${formatNumber(vat)}
────────────────────────────────────────
TOTAL AMOUNT:                LKR ${formatNumber(totalAmount)}
════════════════════════════════════════

${paymentStatus === 'completed' ?
'✅ Payment has been received and confirmed.' :
'⏳ Payment is pending. Please complete payment to confirm your booking.'}

${pdfUrl ? `\n📎 Download Invoice PDF: ${pdfUrl}\n` : ''}

Your advertisements will be scheduled for publication on the specified dates.
You will receive confirmation from the respective newspapers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 CONTACT US
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have any questions, please contact us:

📧 Email: finance@adspotmedia.lk
📱 Phone: +94 70 642 1998
🌐 Website: https://adspotmedia.lk

Thank you for choosing AdSpot Media!

Best regards,
AdSpot Finance Team
AdSpot Media Services
`;

    // Send to customer
    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      body: body,
      name: 'AdSpot Finance'
    });

    // Send copy to admin
    MailApp.sendEmail({
      to: 'finance@adspotmedia.lk',
      subject: `[ADMIN] ${subject}`,
      body: `Admin Copy - Invoice sent to customer\n\nCustomer: ${customerName} (${customerEmail})\n\n${body}`,
      name: 'AdSpot System'
    });

    Logger.log('✅ Invoice email sent to: ' + customerEmail);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Invoice email sent successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('❌ Error sending invoice email: ' + error);
    throw error;
  }
}

/**
 * Send booking confirmation email
 */
function sendBookingConfirmation(data) {
  try {
    const customerEmail = data.customerEmail;
    const customerName = data.customerName;
    const quotationNumber = data.quotationNumber;
    const totalAmount = data.totalAmount;
    const paymentMethod = data.paymentMethod;
    const items = data.items || [];

    const subject = `Booking Confirmation ${quotationNumber} - AdSpot Media`;

    let itemsList = '';
    items.forEach(function(item, index) {
      itemsList += `${index + 1}. ${item.newspaperName} - ${item.description}\n`;
      itemsList += `   Publication Date: ${item.pubDate}\n`;
      itemsList += `   Amount: LKR ${formatNumber(item.price)}\n\n`;
    });

    const body = `
Dear ${customerName},

Thank you for booking with AdSpot Media!

Your booking has been received and is being processed.

Quotation Number: ${quotationNumber}
Booking Date: ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 YOUR BOOKINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${itemsList}

Total Amount: LKR ${formatNumber(totalAmount)}
Payment Method: ${paymentMethod === 'bank' ? 'Bank Transfer' : 'Card Payment'}

${paymentMethod === 'bank' ?
`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 BANK TRANSFER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bank: Commercial Bank
Account Name: AdSpot Media Services
Account Number: 1234567890
Branch: Colombo

Reference: ${quotationNumber}

⚠️ IMPORTANT: Please use your quotation number as the payment reference.
` :
'✅ Payment has been processed successfully.'}

We will send you an invoice once payment is confirmed.

Questions? Contact us at finance@adspotmedia.lk or +94 70 642 1998

Best regards,
AdSpot Team
`;

    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      body: body,
      name: 'AdSpot Media'
    });

    // Notify admin
    MailApp.sendEmail({
      to: 'finance@adspotmedia.lk',
      subject: `[NEW BOOKING] ${quotationNumber}`,
      body: `New booking received from ${customerName} (${customerEmail})\n\n${body}`,
      name: 'AdSpot System'
    });

    Logger.log('✅ Booking confirmation sent to: ' + customerEmail);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Booking confirmation sent'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('❌ Error sending booking confirmation: ' + error);
    throw error;
  }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'AdSpot Email Service is running',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
