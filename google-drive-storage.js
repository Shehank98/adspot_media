/**
 * Google Apps Script for AdSpot PDF Storage
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project named "AdSpot PDF Storage"
 * 3. Copy all the code below into the script editor
 * 4. Click "Deploy" > "New deployment"
 * 5. Select "Web app" as deployment type
 * 6. Set "Execute as" to "Me"
 * 7. Set "Who has access" to "Anyone"
 * 8. Click "Deploy" and authorize the app
 * 9. Copy the Web App URL and update PDF_STORAGE_CONFIG in supabase.js
 *
 * FOLDER STRUCTURE:
 * AdSpot Invoices/
 *   ├── 2024/
 *   │   ├── January/
 *   │   │   ├── INV-20240115-001.pdf
 *   │   │   └── INV-20240120-002.pdf
 *   │   └── February/
 *   └── 2025/
 */

// ============================================
// CONFIGURATION - Update these values
// ============================================
const CONFIG = {
  ROOT_FOLDER_NAME: 'AdSpot Invoices',  // Main folder name in Google Drive
  NOTIFY_EMAIL: 'adspot77@gmail.com',   // Email to notify on new uploads (optional)
  MAX_FILE_SIZE_MB: 10                   // Maximum file size in MB
};

// ============================================
// MAIN HANDLER - Receives requests from web app
// ============================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    switch (data.action) {
      case 'upload':
        return uploadPdf(data);
      case 'list':
        return listPdfs(data);
      case 'delete':
        return deletePdf(data);
      case 'get':
        return getPdf(data);
      default:
        return createResponse(false, 'Unknown action');
    }
  } catch (error) {
    return createResponse(false, 'Error: ' + error.message);
  }
}

