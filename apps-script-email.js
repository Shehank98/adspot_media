/**
 * Google Apps Script for AdSpot Media Email Service
 * Deploy this as a Web App and use the URL in firebase-db.js
 *
 * SETUP:
 * 1. Go to https://script.google.com
 * 2. Create new project
 * 3. Copy this code
 * 4. Deploy > New deployment > Web app
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. Copy the Web App URL to firebase-db.js
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    switch(data.type) {
      case 'booking_confirmation':
        return sendBookingConfirmation(data);

      case 'invoice_email':
        return sendInvoiceEmail(data);

      case 'payment_confirmation':
        return sendPaymentConfirmation(data);

      case 'file_upload_notification':
        return sendFileNotification(data);

      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Unknown email type'
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Send booking confirmation email to customer
 */
function sendBookingConfirmation(data) {
  const subject = `Booking Confirmed - ${data.quotationNumber} | AdSpot Media`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">AdSpot Media</h1>
        <p style="color: white; margin: 10px 0 0 0;">Newspaper Advertising Services</p>
      </div>

      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b;">Booking Confirmed!</h2>
        <p style="color: #64748b;">Dear ${data.customerName},</p>
        <p style="color: #64748b;">Thank you for your booking. Your advertisement has been successfully placed.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #667eea; margin-top: 0;">Booking Details</h3>
          <table style="width: 100%; color: #64748b;">
            <tr>
              <td style="padding: 8px 0;"><strong>Quotation Number:</strong></td>
              <td>${data.quotationNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Payment Method:</strong></td>
              <td style="text-transform: capitalize;">${data.paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
              <td><strong>LKR ${formatNumber(data.totalAmount)}</strong></td>
            </tr>
          </table>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #667eea; margin-top: 0;">Advertisement Items</h3>
          ${data.items.map(item => `
            <div style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #1e293b;">${item.newspaperName}</strong><br>
              <span style="color: #64748b;">${item.adType === 'box' ? 'Box Ad' : 'Classified Ad'} • ${item.pubDate}</span><br>
              <span style="color: #667eea; font-weight: bold;">LKR ${formatNumber(item.price)}</span>
              ${item.adFileUrl ? `<br><a href="${item.adFileUrl}" style="color: #667eea; text-decoration: underline; font-size: 13px;">📎 View Ad File</a>` : ''}
            </div>
          `).join('')}
        </div>

        ${data.paymentMethod === 'bank' ? `
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">Bank Transfer Details</h3>
          <p style="color: #92400e; margin: 5px 0;"><strong>Bank:</strong> Sampath Bank PLC</p>
          <p style="color: #92400e; margin: 5px 0;"><strong>Account Name:</strong> P S Kavishka</p>
          <p style="color: #92400e; margin: 5px 0;"><strong>Account Number:</strong> 1210 5770 0812</p>
          <p style="color: #92400e; margin: 5px 0;"><strong>Branch:</strong> Karagampitiya</p>
          <p style="color: #92400e; margin: 5px 0;"><strong>Reference:</strong> ${data.quotationNumber}</p>
          <p style="color: #92400e; margin: 10px 0 0 0;"><em>Please use the quotation number as your payment reference</em></p>
        </div>
        ` : ''}

        <p style="color: #64748b; margin-top: 30px;">If you have any questions, please contact us at adspot77@gmail.com or call +94 70 642 1998.</p>
      </div>

      <div style="background: #1e293b; padding: 20px; text-align: center;">
        <p style="color: #94a3b8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} AdSpot Media. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: data.customerEmail,
      replyTo: 'adspot77@gmail.com',
      name: 'AdSpot Media',
      subject: subject,
      htmlBody: htmlBody
    });

    Logger.log('Booking confirmation sent to: ' + data.customerEmail);
    Logger.log('Quotation Number: ' + data.quotationNumber);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Booking confirmation sent'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Failed to send booking confirmation: ' + error.toString());
    throw error;
  }
}

/**
 * Send invoice email with PDF attachment
 */
