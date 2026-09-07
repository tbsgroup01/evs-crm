const { Op } = require('sequelize');
const { sequelize, Case, Lead, User, Role, ActivityLog, Notification, CasePackage, Payment, LeadInteraction, Package } = require('../models');
const { logAudit } = require('../utils/auditLogger');

const getRoleLabel = (user) => {
  const name = user?.role?.name || user?.role || 'User';
  if (name === 'ADMIN') return 'Admin';
  if (name === 'LEAD_MANAGER' || name === 'MANAGER') return 'Manager';
  if (name === 'CASE_MANAGER') return 'Case Manager';
  if (name === 'COUNSELOR') return 'Counselor';
  return name;
};

const convertLeadToCase = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const roleName = req.user.role?.name || (typeof req.user.role === 'string' ? req.user.role : '');
    if (roleName === 'CASE_MANAGER') {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Access denied: Case Managers are not authorized to create cases.' });
    }

    const { id } = req.params;
    const {
      case_number,
      file_id,
      nationality,
      service_required,
      package_amount,
      paid_amount,
      payment_date,
      adults,
      kids,
      notes,
      profit
    } = req.body;

    const lead = await Lead.findByPk(id, { transaction });

    if (!lead) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const existingCase = await Case.findOne({ where: { lead_id: id }, transaction });
    if (existingCase) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Lead already converted to a case' });
    }

    const pkgAmt = parseFloat(package_amount !== undefined && package_amount !== null && package_amount !== '' ? package_amount : (lead.package_amount || 0));
    const leadInitialPaid = parseFloat(lead.paid_amount || 0);

    let additionalPaid = 0;
    if (req.body.new_payment_amount !== undefined && req.body.new_payment_amount !== null && req.body.new_payment_amount !== '') {
      additionalPaid = parseFloat(req.body.new_payment_amount);
    } else if (paid_amount !== undefined && paid_amount !== null && paid_amount !== '') {
      const passedPaid = parseFloat(paid_amount);
      if (passedPaid > leadInitialPaid) {
        additionalPaid = passedPaid - leadInitialPaid;
      }
    }

    const totalPaidAmt = leadInitialPaid + additionalPaid;
    const effectivePendingAmt = Math.max(0, pkgAmt - totalPaidAmt);
    const numAdults = parseInt(adults !== undefined && adults !== null && adults !== '' ? adults : (lead.adults || 1));
    const numKids = parseInt(kids !== undefined && kids !== null && kids !== '' ? kids : (lead.kids || 0));
    const totalPax = numAdults + numKids;
    if (payment_date) {
      const pDateStr = new Date(payment_date).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      if (pDateStr > todayStr) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Payment date cannot be greater than the current date.' });
      }
    }

    let validPayDate = new Date();
    const inputDateStr = payment_date || lead.payment_date;
    if (inputDateStr) {
      const parsed = new Date(inputDateStr);
      if (!isNaN(parsed.getTime())) {
        validPayDate = parsed;
      } else {
        const parts = String(inputDateStr).split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            validPayDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
          } else {
            validPayDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        }
      }
    }
    if (isNaN(validPayDate.getTime())) validPayDate = new Date();
    const formattedPayDateStr = validPayDate.toISOString().split('T')[0];

    const canManageConv = ['ADMIN', 'LEAD_MANAGER'].includes(req.user.role?.name || req.user.role);

    const leadUpdates = {
      status: 'CONVERTED',
      nationality: nationality || lead.nationality || lead.country || null,
      service_required: service_required || lead.service_required || null,
      package_amount: pkgAmt,
      paid_amount: totalPaidAmt,
      pending_amount: effectivePendingAmt,
      payment_date: formattedPayDateStr,
      adults: numAdults,
      kids: numKids,
      total_pax: totalPax,
      notes: notes !== undefined ? notes : lead.notes
    };

    if (canManageConv && profit !== undefined && profit !== null && profit !== '') {
      leadUpdates.profit = parseFloat(profit);
    }

    await lead.update(leadUpdates, { transaction });

    let finalCaseNumber = (case_number || file_id || '').trim();

    if (finalCaseNumber) {
      const exists = await Case.findOne({ where: { case_number: finalCaseNumber }, transaction, paranoid: false });
      if (exists) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: `File ID / Case Number "${finalCaseNumber}" is already in use. Please enter a unique ID.` });
      }
    } else {
      const maxId = (await Case.max('id', { transaction, paranoid: false })) || 0;
      let nextNum = 1000 + maxId + 1;
      finalCaseNumber = `FILE-${nextNum}`;
      let exists = await Case.findOne({ where: { case_number: finalCaseNumber }, transaction, paranoid: false });
      while (exists) {
        nextNum += 1;
        finalCaseNumber = `FILE-${nextNum}`;
        exists = await Case.findOne({ where: { case_number: finalCaseNumber }, transaction, paranoid: false });
      }
    }

    const newCase = await Case.create({
      case_number: finalCaseNumber,
      lead_id: lead.id,
      status: 'NEW',
      opened_at: new Date()
    }, { transaction });

    if (pkgAmt > 0) {
      let defaultPkg = await Package.findOne({ transaction });
      if (!defaultPkg) {
        defaultPkg = await Package.create({
          name: service_required || lead.service_required || 'Standard Service Package',
          amount: pkgAmt,
          description: 'Auto-generated service package for lead conversion'
        }, { transaction });
      }
      await CasePackage.create({
        case_id: newCase.id,
        package_id: defaultPkg.id,
        package_amount: pkgAmt
      }, { transaction });
    }

    // Record initial token payment from Lead creation if any
    if (leadInitialPaid > 0) {
      let initialPayDate = validPayDate;
      if (lead.payment_date) {
        const pDate = new Date(lead.payment_date);
        if (!isNaN(pDate.getTime())) initialPayDate = pDate;
      }
      await Payment.create({
        case_id: newCase.id,
        amount: leadInitialPaid,
        payment_date: initialPayDate,
        payment_method: 'CASH',
        notes: `Initial lead token payment (${lead.lead_number || 'Lead'})`,
        created_by: lead.created_by || req.user.id,
        status: 'APPROVED'
      }, { transaction });
    }

    // Record additional payment made during conversion if any
    if (additionalPaid > 0) {
      await Payment.create({
        case_id: newCase.id,
        amount: additionalPaid,
        payment_date: validPayDate,
        payment_method: 'CASH',
        notes: `Additional payment on case conversion`,
        created_by: req.user.id,
        status: 'APPROVED'
      }, { transaction });
    }

    const roleLabel = getRoleLabel(req.user);
    await logAudit({
      req,
      entityType: 'Case',
      entityId: newCase.id,
      leadId: lead.id,
      action: 'CONVERT_LEAD',
      oldValue: 'LEAD',
      newValue: 'CONVERTED',
      description: `${roleLabel} ${req.user.name} converted Lead ${lead.lead_number || `#${lead.id}`} to Case ${finalCaseNumber}`,
      transaction
    });

    await transaction.commit();
    return res.status(201).json({ success: true, message: 'Lead successfully converted to Case', data: newCase });
  } catch (error) {
    console.error('Error in convertLeadToCase:', error);
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to convert lead to case', errors: [error.message] });
  }
};

