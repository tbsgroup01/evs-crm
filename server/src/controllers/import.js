const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const { sequelize, Lead, LeadImport, ActivityLog, User } = require('../models');
const { getRealIp } = require('../utils/ipHelper');

const normalizeHeaders = (headers) => {
  const mapping = {
    'client_name': ['client name', 'name', 'customer name'],
    'mobile': ['phone', 'mobile', 'mobile number', 'contact number'],
    'email': ['email', 'email address'],
    'lead_source': ['source', 'lead source'],
    'country': ['country'],
    'city': ['city'],
    'requirement': ['requirement'],
    'service_required': ['service required'],
    'estimated_budget': ['estimated budget', 'budget'],
    'requirement_details': ['requirement details'],
    'follow_up_date': ['follow up date', 'followup date'],
    'notes': ['notes'],
    'remarks': ['remarks']
  };

  const headerMap = {};
  headers.forEach(h => {
    const clean = h.trim().toLowerCase();
    let matched = false;
    for (const [key, aliases] of Object.entries(mapping)) {
      if (aliases.includes(clean)) {
        headerMap[h] = key;
        matched = true;
        break;
      }
    }
    if (!matched) headerMap[h] = clean.replace(/\s+/g, '_');
  });
  return headerMap;
};

const parseImportFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rawHeaders = [];
    let rawRows = [];

    if (ext === '.csv') {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, { columns: false, skip_empty_lines: true });
      if (records.length > 0) {
        rawHeaders = records[0];
        rawRows = records.slice(1).map(row => {
          const obj = {};
          rawHeaders.forEach((h, index) => {
            obj[h] = row[index] || null;
          });
          return obj;
        });
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (data.length > 0) {
        rawHeaders = data[0];
        rawRows = data.slice(1).map(row => {
          const obj = {};
          rawHeaders.forEach((h, index) => {
            obj[h] = row[index] !== undefined ? row[index] : null;
          });
          return obj;
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid file format. Only CSV and Excel are allowed.' });
    }

    const headerMapping = normalizeHeaders(rawHeaders);
    const parsedRows = rawRows.map((row, idx) => {
      const mapped = {};
      Object.keys(row).forEach(header => {
        const fieldName = headerMapping[header];
        mapped[fieldName] = row[header];
      });

      const errors = [];
      if (!mapped.client_name) errors.push('client_name is required');
      if (!mapped.mobile) {
        errors.push('mobile is required');
      } else {
        const cleanMobile = String(mapped.mobile).trim().replace(/[\s-]/g, '');
        if (!/^\+?[0-9]{7,15}$/.test(cleanMobile)) {
          errors.push('Invalid mobile number (must contain numbers only, 7 to 15 digits)');
        } else {
          mapped.mobile = cleanMobile;
        }
      }

      if (mapped.email) {
        const cleanEmail = String(mapped.email).trim();
        if (cleanEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
          errors.push('Invalid email format (e.g. client@example.com)');
        } else {
          mapped.email = cleanEmail || null;
        }
      }

      return {
        row_index: idx + 1,
        data: mapped,
        valid: errors.length === 0,
        errors
      };
    });

    const mobileList = parsedRows.filter(r => r.valid).map(r => r.data.mobile);
    const existingLeads = await Lead.findAll({
      where: { mobile: mobileList },
      attributes: ['mobile']
    });
    const existingMobiles = new Set(existingLeads.map(l => l.mobile));

    const finalRows = parsedRows.map(r => {
      const isDuplicate = r.valid && existingMobiles.has(r.data.mobile);
      return {
        ...r,
        duplicate: isDuplicate
      };
    });

    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      data: {
        file_name: req.file.originalname,
        file_type: ext,
        total_rows: finalRows.length,
        valid_rows: finalRows.filter(r => r.valid).length,
        invalid_rows: finalRows.filter(r => !r.valid).length,
        duplicate_rows: finalRows.filter(r => r.duplicate).length,
        rows: finalRows
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to parse file', errors: [error.message] });
  }
};

const parsePdfImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No PDF file uploaded' });

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);
    const text = pdfData.text || '';

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const records = [];
    const phoneRegex = /(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}|\b\d{10}\b/;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (phoneRegex.test(line)) {
        const phoneMatch = line.match(phoneRegex);
        const emailMatch = line.match(emailRegex);

        const email = emailMatch ? emailMatch[0] : '';
        const mobile = phoneMatch ? phoneMatch[0] : '';
        const nameGuess = lines[i - 1] && lines[i - 1].length < 50 && !phoneRegex.test(lines[i - 1])
          ? lines[i - 1]
          : 'Extracted PDF Client';

        records.push({
          row_index: records.length + 1,
          data: {
            client_name: nameGuess,
            mobile: mobile,
            email: email,
            requirement: line.substring(0, 255)
          },
          valid: !!mobile && nameGuess !== 'Extracted PDF Client',
          errors: [],
          duplicate: false
        });
      }
    }

    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      data: {
        file_name: req.file.originalname,
        file_type: '.pdf',
        total_rows: records.length,
        valid_rows: records.filter(r => r.valid).length,
        invalid_rows: records.filter(r => !r.valid).length,
        duplicate_rows: 0,
        rows: records
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed parsing PDF', errors: [error.message] });
  }
};