function sendInvoiceEmail(data) {
  const subject = `Invoice ${data.invoiceNumber} | AdSpot Media`;

  // Format items for the email
  let itemsHtml = '';
  if (data.items && data.items.length > 0) {
    data.items.forEach(function(item) {
      const adType = item.adType === 'box' ? 'Box Ad' : 'Classified Ad';
      const pubDate = new Date(item.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
  }

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 40px 20px;">
      <div style="max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
        <div style="padding: 40px; background: white;">

          <!-- Header -->
          <div style="margin-bottom: 30px; overflow: hidden;">
            <div style="color: #1e40af; font-size: 28px; font-weight: 600; float: left;">Invoice</div>
            <div style="font-size: 24px; font-weight: 700; color: #1e40af; float: right;">◈ AdSpot</div>
            <div style="clear: both;"></div>
          </div>

          <!-- Invoice Details -->
          <table style="width: 100%; margin-bottom: 25px; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280; width: 140px;">Invoice number</td>
              <td style="font-weight: 500;">${data.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Date of issue</td>
              <td style="font-weight: 500;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Reference</td>
              <td style="font-weight: 500;">${data.quotationNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Payment method</td>
              <td style="font-weight: 500;"><strong>${data.paymentMethod || 'VISA'}</strong></td>
            </tr>
          </table>

          <!-- Company & Customer Info -->
          <table style="width: 100%; margin-bottom: 30px; font-size: 14px;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">AdSpot Media</div>
                <div style="color: #6b7280; line-height: 1.6;">
                  130 High Level Road<br>
                  Colombo 06<br>
                  Sri Lanka<br>
                  adspot77@gmail.com
                </div>
              </td>
              <td style="vertical-align: top; width: 50%;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">Bill to</div>
                <div style="color: #6b7280; line-height: 1.6;">
                  ${data.customerName}<br>
                  ${data.customerEmail}
                </div>
              </td>
            </tr>
          </table>

          <!-- Payment Status Box -->
          <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
            <div style="margin-bottom: 20px;">
              <span style="display: inline-block; background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; margin-right: 12px;">✓ Paid</span>
              <span style="color: #6b7280; font-size: 14px;">Thank you for your payment</span>
            </div>
            <div style="padding: 16px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px;">
              <table style="width: 100%;">
                <tr>
                  <td style="color: #6b7280; font-size: 14px;">Amount paid</td>
                  <td style="color: #1f2937; font-size: 24px; font-weight: 700; text-align: right;">Rs. ${formatNumber(data.totalAmount)}</td>
                </tr>
              </table>
            </div>
            ${data.pdfUrl ? `
            <a href="${data.pdfUrl}" style="display: inline-block; background: #1e40af; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">
              ⬇ Download Invoice PDF
            </a>
            ` : ''}
          </div>

          <!-- Items Table -->
          <table style="width: 100%; margin-bottom: 20px; font-size: 14px; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 12px 0; text-align: left; color: #6b7280; font-weight: 500; font-size: 13px;">Description</th>
                <th style="padding: 12px 0; text-align: center; color: #6b7280; font-weight: 500; font-size: 13px;">Qty</th>
                <th style="padding: 12px 0; text-align: right; color: #6b7280; font-weight: 500; font-size: 13px;">Unit price</th>
                <th style="padding: 12px 0; text-align: right; color: #6b7280; font-weight: 500; font-size: 13px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals -->
          <table style="width: 100%; margin-bottom: 40px; font-size: 14px;">
            <tr>
              <td style="width: 60%;"></td>
              <td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">Subtotal</td>
              <td style="text-align: right;">Rs. ${formatNumber(data.subtotal)}</td>
            </tr>
            ${data.commission && data.commission > 0 ? `
            <tr>
              <td></td>
              <td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">Platform Commission (10%)</td>
              <td style="text-align: right;">Rs. ${formatNumber(data.commission)}</td>
            </tr>
            ` : ''}
            ${data.vat && data.vat > 0 ? `
            <tr>
              <td></td>
              <td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">VAT (18%)</td>
              <td style="text-align: right;">Rs. ${formatNumber(data.vat)}</td>
            </tr>
            ` : ''}
            ${data.serviceCharge && data.serviceCharge > 0 ? `
            <tr>
              <td></td>
              <td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">Service Charge</td>
              <td style="text-align: right;">Rs. ${formatNumber(data.serviceCharge)}</td>
            </tr>
            ` : ''}
            ${data.promoDiscount && data.promoDiscount > 0 ? `
            <tr>
              <td></td>
              <td style="padding: 8px 0; color: #059669; text-align: right; padding-right: 40px;">Discount (${data.promoCode})</td>
              <td style="text-align: right; color: #059669;">-Rs. ${formatNumber(data.promoDiscount)}</td>
            </tr>
            ` : ''}
            <tr>
              <td></td>
              <td style="padding: 8px 0; color: #6b7280; text-align: right; padding-right: 40px;">Total</td>
              <td style="text-align: right;">Rs. ${formatNumber(data.totalAmount)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding: 12px 0; color: #10b981; text-align: right; padding-right: 40px; border-top: 2px solid #10b981; font-weight: 700; padding-top: 12px;">Amount paid ✅</td>
              <td style="text-align: right; color: #10b981; border-top: 2px solid #10b981; font-weight: 700; padding-top: 12px;">Rs. ${formatNumber(data.totalAmount)}</td>
            </tr>
          </table>

          <!-- Footer -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 13px; color: #6b7280;">
            <p style="margin: 0 0 8px 0;">AdSpot Media Services</p>
            <p style="margin: 0;">Phone: 070 161 1411 / 070 642 1998 | Email: adspot77@gmail.com</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Prepare email options
  const emailOptions = {
    to: data.customerEmail,
    replyTo: 'adspot77@gmail.com',
    name: 'AdSpot Finance',
    subject: subject,
    htmlBody: htmlBody
  };

  // Attach PDF if provided (supports URL or base64)
  if (data.pdfUrl) {
    try {
      const pdfBlob = UrlFetchApp.fetch(data.pdfUrl).getBlob();
      pdfBlob.setName(`Invoice_${data.invoiceNumber}.pdf`);
      emailOptions.attachments = [pdfBlob];
      Logger.log('PDF attached from URL: ' + data.pdfUrl);
    } catch (error) {
      Logger.log('Failed to attach PDF from URL: ' + error.toString());
    }
  } else if (data.pdfBase64) {
    try {
      const pdfData = Utilities.base64Decode(data.pdfBase64);
      const pdfBlob = Utilities.newBlob(pdfData, 'application/pdf', `Invoice_${data.invoiceNumber}.pdf`);
      emailOptions.attachments = [pdfBlob];
      Logger.log('PDF attached from base64');
    } catch (error) {
      Logger.log('Failed to attach PDF from base64: ' + error.toString());
    }
  }

  try {
    MailApp.sendEmail(emailOptions);
    Logger.log('Invoice email sent successfully to: ' + data.customerEmail);
  } catch (error) {
    Logger.log('Failed to send invoice email: ' + error.toString());
    throw error;
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Invoice email sent'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send payment confirmation email to customer
 */
function sendPaymentConfirmation(data) {
  const subject = `Payment Received - ${data.quotationNumber} | AdSpot Media`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">✓ Payment Received</h1>
        <p style="color: white; margin: 10px 0 0 0;">Thank you for your payment!</p>
      </div>

      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b;">Payment Confirmed</h2>
        <p style="color: #64748b;">Dear ${data.customerName},</p>
        <p style="color: #64748b;">We have successfully received your payment. Your ads will be processed and published as scheduled.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #10b981; margin-top: 0;">Payment Details</h3>
          <table style="width: 100%; color: #64748b;">
            <tr>
              <td style="padding: 8px 0;"><strong>Quotation Number:</strong></td>
              <td>${data.quotationNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Amount Paid:</strong></td>
              <td><strong style="color: #10b981;">LKR ${formatNumber(data.amount)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Payment Date:</strong></td>
              <td>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            ${data.paymentReference ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Reference:</strong></td>
              <td>${data.paymentReference}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
          <p style="color: #166534; margin: 0;"><strong>✓ Your advertisement is now confirmed</strong></p>
          <p style="color: #166534; margin: 8px 0 0 0;">Your invoice and receipt will be sent separately.</p>
        </div>

        <p style="color: #64748b; margin-top: 30px;">If you have any questions, please contact us at adspot77@gmail.com or call +94 70 642 1998.</p>
      </div>

      <div style="background: #1e293b; padding: 20px; text-align: center;">
        <p style="color: #94a3b8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} AdSpot Media. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: data.customerEmail,
      replyTo: 'adspot77@gmail.com',
      name: 'AdSpot Media',
      subject: subject,
      htmlBody: htmlBody
    });

    Logger.log('Payment confirmation sent to: ' + data.customerEmail);
    Logger.log('Quotation Number: ' + data.quotationNumber);
    Logger.log('Amount: ' + data.amount);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Payment confirmation sent'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Failed to send payment confirmation: ' + error.toString());
    throw error;
  }
}

/**
 * Send file upload notification to admin
 */
function sendFileNotification(data) {
  const adminEmail = 'adspot77@gmail.com'; // Change to your admin email
  const subject = `New Ad File Uploaded - ${data.bookingId} | AdSpot Admin`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; padding: 20px;">
        <h2 style="color: white; margin: 0;">New Ad File Uploaded</h2>
      </div>

      <div style="padding: 30px; background: #f8fafc;">
        <p><strong>Customer:</strong> ${data.customerName}</p>
        <p><strong>Email:</strong> ${data.customerEmail}</p>
        <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        <p><strong>Quotation Number:</strong> ${data.quotationNumber}</p>

        <h3>Items:</h3>
        <ul>
          ${data.items.map(item => `
            <li>${item.newspaperName} - ${item.adType} - ${item.pubDate}</li>
          `).join('')}
        </ul>

        <p><a href="${data.fileUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Download Ad File</a></p>

        <p style="margin-top: 20px; color: #64748b;">Please review the uploaded file and process the order.</p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: adminEmail,
    replyTo: data.customerEmail,
    name: 'AdSpot System',
    subject: subject,
    htmlBody: htmlBody
  });

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'File notification sent'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
