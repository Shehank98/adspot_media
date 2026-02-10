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
  const subject = `Invoice ${data.invoiceNumber} | AdSpot Finance`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">AdSpot Finance</h1>
        <p style="color: white; margin: 10px 0 0 0;">Invoice & Payment Services</p>
      </div>

      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b;">Invoice Ready</h2>
        <p style="color: #64748b;">Dear ${data.customerName},</p>
        <p style="color: #64748b;">Your invoice has been generated and is attached to this email.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #667eea; margin-top: 0;">Invoice Summary</h3>
          <table style="width: 100%; color: #64748b;">
            <tr>
              <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
              <td>${data.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Quotation Number:</strong></td>
              <td>${data.quotationNumber}</td>
            </tr>
            <tr style="border-top: 2px solid #e2e8f0;">
              <td style="padding: 8px 0;"><strong>Subtotal:</strong></td>
              <td>LKR ${formatNumber(data.subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Commission (10%):</strong></td>
              <td>LKR ${formatNumber(data.commission)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>VAT (18%):</strong></td>
              <td>LKR ${formatNumber(data.vat)}</td>
            </tr>
            <tr style="border-top: 2px solid #667eea;">
              <td style="padding: 8px 0;"><strong style="color: #667eea; font-size: 16px;">TOTAL:</strong></td>
              <td><strong style="color: #667eea; font-size: 16px;">LKR ${formatNumber(data.totalAmount)}</strong></td>
            </tr>
          </table>
        </div>

        ${data.paymentStatus === 'completed' ? `
        <div style="background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
          <p style="color: #166534; margin: 0;"><strong>✓ Payment Received</strong></p>
          <p style="color: #166534; margin: 5px 0 0 0;">Thank you for your payment!</p>
        </div>
        ` : `
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0;"><strong>Payment Pending</strong></p>
          <p style="color: #92400e; margin: 5px 0 0 0;">Please send payment to: adspot77@gmail.com</p>
        </div>
        `}

        <p style="color: #64748b; margin-top: 30px;">For any billing inquiries, contact us at adspot77@gmail.com or call +94 70 642 1998.</p>
      </div>

      <div style="background: #1e293b; padding: 20px; text-align: center;">
        <p style="color: #94a3b8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} AdSpot Media. All rights reserved.</p>
      </div>
    </div>
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
