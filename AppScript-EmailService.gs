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
 * Send invoice email to customer with HTML template
 */
function sendInvoiceEmail(data) {
  try {
    const customerEmail = data.customerEmail;
    const invoiceNumber = data.invoiceNumber;
    const quotationNumber = data.quotationNumber;
    const customerName = data.customerName;
    const totalAmount = data.totalAmount;
    const subtotal = data.subtotal;
    const commission = data.commission || 0;
    const vat = data.vat || 0;
    const serviceCharge = data.serviceCharge || 0;
    const promoCode = data.promoCode || '';
    const promoDiscount = data.promoDiscount || 0;
    const paymentMethod = data.paymentMethod || 'Card';
    const paymentStatus = data.paymentStatus || 'pending';
    const items = data.items || [];
    const pdfUrl = data.pdfUrl || '';

    // Email subject
    const subject = `Invoice ${invoiceNumber} | AdSpot Media`;

    // Build items HTML
    var itemsHtml = '';
    items.forEach(function(item) {
      var adType = item.adType === 'box' ? 'Box Ad' : 'Classified Ad';
      var pubDate = new Date(item.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      itemsHtml += '<tr>' +
        '<td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #374151;">' +
        item.newspaperName + ' - ' + adType + '<br>' +
        '<span style="color: #9ca3af; font-size: 13px;">Publication: ' + pubDate + '</span>' +
        '</td>' +
        '<td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: center;">1</td>' +
        '<td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: right;">Rs. ' + formatNumber(item.price) + '</td>' +
        '<td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: right; font-weight: 500;">Rs. ' + formatNumber(item.price) + '</td>' +
        '</tr>';
    });

    // Build HTML body (matching apps-script-email.js design)
    var htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
      '<body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 40px 20px;">' +
      '<div style="max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">' +
      '<div style="padding: 40px; background: white;">' +
      '<div style="margin-bottom: 30px; overflow: hidden;"><div style="color: #1e40af; font-size: 28px; font-weight: 600; float: left;">Invoice</div>' +
      '<div style="font-size: 24px; font-weight: 700; color: #1e40af; float: right;">◈ AdSpot</div><div style="clear: both;"></div></div>' +
      '<table style="width: 100%; margin-bottom: 25px; font-size: 14px;"><tr><td style="padding: 4px 0; color: #6b7280; width: 140px;">Invoice number</td>' +
      '<td style="font-weight: 500;">' + invoiceNumber + '</td></tr><tr><td style="padding: 4px 0; color: #6b7280;">Date of issue</td>' +
      '<td style="font-weight: 500;">' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '</td></tr>' +
      '<tr><td style="padding: 4px 0; color: #6b7280;">Reference</td><td style="font-weight: 500;">' + quotationNumber + '</td></tr>' +
      '<tr><td style="padding: 4px 0; color: #6b7280;">Payment method</td><td style="font-weight: 500;"><strong>' + paymentMethod + '</strong></td></tr></table>' +
      '<table style="width: 100%; margin-bottom: 30px; font-size: 14px;"><tr><td style="vertical-align: top; width: 50%;"><div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">AdSpot Media</div>' +
      '<div style="color: #6b7280; line-height: 1.6;">130 High Level Road<br>Colombo 06<br>Sri Lanka<br>adspot77@gmail.com</div></td>' +
      '<td style="vertical-align: top; width: 50%;"><div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">Bill to</div>' +
      '<div style="color: #6b7280; line-height: 1.6;">' + customerName + '<br>' + customerEmail + '</div></td></tr></table>' +
      '<div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 24px; margin-bottom: 30px;">' +
      '<div style="margin-bottom: 20px;"><span style="display: inline-block; background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; margin-right: 12px;">✓ Paid</span>' +
      '<span style="color: #6b7280; font-size: 14px;">Thank you for your payment</span></div>' +
      '<div style="padding: 16px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px;"><table style="width: 100%;"><tr><td style="color: #6b7280; font-size: 14px;">Amount paid</td>' +
      '<td style="color: #1f2937; font-size: 24px; font-weight: 700; text-align: right;">Rs. ' + formatNumber(totalAmount) + '</td></tr></table></div>' +
      '<a href="' + (pdfUrl || '#') + '" style="display: inline-block; background: #1e40af; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">' +
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
      'Download Invoice PDF</a>' +
      '</div><table style="width: 100%; margin-bottom: 20px; font-size: 14px; border-collapse: collapse;"><thead><tr style="border-bottom: 2px solid #e5e7eb;">' +
      '<th style="padding: 12px 0; text-align: left; color: #6b7280; font-weight: 500; font-size: 13px;">Description</th>' +
      '<th style="padding: 12px 0; text-align: center; color: #6b7280; font-weight: 500; font-size: 13px;">Qty</th>' +
      '<th style="padding: 12px 0; text-align: right; color: #6b7280; font-weight: 500; font-size: 13px;">Unit price</th>' +
      '<th style="padding: 12px 0; text-align: right; color: #6b7280; font-weight: 500; font-size: 13px;">Amount</th></tr></thead><tbody>' +
      itemsHtml + '</tbody></table><table style="width: 100%; margin-bottom: 40px; font-size: 14px;"><tr><td style="width: 60%;"></td>' +
      '<td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">Subtotal</td><td style="text-align: right;">Rs. ' + formatNumber(subtotal) + '</td></tr>' +
      (commission > 0 ? '<tr><td></td><td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">Platform Commission (10%)</td><td style="text-align: right;">Rs. ' + formatNumber(commission) + '</td></tr>' : '') +
      (vat > 0 ? '<tr><td></td><td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">VAT (18%)</td><td style="text-align: right;">Rs. ' + formatNumber(vat) + '</td></tr>' : '') +
      (serviceCharge > 0 ? '<tr><td></td><td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">Service Charge</td><td style="text-align: right;">Rs. ' + formatNumber(serviceCharge) + '</td></tr>' : '') +
      (promoDiscount > 0 ? '<tr><td></td><td style="padding: 8px 0; color: #059669; text-align: right; padding-right: 40px;">Discount (' + promoCode + ')</td><td style="text-align: right; color: #059669;">-Rs. ' + formatNumber(promoDiscount) + '</td></tr>' : '') +
      '<tr><td></td><td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">Total</td><td style="text-align: right;">Rs. ' + formatNumber(totalAmount) + '</td></tr>' +
      '<tr><td></td><td style="padding: 12px 0; color: #10b981; text-align: right; padding-right: 40px; border-top: 2px solid #10b981; font-weight: 700; padding-top: 12px;">Amount paid ✅</td>' +
      '<td style="text-align: right; color: #10b981; border-top: 2px solid #10b981; font-weight: 700; padding-top: 12px;">Rs. ' + formatNumber(totalAmount) + '</td></tr></table>' +
      '<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 13px; color: #6b7280;"><p style="margin: 0 0 8px 0;">AdSpot Media Services</p>' +
      '<p style="margin: 0;">Phone: 070 161 1411 / 070 642 1998 | Email: adspot77@gmail.com</p></div></div></div></body></html>';

    // Send to customer
    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: 'AdSpot Media'
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