const getCases = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, case_manager_id, sort = 'DESC', sortBy = 'created_at' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (req.user.role.name === 'CASE_MANAGER') {
      where.case_manager_id = req.user.id;
    } else if (case_manager_id) {
      where.case_manager_id = case_manager_id;
    }

    if (status) where.status = status;

    const leadInclude = {
      model: Lead,
      attributes: ['id', 'lead_number', 'client_name', 'mobile', 'email', 'country', 'nationality', 'city', 'service_required', 'package_amount', 'paid_amount', 'pending_amount', 'counselor_id']
    };

    if (req.user.role.name === 'COUNSELOR') {
      leadInclude.where = { counselor_id: req.user.id };
      leadInclude.required = true;
    }

    if (search) {
      leadInclude.where = {
        ...(leadInclude.where || {}),
        [Op.or]: [
          { client_name: { [Op.like]: `%${search}%` } },
          { mobile: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { lead_number: { [Op.like]: `%${search}%` } }
        ]
      };
      leadInclude.required = true;
    }

    const { count, rows } = await Case.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sort]],
      include: [
        leadInclude,
        { model: User, as: 'caseManager', attributes: ['id', 'name', 'email'] },
        { model: CasePackage, as: 'casePackages', attributes: ['id', 'package_amount'] },
        { model: Payment, as: 'payments', attributes: ['id', 'amount', 'status'] }
      ]
    });

    const enrichedCases = rows.map(c => {
      const caseData = c.toJSON();
      const pkgAmt = parseFloat(caseData.casePackages?.[0]?.package_amount || caseData.Lead?.package_amount || 0);
      const paymentsList = caseData.payments || [];
      const approvedPaid = paymentsList
        .filter(p => p.status === 'APPROVED')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      let effectivePaid = 0;
      if (paymentsList.length > 0) {
        effectivePaid = approvedPaid;
      } else {
        effectivePaid = caseData.Lead?.paid_amount ? parseFloat(caseData.Lead.paid_amount) : 0;
      }

      const pendingAmt = Math.max(0, pkgAmt - effectivePaid);

      let payStatus = 'UNPAID';
      if (effectivePaid >= pkgAmt && pkgAmt > 0) {
        payStatus = 'FULLY_PAID';
      } else if (effectivePaid > 0) {
        payStatus = 'PARTIAL';
      }

      return {
        ...caseData,
        package_amount: pkgAmt,
        paid_amount: effectivePaid,
        pending_amount: pendingAmt,
        payment_status: payStatus
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        cases: enrichedCases,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve cases', errors: [error.message] });
  }
};

const getCaseById = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role.name === 'CASE_MANAGER') {
      where.case_manager_id = req.user.id;
    }

    const leadInclude = { model: Lead };
    if (req.user.role.name === 'COUNSELOR') {
      leadInclude.where = { counselor_id: req.user.id };
      leadInclude.required = true;
    }

    const singleCase = await Case.findOne({
      where,
      include: [
        leadInclude,
        { model: User, as: 'caseManager', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found or access denied' });

    const notes = await ActivityLog.findAll({
      where: { entity_type: 'Case', entity_id: singleCase.id, action: 'ADD_CASE_NOTE' },
      order: [['created_at', 'DESC']],
      include: [{ model: User, attributes: ['id', 'name'] }]
    });

    return res.status(200).json({
      success: true,
      data: {
        case: singleCase,
        notes: notes.map(n => ({
          id: n.id,
          note: n.description,
          created_at: n.created_at,
          author: n.User ? n.User.name : 'System'
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch case details', errors: [error.message] });
  }
};

const updateCase = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role.name === 'CASE_MANAGER') {
      where.case_manager_id = req.user.id;
    }

    const singleCase = await Case.findOne({ where });
    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    const oldStatus = singleCase.status;
    const oldCaseManagerId = singleCase.case_manager_id;
    const oldVal = JSON.stringify(singleCase.toJSON ? singleCase.toJSON() : singleCase);

    await singleCase.update(req.body);

    const roleLabel = getRoleLabel(req.user);
    let desc = `${roleLabel} ${req.user.name} updated details for Case ${singleCase.case_number}`;

    if (req.body.status && req.body.status !== oldStatus) {
      desc = `${roleLabel} ${req.user.name} changed the case status from ${oldStatus} → ${req.body.status}`;
    } else if (req.body.case_manager_id && req.body.case_manager_id !== oldCaseManagerId) {
      const newCm = await User.findByPk(req.body.case_manager_id);
      desc = `${roleLabel} ${req.user.name} assigned Case Manager ${newCm?.name || 'User'} to Case ${singleCase.case_number}`;
    }

    await logAudit({
      req,
      entityType: 'Case',
      entityId: singleCase.id,
      leadId: singleCase.lead_id,
      action: 'UPDATE_CASE',
      oldValue: oldVal,
      newValue: JSON.stringify(singleCase.toJSON ? singleCase.toJSON() : singleCase),
      description: desc
    });

    return res.status(200).json({ success: true, data: singleCase });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update case details', errors: [error.message] });
  }
};

const updateCaseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    const where = { id: req.params.id };
    if (req.user.role.name === 'CASE_MANAGER') {
      where.case_manager_id = req.user.id;
    }

    const singleCase = await Case.findOne({ where });
    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    const oldStatus = singleCase.status;
    await singleCase.update({ status, completed_at: status === 'COMPLETED' ? new Date() : null });

    const roleLabel = getRoleLabel(req.user);
    const desc = `${roleLabel} ${req.user.name} changed the case status from ${oldStatus} → ${status}`;

    await logAudit({
      req,
      entityType: 'Case',
      entityId: singleCase.id,
      leadId: singleCase.lead_id,
      action: 'CASE_STATUS_CHANGED',
      oldValue: oldStatus,
      newValue: status,
      description: desc
    });

    return res.status(200).json({ success: true, data: singleCase });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update case status', errors: [error.message] });
  }
};

const addCaseNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note) return res.status(400).json({ success: false, message: 'Note text is required' });

    const where = { id };
    if (req.user.role.name === 'CASE_MANAGER') {
      where.case_manager_id = req.user.id;
    }

    const singleCase = await Case.findOne({ where });
    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    const roleLabel = getRoleLabel(req.user);
    const desc = `${roleLabel} ${req.user.name} added note: ${note}`;

    const activity = await logAudit({
      req,
      entityType: 'Case',
      entityId: singleCase.id,
      leadId: singleCase.lead_id,
      action: 'ADD_CASE_NOTE',
      description: desc
    });

    return res.status(201).json({ success: true, message: 'Note added successfully', data: activity });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add note', errors: [error.message] });
  }
};

