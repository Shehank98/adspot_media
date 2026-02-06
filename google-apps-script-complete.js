/**
 * AdSpot Complete Google Apps Script
 * Handles: Email Sending + PDF Storage in Google Drive
 *
 * SETUP:
 * 1. Go to https://script.google.com
 * 2. Create new project: "AdSpot Backend"
 * 3. Paste this entire code
 * 4. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL
 * 6. Update GOOGLE_APPS_CONFIG.SCRIPT_URL in supabase.js
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  ADMIN_EMAIL: 'adspot77@gmail.com',
  COMPANY_NAME: 'AdSpot Media Services',
  COMPANY_PHONE: '070 161 1411 / 070 642 1998',
  COMPANY_ADDRESS: '130 High Level Road, Colombo 06, Sri Lanka',
  PDF_FOLDER_NAME: 'AdSpot Invoices',

  // Bank Details
  BANK_NAME: 'Sampath Bank PLC',
  BANK_ACCOUNT_NAME: 'P S Kavishka',
  BANK_ACCOUNT_NUMBER: '1210 5770 0812',
  BANK_BRANCH: 'Karagampitiya'
};

// ============================================
// MAIN REQUEST HANDLER
// ============================================
function doPost(e) {
  try {
    let data;
    let action;

    // Handle different content types
    if (e.postData && e.postData.type === 'application/x-www-form-urlencoded') {
      // Form submission or sendBeacon with FormData
      action = e.parameter.action;
      const payload = e.parameter.payload;
      data = payload ? JSON.parse(payload) : e.parameter;
      data.action = action;
    } else if (e.postData && e.postData.contents) {
      // Regular JSON POST
      data = JSON.parse(e.postData.contents);
      action = data.action;
    } else if (e.parameter && e.parameter.action) {
      // GET-style parameters
      action = e.parameter.action;
      data = e.parameter.data ? JSON.parse(e.parameter.data) : e.parameter;
      data.action = action;
    } else {
      return jsonResponse(false, 'No data received');
    }

    switch (action) {
      // Email Actions
      case 'sendAdminNotification':
        return sendAdminNotification(data);
      case 'sendQuotation':
        return sendQuotationEmail(data);
      case 'sendInvoice':
        return sendInvoiceEmail(data);
      case 'sendPaymentConfirmation':
        return sendPaymentConfirmation(data);
      case 'sendContactForm':
        return sendContactFormEmail(data);

      // PDF Storage Actions
      case 'uploadPdf':
        return uploadPdfToDrive(data);
      case 'getPdf':
        return getPdfFromDrive(data);
      case 'listPdfs':
        return listPdfsFromDrive(data);

      default:
        return jsonResponse(false, 'Unknown action: ' + action);
    }
  } catch (error) {
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'AdSpot API is running',
    version: '2.0',
    endpoints: ['sendAdminNotification', 'sendQuotation', 'sendInvoice', 'sendPaymentConfirmation', 'uploadPdf', 'getPdf']
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// EMAIL FUNCTIONS
// ============================================

/**
 * Send notification to admin when new order received
 */