const confirmImportLeads = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { file_name, file_type, rows, duplicate_strategy = 'SKIP_DUPLICATE' } = req.body;

    if (!rows || !Array.isArray(rows)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Rows payload is required' });
    }

    let successCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const errorsLog = [];

    const leadImportLog = await LeadImport.create({
      file_name: file_name || 'manual_upload',
      file_type: file_type || 'csv',
      total_rows: rows.length,
      successful_rows: 0,
      failed_rows: 0,
      duplicate_rows: 0,
      imported_by: req.user.id,
      status: 'PROCESSING'
    }, { transaction });

    const maxId = await Lead.max('id', { transaction }) || 0;
    let countSeq = maxId + 1;

    for (const r of rows) {
      const data = r.data;
      if (!r.valid) {
        failedCount++;
        errorsLog.push(`Row ${r.row_index}: Validations failed (${r.errors.join(', ')})`);
        continue;
      }

      if (data.email === '') data.email = null;
      if (data.mobile) data.mobile = String(data.mobile).trim().replace(/[\s-]/g, '');

      const existing = await Lead.findOne({ where: { mobile: data.mobile }, transaction });
      if (existing) {
        if (duplicate_strategy === 'SKIP_DUPLICATE') {
          duplicateCount++;
          continue;
        } else if (duplicate_strategy === 'UPDATE_EXISTING') {
          await existing.update(data, { transaction });
          successCount++;
          continue;
        }
      }

      const leadNumber = `LEAD-${1000 + countSeq}`;
      countSeq++;

      await Lead.create({
        ...data,
        lead_number: leadNumber,
        created_by: req.user.id
      }, { transaction });
      successCount++;
    }

    let finalStatus = 'COMPLETED';
    if (failedCount > 0) finalStatus = 'COMPLETED_WITH_ERRORS';
    if (successCount === 0 && failedCount > 0) finalStatus = 'FAILED';

    let errorFilePath = null;
    if (errorsLog.length > 0) {
      const errDir = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(errDir)) fs.mkdirSync(errDir, { recursive: true });
      const errFile = `error-import-${leadImportLog.id}.txt`;
      fs.writeFileSync(path.join(errDir, errFile), errorsLog.join('\n'));
      errorFilePath = `/uploads/${errFile}`;
    }

    await leadImportLog.update({
      successful_rows: successCount,
      failed_rows: failedCount,
      duplicate_rows: duplicateCount,
      status: finalStatus,
      error_file_path: errorFilePath
    }, { transaction });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'LeadImport',
      entity_id: leadImportLog.id,
      action: 'BULK_IMPORT',
      description: `Bulk imported ${successCount} leads from ${file_name}. Failures: ${failedCount}. Duplicates: ${duplicateCount}. Strategy: ${duplicate_strategy}`,
      ip_address: getRealIp(req)
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      data: {
        import_id: leadImportLog.id,
        status: finalStatus,
        total: rows.length,
        success: successCount,
        failed: failedCount,
        duplicates: duplicateCount,
        error_file: errorFilePath
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to confirm bulk import', errors: [error.message] });
  }
};

const getImportHistory = async (req, res) => {
  try {
    const logs = await LeadImport.findAll({
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'importer', attributes: ['id', 'name'] }]
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed fetching imports', errors: [error.message] });
  }
};

const getImportById = async (req, res) => {
  try {
    const log = await LeadImport.findByPk(req.params.id, {
      include: [{ model: User, as: 'importer', attributes: ['id', 'name'] }]
    });
    if (!log) return res.status(404).json({ success: false, message: 'Import log not found' });
    return res.status(200).json({ success: true, data: log });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed fetching details', errors: [error.message] });
  }
};

module.exports = {
  parseImportFile,
  parsePdfImport,
  confirmImportLeads,
  getImportHistory,
  getImportById
};