function doGet(e) {
  // Handle GET requests (for testing or retrieving files)
  const action = e.parameter.action;
  const fileId = e.parameter.fileId;

  if (action === 'download' && fileId) {
    try {
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();
      return ContentService.createTextOutput(Utilities.base64Encode(blob.getBytes()))
        .setMimeType(ContentService.MimeType.TEXT);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'AdSpot PDF Storage API is running',
    version: '1.0',
    endpoints: {
      POST: ['upload', 'list', 'delete', 'get'],
      GET: ['download']
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// PDF UPLOAD FUNCTION
// ============================================
function uploadPdf(data) {
  try {
    const { pdfBase64, filename, quotationNumber, customerName, metadata } = data;

    if (!pdfBase64 || !filename) {
      return createResponse(false, 'Missing required fields: pdfBase64, filename');
    }

    // Decode base64 to blob
    const decodedData = Utilities.base64Decode(pdfBase64);
    const blob = Utilities.newBlob(decodedData, 'application/pdf', filename);

    // Check file size
    const fileSizeMB = blob.getBytes().length / (1024 * 1024);
    if (fileSizeMB > CONFIG.MAX_FILE_SIZE_MB) {
      return createResponse(false, `File too large. Max size: ${CONFIG.MAX_FILE_SIZE_MB}MB`);
    }

    // Get or create folder structure
    const folder = getOrCreateDateFolder();

    // Check if file already exists
    const existingFiles = folder.getFilesByName(filename);
    if (existingFiles.hasNext()) {
      // Update existing file
      const existingFile = existingFiles.next();
      existingFile.setTrashed(true); // Move old to trash
    }

    // Save file
    const file = folder.createFile(blob);

    // Set description with metadata
    const description = JSON.stringify({
      quotationNumber: quotationNumber || '',
      customerName: customerName || '',
      uploadedAt: new Date().toISOString(),
      ...metadata
    });
    file.setDescription(description);

    // Make file accessible via link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Get file URLs
    const fileId = file.getId();
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // Optional: Send notification email
    if (CONFIG.NOTIFY_EMAIL && quotationNumber) {
      try {
        MailApp.sendEmail({
          to: CONFIG.NOTIFY_EMAIL,
          subject: `New Invoice Uploaded: ${quotationNumber}`,
          htmlBody: `
            <h2>New Invoice Uploaded</h2>
            <p><strong>Quotation:</strong> ${quotationNumber}</p>
            <p><strong>Customer:</strong> ${customerName || 'N/A'}</p>
            <p><strong>File:</strong> ${filename}</p>
            <p><a href="${viewUrl}">View Invoice</a> | <a href="${downloadUrl}">Download</a></p>
          `
        });
      } catch (emailError) {
        console.log('Email notification failed:', emailError);
      }
    }

    return createResponse(true, 'PDF uploaded successfully', {
      fileId: fileId,
      filename: filename,
      viewUrl: viewUrl,
      downloadUrl: downloadUrl,
      folderPath: getFolderPath(folder)
    });

  } catch (error) {
    console.error('Upload error:', error);
    return createResponse(false, 'Upload failed: ' + error.message);
  }
}

// ============================================
// LIST PDFs FUNCTION
// ============================================
function listPdfs(data) {
  try {
    const { year, month, limit = 50 } = data;

    let folder;

    if (year && month) {
      folder = getFolder(year, month);
    } else if (year) {
      folder = getFolder(year);
    } else {
      folder = getRootFolder();
    }

    if (!folder) {
      return createResponse(true, 'No files found', { files: [] });
    }

    const files = [];
    const fileIterator = folder.getFiles();
    let count = 0;

    while (fileIterator.hasNext() && count < limit) {
      const file = fileIterator.next();
      if (file.getMimeType() === 'application/pdf') {
        let metadata = {};
        try {
          metadata = JSON.parse(file.getDescription() || '{}');
        } catch (e) {}

        files.push({
          fileId: file.getId(),
          name: file.getName(),
          size: file.getSize(),
          createdAt: file.getDateCreated().toISOString(),
          viewUrl: `https://drive.google.com/file/d/${file.getId()}/view`,
          downloadUrl: `https://drive.google.com/uc?export=download&id=${file.getId()}`,
          metadata: metadata
        });
        count++;
      }
    }

    // Sort by date (newest first)
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return createResponse(true, `Found ${files.length} files`, { files: files });

  } catch (error) {
    return createResponse(false, 'List failed: ' + error.message);
  }
}

// ============================================
// GET PDF FUNCTION
// ============================================
function getPdf(data) {
  try {
    const { fileId, filename, quotationNumber } = data;

    let file;

    if (fileId) {
      file = DriveApp.getFileById(fileId);
    } else if (filename || quotationNumber) {
      // Search for file
      const searchName = filename || `*${quotationNumber}*`;
      const files = DriveApp.searchFiles(`title contains '${searchName}' and mimeType = 'application/pdf'`);
      if (files.hasNext()) {
        file = files.next();
      }
    }

    if (!file) {
      return createResponse(false, 'File not found');
    }

    let metadata = {};
    try {
      metadata = JSON.parse(file.getDescription() || '{}');
    } catch (e) {}

    return createResponse(true, 'File found', {
      fileId: file.getId(),
      name: file.getName(),
      size: file.getSize(),
      createdAt: file.getDateCreated().toISOString(),
      viewUrl: `https://drive.google.com/file/d/${file.getId()}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${file.getId()}`,
      metadata: metadata
    });

  } catch (error) {
    return createResponse(false, 'Get failed: ' + error.message);
  }
}

// ============================================
// DELETE PDF FUNCTION
// ============================================
function deletePdf(data) {
  try {
    const { fileId } = data;

    if (!fileId) {
      return createResponse(false, 'Missing fileId');
    }

    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);

    return createResponse(true, 'File moved to trash');

  } catch (error) {
    return createResponse(false, 'Delete failed: ' + error.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createResponse(success, message, data = {}) {
  return ContentService.createTextOutput(JSON.stringify({
    success: success,
    message: message,
    ...data
  })).setMimeType(ContentService.MimeType.JSON);
}

function getRootFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
}

function getOrCreateDateFolder() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = now.toLocaleString('en-US', { month: 'long' });

  const rootFolder = getRootFolder();

  // Get or create year folder
  let yearFolder;
  const yearFolders = rootFolder.getFoldersByName(year);
  if (yearFolders.hasNext()) {
    yearFolder = yearFolders.next();
  } else {
    yearFolder = rootFolder.createFolder(year);
  }

  // Get or create month folder
  let monthFolder;
  const monthFolders = yearFolder.getFoldersByName(month);
  if (monthFolders.hasNext()) {
    monthFolder = monthFolders.next();
  } else {
    monthFolder = yearFolder.createFolder(month);
  }

  return monthFolder;
}

function getFolder(year, month = null) {
  const rootFolder = getRootFolder();

  const yearFolders = rootFolder.getFoldersByName(year.toString());
  if (!yearFolders.hasNext()) {
    return null;
  }

  const yearFolder = yearFolders.next();

  if (!month) {
    return yearFolder;
  }

  const monthFolders = yearFolder.getFoldersByName(month);
  if (!monthFolders.hasNext()) {
    return null;
  }

  return monthFolders.next();
}

function getFolderPath(folder) {
  const parts = [];
  let current = folder;

  while (current && current.getName() !== 'My Drive') {
    parts.unshift(current.getName());
    const parents = current.getParents();
    current = parents.hasNext() ? parents.next() : null;
  }

  return parts.join('/');
}

// ============================================
// TEST FUNCTION - Run this to test the setup
// ============================================
function testSetup() {
  console.log('Testing AdSpot PDF Storage Setup...');

  // Test 1: Create root folder
  const rootFolder = getRootFolder();
  console.log('Root folder created/found:', rootFolder.getName());

  // Test 2: Create date folder
  const dateFolder = getOrCreateDateFolder();
  console.log('Date folder path:', getFolderPath(dateFolder));

  // Test 3: Create a test PDF
  const testPdfContent = '%PDF-1.4 test';
  const blob = Utilities.newBlob(testPdfContent, 'application/pdf', 'test-invoice.pdf');
  const testFile = dateFolder.createFile(blob);
  console.log('Test file created:', testFile.getName());

  // Cleanup
  testFile.setTrashed(true);
  console.log('Test file cleaned up');

  console.log('Setup test completed successfully!');
}