function sendAdminNotification(data) {
  const { quotation_number, customer_name, customer_email, customer_phone, newspaper_name, total_amount, ad_type, items } = data;

  const subject = `🔔 New Ad Booking: ${quotation_number}`;

  const itemsList = items ? items.map(item => {
    // Check if this is a classified ad with text
    const classifiedText = item.details?.text || item.adText || '';
    const adTypeDisplay = item.adType === 'classified' ? '📝 Classified' : '📦 Box Ad';

    let textSection = '';
    if (classifiedText) {
      textSection = `
        <tr style="background: #fffbeb;">
          <td colspan="4" style="padding: 12px;">
            <div style="background: #fef3c7; border-radius: 8px; padding: 12px; border-left: 4px solid #f59e0b;">
              <strong style="color: #92400e;">📝 Ad Text:</strong>
              <p style="color: #1f2937; margin: 8px 0 0 0; white-space: pre-wrap;">${classifiedText}</p>
            </div>
          </td>
        </tr>
      `;
    }

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px;">${item.newspaperName || 'N/A'}</td>
        <td style="padding: 12px;">${adTypeDisplay}</td>
        <td style="padding: 12px;">${item.pubDate || 'N/A'}</td>
        <td style="padding: 12px; text-align: right; font-weight: 600;">Rs. ${(item.price || 0).toLocaleString()}</td>
      </tr>
      ${textSection}
    `;
  }).join('') : '';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f5f7fa; }
      </style>
    </head>
    <body>
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">

              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 12px;">🔔</div>
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">New Order Received!</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">${quotation_number}</p>
                </td>
              </tr>

              <!-- Customer Info -->
              <tr>
                <td style="padding: 30px;">
                  <div style="background: #eff6ff; border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6;">
                    <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px;">👤 Customer Details</h3>
                    <table width="100%">
                      <tr><td style="color: #6b7280; padding: 4px 0;">Name:</td><td style="font-weight: 600;">${customer_name}</td></tr>
                      <tr><td style="color: #6b7280; padding: 4px 0;">Email:</td><td style="font-weight: 600;">${customer_email}</td></tr>
                      <tr><td style="color: #6b7280; padding: 4px 0;">Phone:</td><td style="font-weight: 600;">${customer_phone}</td></tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Order Details -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <div style="background: #f9fafb; border-radius: 12px; padding: 24px;">
                    <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">📋 Order Details</h3>
                    <table width="100%" style="border-collapse: collapse;">
                      <thead>
                        <tr style="background: #1e40af; color: white;">
                          <th style="padding: 12px; text-align: left; border-radius: 8px 0 0 0;">Newspaper</th>
                          <th style="padding: 12px; text-align: left;">Type</th>
                          <th style="padding: 12px; text-align: left;">Date</th>
                          <th style="padding: 12px; text-align: right; border-radius: 0 8px 0 0;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsList}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Total -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 12px; padding: 24px; text-align: center;">
                    <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 8px;">TOTAL AMOUNT</div>
                    <div style="color: #ffffff; font-size: 36px; font-weight: 800;">Rs. ${parseFloat(total_amount || 0).toLocaleString()}</div>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    Received on ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: subject,
      htmlBody: htmlBody
    });
    return jsonResponse(true, 'Admin notification sent');
  } catch (error) {
    return jsonResponse(false, 'Failed to send: ' + error.message);
  }
}

/**
 * Send quotation/confirmation email to customer
 */
function sendQuotationEmail(data) {
  const { customer_email, customer_name, quotation_number, items, total_amount } = data;

  const subject = `📋 Your Quotation ${quotation_number} - AdSpot Media`;

  const itemsHtml = items ? items.map((item, i) => {
    const classifiedText = item.details?.text || item.adText || '';
    const adTypeIcon = item.adType === 'classified' ? '📝 Classified' : '📦 Box Ad';

    let textSection = '';
    if (classifiedText) {
      textSection = `
        <div style="background: #fffbeb; border-radius: 8px; padding: 12px; margin-top: 12px; border-left: 4px solid #f59e0b;">
          <strong style="color: #92400e; font-size: 12px;">AD TEXT:</strong>
          <p style="color: #1f2937; margin: 6px 0 0 0; font-size: 14px; white-space: pre-wrap;">${classifiedText}</p>
        </div>
      `;
    }

    return `
      <div style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'}; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="color: #1e40af; font-weight: 700; font-size: 16px;">${item.newspaperName || 'Newspaper'}</div>
            <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
              📅 ${item.pubDate || 'TBD'} • ${adTypeIcon}
            </div>
          </div>
          <div style="background: #10b981; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 700;">
            Rs. ${(item.price || 0).toLocaleString()}
          </div>
        </div>
        ${textSection}
      </div>
    `;
  }).join('') : '';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f5f7fa; }</style>
    </head>
    <body>
      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f5f7fa 0%, #e8eef3 100%); padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 20px; box-shadow: 0 20px 50px rgba(30, 64, 175, 0.2); overflow: hidden;">

              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%); padding: 50px 40px; text-align: center;">
                  <div style="background: rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.2);">
                    <div style="font-size: 56px; margin-bottom: 12px;">📋</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800;">Your Quotation</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 18px;">${quotation_number}</p>
                  </div>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 40px 40px 20px 40px;">
                  <div style="background: #eff6ff; border-radius: 16px; padding: 30px; border-left: 5px solid #1e40af;">
                    <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 24px;">Dear ${customer_name} 👋</h2>
                    <p style="color: #6b7280; margin: 0; font-size: 15px; line-height: 1.6;">
                      Thank you for your interest! Here's your quotation. This quote is valid for 7 days.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Items -->
              <tr>
                <td style="padding: 20px 40px;">
                  <div style="background: #f9fafb; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <div style="background: #1e40af; color: white; padding: 16px 20px; font-weight: 700; font-size: 16px;">
                      📦 Services
                    </div>
                    ${itemsHtml}
                  </div>
                </td>
              </tr>

              <!-- Total -->
              <tr>
                <td style="padding: 20px 40px;">
                  <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 16px; padding: 30px; text-align: center; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);">
                    <div style="color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Total Amount</div>
                    <div style="color: #ffffff; font-size: 42px; font-weight: 900;">Rs. ${parseFloat(total_amount || 0).toLocaleString()}</div>
                  </div>
                </td>
              </tr>

              <!-- Bank Details -->
              <tr>
                <td style="padding: 20px 40px;">
                  <div style="background: #fffbeb; border-radius: 16px; padding: 24px; border: 2px solid #f59e0b;">
                    <div style="text-align: center; margin-bottom: 16px;">
                      <span style="font-size: 32px;">🏦</span>
                      <h3 style="color: #92400e; margin: 8px 0 0 0; font-size: 18px;">Bank Transfer Details</h3>
                    </div>
                    <table width="100%" style="font-size: 14px;">
                      <tr><td style="color: #6b7280; padding: 6px 0;">Bank:</td><td style="font-weight: 600; text-align: right;">${CONFIG.BANK_NAME}</td></tr>
                      <tr><td style="color: #6b7280; padding: 6px 0;">Account Name:</td><td style="font-weight: 600; text-align: right;">${CONFIG.BANK_ACCOUNT_NAME}</td></tr>
                      <tr><td style="color: #6b7280; padding: 6px 0;">Account Number:</td><td style="font-weight: 700; text-align: right; color: #1e40af; font-size: 16px;">${CONFIG.BANK_ACCOUNT_NUMBER}</td></tr>
                      <tr><td style="color: #6b7280; padding: 6px 0;">Branch:</td><td style="font-weight: 600; text-align: right;">${CONFIG.BANK_BRANCH}</td></tr>
                      <tr><td style="color: #6b7280; padding: 6px 0;">Reference:</td><td style="font-weight: 700; text-align: right; color: #dc2626;">${quotation_number}</td></tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding: 20px 40px 40px 40px;">
                  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 16px; padding: 30px; text-align: center;">
                    <p style="color: #ffffff; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Questions? Contact us!</p>
                    <a href="https://wa.me/94706421998" style="display: inline-block; padding: 14px 32px; background: #25D366; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
                      💬 WhatsApp Us
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <div style="color: #1e40af; font-size: 18px; font-weight: 700; margin-bottom: 8px;">${CONFIG.COMPANY_NAME}</div>
                  <div style="color: #6b7280; font-size: 13px; line-height: 1.8;">
                    📞 ${CONFIG.COMPANY_PHONE}<br>
                    📧 ${CONFIG.ADMIN_EMAIL}<br>
                    📍 ${CONFIG.COMPANY_ADDRESS}
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    MailApp.sendEmail({
      to: customer_email,
      subject: subject,
      htmlBody: htmlBody,
      replyTo: CONFIG.ADMIN_EMAIL
    });
    return jsonResponse(true, 'Quotation email sent to ' + customer_email);
  } catch (error) {
    return jsonResponse(false, 'Failed to send: ' + error.message);
  }
}

/**
 * Send invoice email after payment confirmed
 */
function sendInvoiceEmail(data) {
  const { customer_email, customer_name, quotation_number, invoice_number, items, total_amount } = data;

  const subject = `✅ Invoice ${invoice_number} - Payment Confirmed - AdSpot Media`;

  const itemsHtml = items ? items.map((item, i) => `
    <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb;">${item.newspaperName || 'N/A'}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb;">${item.adType === 'box' ? 'Box Ad' : 'Classified'}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb;">${item.pubDate || 'TBD'}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">Rs. ${(item.price || 0).toLocaleString()}</td>
    </tr>
  `).join('') : '';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f5f7fa; }</style>
    </head>
    <body>
      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f5f7fa 0%, #e8eef3 100%); padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 20px; box-shadow: 0 20px 50px rgba(16, 185, 129, 0.2); overflow: hidden;">

              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); padding: 50px 40px; text-align: center;">
                  <div style="background: rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.2);">
                    <div style="font-size: 56px; margin-bottom: 12px;">✅</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800;">Payment Confirmed!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">Invoice: ${invoice_number}</p>
                  </div>
                </td>
              </tr>

              <!-- Success Message -->
              <tr>
                <td style="padding: 40px 40px 20px 40px;">
                  <div style="background: #ecfdf5; border-radius: 16px; padding: 30px; border-left: 5px solid #10b981; text-align: center;">
                    <h2 style="color: #065f46; margin: 0 0 8px 0; font-size: 24px;">Thank You, ${customer_name}! 🎉</h2>
                    <p style="color: #047857; margin: 0; font-size: 15px; line-height: 1.6;">
                      Your payment has been received. Your advertisement will be published as scheduled.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Invoice Details -->
              <tr>
                <td style="padding: 20px 40px;">
                  <table width="100%" style="background: #f9fafb; border-radius: 12px; padding: 20px;">
                    <tr>
                      <td width="50%" style="padding: 12px;">
                        <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Invoice Number</div>
                        <div style="color: #1f2937; font-size: 20px; font-weight: 800; margin-top: 4px;">${invoice_number}</div>
                      </td>
                      <td width="50%" style="padding: 12px; text-align: right;">
                        <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Quotation Ref</div>
                        <div style="color: #1f2937; font-size: 16px; font-weight: 600; margin-top: 4px;">${quotation_number}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Items Table -->
              <tr>
                <td style="padding: 20px 40px;">
                  <table width="100%" style="border-collapse: collapse; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <thead>
                      <tr style="background: #1f2937;">
                        <th style="padding: 14px; text-align: left; color: white; font-weight: 600;">Newspaper</th>
                        <th style="padding: 14px; text-align: left; color: white; font-weight: 600;">Type</th>
                        <th style="padding: 14px; text-align: left; color: white; font-weight: 600;">Date</th>
                        <th style="padding: 14px; text-align: right; color: white; font-weight: 600;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Total Paid -->
              <tr>
                <td style="padding: 20px 40px 40px 40px;">
                  <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 16px; padding: 30px; text-align: center; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);">
                    <div style="color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Total Paid</div>
                    <div style="color: #ffffff; font-size: 42px; font-weight: 900;">Rs. ${parseFloat(total_amount || 0).toLocaleString()}</div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 50px; padding: 8px 24px; display: inline-block; margin-top: 12px;">
                      <span style="color: #ffffff; font-weight: 600;">✓ FULLY PAID</span>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
                    📧 This is your official invoice. Please save for your records.
                  </p>
                  <div style="color: #1e40af; font-size: 16px; font-weight: 700;">${CONFIG.COMPANY_NAME}</div>
                  <div style="color: #6b7280; font-size: 13px; margin-top: 8px;">
                    📞 ${CONFIG.COMPANY_PHONE} | 📧 ${CONFIG.ADMIN_EMAIL}
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    MailApp.sendEmail({
      to: customer_email,
      subject: subject,
      htmlBody: htmlBody,
      replyTo: CONFIG.ADMIN_EMAIL
    });
    return jsonResponse(true, 'Invoice email sent to ' + customer_email);
  } catch (error) {
    return jsonResponse(false, 'Failed to send: ' + error.message);
  }
}

/**
 * Send payment confirmation (simple receipt)
 */
function sendPaymentConfirmation(data) {
  const { customer_email, customer_name, quotation_number, amount } = data;

  const subject = `💳 Payment Received - ${quotation_number} - AdSpot Media`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f5f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="500" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); padding: 40px; text-align: center;">
                  <div style="font-size: 64px; margin-bottom: 16px;">💳</div>
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Received!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px; text-align: center;">
                  <p style="color: #1f2937; font-size: 18px; margin: 0 0 24px 0;">Dear ${customer_name},</p>
                  <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                    We have received your payment for quotation <strong>${quotation_number}</strong>.
                  </p>
                  <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Amount Received</div>
                    <div style="color: #059669; font-size: 36px; font-weight: 800;">Rs. ${parseFloat(amount || 0).toLocaleString()}</div>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Your invoice will be sent shortly. Thank you!
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background: #f9fafb; padding: 24px; text-align: center;">
                  <div style="color: #1e40af; font-weight: 700;">${CONFIG.COMPANY_NAME}</div>
                  <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">📞 ${CONFIG.COMPANY_PHONE}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    MailApp.sendEmail({
      to: customer_email,
      subject: subject,
      htmlBody: htmlBody,
      replyTo: CONFIG.ADMIN_EMAIL
    });
    return jsonResponse(true, 'Payment confirmation sent');
  } catch (error) {
    return jsonResponse(false, 'Failed to send: ' + error.message);
  }
}

/**
 * Send contact form message to admin
 */
function sendContactFormEmail(data) {
  const { name, email, phone, subject, message } = data;

  const emailSubject = `📩 Contact Form: ${subject || 'New Message'}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f5f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="500" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding: 30px; text-align: center;">
                  <div style="font-size: 40px; margin-bottom: 8px;">📩</div>
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Contact Message</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <table width="100%">
                      <tr><td style="color: #6b7280; padding: 6px 0;">Name:</td><td style="font-weight: 600;">${name}</td></tr>
                      <tr><td style="color: #6b7280; padding: 6px 0;">Email:</td><td style="font-weight: 600;">${email}</td></tr>
                      <tr><td style="color: #6b7280; padding: 6px 0;">Phone:</td><td style="font-weight: 600;">${phone || 'N/A'}</td></tr>
                      <tr><td style="color: #6b7280; padding: 6px 0;">Subject:</td><td style="font-weight: 600;">${subject || 'General Inquiry'}</td></tr>
                    </table>
                  </div>
                  <div style="background: #f9fafb; border-radius: 12px; padding: 20px; border-left: 4px solid #8b5cf6;">
                    <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Message</div>
                    <div style="color: #1f2937; font-size: 15px; line-height: 1.6;">${message}</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background: #f9fafb; padding: 20px; text-align: center;">
                  <a href="mailto:${email}" style="display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Reply to ${name}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: emailSubject,
      htmlBody: htmlBody,
      replyTo: email
    });
    return jsonResponse(true, 'Contact form sent to admin');
  } catch (error) {
    return jsonResponse(false, 'Failed to send: ' + error.message);
  }
}