const exportCases = async (req, res) => {
  try {
    const { status, case_manager_id, search } = req.query;
    const where = {};

    if (req.user.role.name === 'CASE_MANAGER') {
      where.case_manager_id = req.user.id;
    } else if (case_manager_id) {
      where.case_manager_id = case_manager_id;
    }

    if (status) where.status = status;

    const leadInclude = {
      model: Lead,
      attributes: ['id', 'client_name', 'mobile', 'email', 'country', 'city']
    };

    if (search) {
      leadInclude.where = {
        [Op.or]: [
          { client_name: { [Op.like]: `%${search}%` } },
          { mobile: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const cases = await Case.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        leadInclude,
        { model: User, as: 'caseManager', attributes: ['id', 'name', 'email'] }
      ]
    });

    let csv = '\ufeffCase Number,Client Name,Email,Case Manager,Case Status,Created Date\n';
    cases.forEach(c => {
      const clientName = (c.Lead?.client_name || '').replace(/"/g, '""');
      const email = (c.Lead?.email || '').replace(/"/g, '""');
      const managerName = c.caseManager ? c.caseManager.name : 'Unassigned';
      const createdAtDate = c.created_at || c.createdAt || new Date();

      csv += `"${c.case_number}","${clientName}","${email}","${managerName}","${c.status}","${createdAtDate.toISOString().split('T')[0]}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=cases.csv');
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to export cases', errors: [error.message] });
  }
};

const deleteCase = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role.name === 'CASE_MANAGER') {
      where.case_manager_id = req.user.id;
    }

    const singleCase = await Case.findOne({ where });
    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    await singleCase.destroy();

    const roleLabel = getRoleLabel(req.user);
    await logAudit({
      req,
      entityType: 'Case',
      entityId: req.params.id,
      leadId: singleCase.lead_id,
      action: 'DELETE_CASE',
      description: `${roleLabel} ${req.user.name} deleted Case ${singleCase.case_number}`
    });

    return res.status(200).json({ success: true, message: 'Case deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete case', errors: [error.message] });
  }
};

const bulkDeleteCases = async (req, res) => {
  try {
    const { case_ids } = req.body;
    if (!case_ids || !Array.isArray(case_ids) || case_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Case IDs array is required' });
    }

    const where = { id: { [Op.in]: case_ids } };
    if (req.user.role.name === 'CASE_MANAGER') {
      where.case_manager_id = req.user.id;
    }

    const count = await Case.destroy({ where });

    const roleLabel = getRoleLabel(req.user);
    await logAudit({
      req,
      entityType: 'Case',
      action: 'BULK_DELETE_CASES',
      description: `${roleLabel} ${req.user.name} bulk deleted ${count} cases`
    });

    return res.status(200).json({ success: true, message: `Successfully deleted ${count} cases` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete cases', errors: [error.message] });
  }
};

const formatLeadDiffsInCase = (oldObj, newObj) => {
  if (!oldObj || !newObj) return '';
  const fields = {
    client_name: 'Client Name',
    mobile: 'Mobile Number',
    email: 'Email',
    country: 'Country',
    nationality: 'Nationality',
    city: 'City',
    lead_source: 'Lead Source',
    service_required: 'Service',
    package_amount: 'Package Deal',
    paid_amount: 'Paid Amount',
    pending_amount: 'Pending Balance',
    profit: 'Profit Margin',
    status: 'Status',
    notes: 'Notes',
    adults: 'Adults',
    kids: 'Kids'
  };

  const diffs = [];
  for (const [k, label] of Object.entries(fields)) {
    if (oldObj[k] !== undefined && newObj[k] !== undefined) {
      let o = oldObj[k];
      let n = newObj[k];
      if (String(o || '').trim() !== String(n || '').trim()) {
        let formattedOld = o !== null && o !== undefined && o !== '' ? o : 'None';
        let formattedNew = n !== null && n !== undefined && n !== '' ? n : 'None';
        if (['package_amount', 'paid_amount', 'pending_amount', 'profit'].includes(k)) {
          formattedOld = `AED ${parseFloat(formattedOld || 0).toFixed(2)}`;
          formattedNew = `AED ${parseFloat(formattedNew || 0).toFixed(2)}`;
        }
        diffs.push(`${label}: "${formattedOld}" → "${formattedNew}"`);
      }
    }
  }
  return diffs.join(', ');
};

const getCaseInteractions = async (req, res) => {
  try {
    const { id } = req.params;
    const singleCase = await Case.findByPk(id);

    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    const caseActivities = await ActivityLog.findAll({
      where: { entity_type: 'Case', entity_id: singleCase.id },
      include: [{
        model: User,
        attributes: ['id', 'name', 'email'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
      }],
      order: [['created_at', 'DESC']]
    });

    const leadActivities = await ActivityLog.findAll({
      where: { entity_type: 'Lead', entity_id: singleCase.lead_id },
      include: [{
        model: User,
        attributes: ['id', 'name', 'email'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
      }],
      order: [['created_at', 'DESC']]
    });

    const leadInteractions = await LeadInteraction.findAll({
      where: { lead_id: singleCase.lead_id },
      include: [{
        model: User,
        attributes: ['id', 'name', 'email'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
      }],
      order: [['interaction_date', 'DESC']]
    });

    const mapActivity = (a, defaultSource, defaultRole) => {
      const data = a.toJSON ? a.toJSON() : a;
      const roleLabel = getRoleLabel(data.User);
      const roleName = data.User?.role?.name || defaultRole;

      let notesText = data.description || '';
      if (data.old_value && data.new_value) {
        try {
          const oldO = JSON.parse(data.old_value);
          const newO = JSON.parse(data.new_value);
          const diffStr = formatLeadDiffsInCase(oldO, newO);
          if (diffStr && (!notesText || !notesText.includes(':'))) {
            notesText = `${notesText}: ${diffStr}`;
          }
        } catch (e) { }
      }

      return {
        id: `act-${data.id}`,
        source: defaultSource,
        team_label: `${roleLabel} Team`,
        author: data.User ? data.User.name : 'System User',
        author_role: roleName,
        interaction_type: data.action === 'ADD_CASE_NOTE' ? 'NOTE' : (data.action === 'CASE_STATUS_CHANGED' ? 'STATUS_UPDATE' : (data.action || 'SYSTEM')),
        notes: notesText,
        old_status: data.old_value,
        new_status: data.new_value,
        created_at: data.created_at || data.createdAt
      };
    };

    const combined = [
      ...caseActivities.map(a => mapActivity(a, 'CASE_TEAM', 'CASE_MANAGER')),
      ...leadActivities.map(a => mapActivity(a, 'SALES_TEAM', 'COUNSELOR')),
      ...leadInteractions.map(i => {
        const data = i.toJSON ? i.toJSON() : i;
        const roleLabel = getRoleLabel(data.User);
        const roleName = data.User?.role?.name || 'COUNSELOR';
        return {
          id: `li-${data.id}`,
          source: 'SALES_TEAM',
          team_label: `${roleLabel} Team`,
          author: data.User ? data.User.name : 'Salesperson',
          author_role: roleName,
          interaction_type: data.interaction_type || 'CALL',
          notes: data.notes || '',
          old_status: data.old_status,
          new_status: data.new_status,
          created_at: data.interaction_date || data.created_at || data.createdAt
        };
      })
    ];

    // Filter duplicates by checking timestamp & notes key
    const uniqueCombined = [];
    const seen = new Set();
    for (const item of combined) {
      const timeKey = Math.floor(new Date(item.created_at).getTime() / 2000); // 2-sec window
      const key = `${item.author}-${item.notes}-${timeKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCombined.push(item);
      }
    }

    uniqueCombined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({ success: true, data: uniqueCombined });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve case interactions', errors: [error.message] });
  }
};

const addCaseInteraction = async (req, res) => {
  try {
    const { id } = req.params;
    const { interaction_type, notes, new_status } = req.body;

    if (!notes) {
      return res.status(400).json({ success: false, message: 'Interaction details / notes are required' });
    }

    const singleCase = await Case.findByPk(id, { include: [Lead] });
    if (!singleCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const oldStatus = singleCase.status;
    let statusChanged = false;

    if (new_status && new_status !== oldStatus) {
      await singleCase.update({ status: new_status });
      statusChanged = true;
    }

    const roleLabel = getRoleLabel(req.user);
    const desc = statusChanged
      ? `${roleLabel} ${req.user.name} changed case status from ${oldStatus} → ${new_status} (${interaction_type || 'CALL'}: ${notes})`
      : `${roleLabel} ${req.user.name} added note: ${notes}`;

    const activity = await logAudit({
      req,
      entityType: 'Case',
      entityId: singleCase.id,
      leadId: singleCase.lead_id,
      action: statusChanged ? 'CASE_STATUS_CHANGED' : 'ADD_CASE_NOTE',
      oldValue: statusChanged ? oldStatus : null,
      newValue: statusChanged ? new_status : null,
      description: desc
    });

    return res.status(201).json({
      success: true,
      message: 'Interaction logged successfully',
      data: activity
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to log case interaction', errors: [error.message] });
  }
};

module.exports = {
  convertLeadToCase,
  getCases,
  getCaseById,
  updateCase,
  deleteCase,
  bulkDeleteCases,
  updateCaseStatus,
  addCaseNote,
  exportCases,
  getCaseInteractions,
  addCaseInteraction
};