// ============================================
// PDF STORAGE FUNCTIONS
// ============================================

function uploadPdfToDrive(data) {
  try {
    const { pdfBase64, filename, quotationNumber, customerName } = data;

    if (!pdfBase64 || !filename) {
      return jsonResponse(false, 'Missing pdfBase64 or filename');
    }

    const decodedData = Utilities.base64Decode(pdfBase64);
    const blob = Utilities.newBlob(decodedData, 'application/pdf', filename);

    const folder = getOrCreateDateFolder();
    const file = folder.createFile(blob);

    file.setDescription(JSON.stringify({
      quotationNumber: quotationNumber,
      customerName: customerName,
      uploadedAt: new Date().toISOString()
    }));

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();

    return jsonResponse(true, 'PDF uploaded', {
      fileId: fileId,
      viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`
    });

  } catch (error) {
    return jsonResponse(false, 'Upload failed: ' + error.message);
  }
}

function getPdfFromDrive(data) {
  try {
    const { fileId, quotationNumber } = data;

    let file;
    if (fileId) {
      file = DriveApp.getFileById(fileId);
    } else if (quotationNumber) {
      const files = DriveApp.searchFiles(`title contains '${quotationNumber}'`);
      if (files.hasNext()) {
        file = files.next();
      }
    }

    if (!file) {
      return jsonResponse(false, 'File not found');
    }

    return jsonResponse(true, 'File found', {
      fileId: file.getId(),
      name: file.getName(),
      viewUrl: `https://drive.google.com/file/d/${file.getId()}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${file.getId()}`
    });

  } catch (error) {
    return jsonResponse(false, 'Get failed: ' + error.message);
  }
}

function listPdfsFromDrive(data) {
  try {
    const folder = getRootFolder();
    const files = [];
    const fileIterator = folder.getFiles();

    while (fileIterator.hasNext()) {
      const file = fileIterator.next();
      if (file.getMimeType() === 'application/pdf') {
        files.push({
          fileId: file.getId(),
          name: file.getName(),
          viewUrl: `https://drive.google.com/file/d/${file.getId()}/view`
        });
      }
    }

    return jsonResponse(true, 'Found ' + files.length + ' files', { files: files });

  } catch (error) {
    return jsonResponse(false, 'List failed: ' + error.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function jsonResponse(success, message, data = {}) {
  return ContentService.createTextOutput(JSON.stringify({
    success: success,
    message: message,
    ...data
  })).setMimeType(ContentService.MimeType.JSON);
}

function getRootFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.PDF_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(CONFIG.PDF_FOLDER_NAME);
}

function getOrCreateDateFolder() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = now.toLocaleString('en-US', { month: 'long' });

  const rootFolder = getRootFolder();

  let yearFolder;
  const yearFolders = rootFolder.getFoldersByName(year);
  if (yearFolders.hasNext()) {
    yearFolder = yearFolders.next();
  } else {
    yearFolder = rootFolder.createFolder(year);
  }

  let monthFolder;
  const monthFolders = yearFolder.getFoldersByName(month);
  if (monthFolders.hasNext()) {
    monthFolder = monthFolders.next();
  } else {
    monthFolder = yearFolder.createFolder(month);
  }

  return monthFolder;
}

// ============================================
// TEST FUNCTION
// ============================================
function testSetup() {
  console.log('Testing AdSpot Backend...');

  // Test email
  MailApp.sendEmail({
    to: CONFIG.ADMIN_EMAIL,
    subject: '✅ AdSpot Backend Test',
    htmlBody: '<h1>Test Successful!</h1><p>Your AdSpot backend is working correctly.</p>'
  });

  console.log('Test email sent to ' + CONFIG.ADMIN_EMAIL);

  // Test Drive folder
  const folder = getOrCreateDateFolder();
  console.log('Drive folder ready: ' + folder.getName());

  console.log('All tests passed!');
}
