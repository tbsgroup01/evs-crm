const { sequelize, Case, Lead, User, Role, ActivityLog, Notification, CasePackage, Payment, LeadInteraction, Package } = require('../models');

const convertLeadToCase = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
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
    const paidAmt = parseFloat(paid_amount !== undefined && paid_amount !== null && paid_amount !== '' ? paid_amount : (lead.paid_amount || 0));
    const pendingAmt = Math.max(0, pkgAmt - paidAmt);
    const numAdults = parseInt(adults !== undefined && adults !== null && adults !== '' ? adults : (lead.adults || 1));
    const numKids = parseInt(kids !== undefined && kids !== null && kids !== '' ? kids : (lead.kids || 0));
    const totalPax = numAdults + numKids;
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

    const canManageProfit = ['ADMIN', 'LEAD_MANAGER'].includes(req.user.role?.name || req.user.role);
    const leadUpdates = {
      status: 'CONVERTED',
      nationality: nationality || lead.nationality || lead.country || null,
      service_required: service_required || lead.service_required || null,
      package_amount: pkgAmt,
      paid_amount: paidAmt,
      pending_amount: pendingAmt,
      payment_date: formattedPayDateStr,
      adults: numAdults,
      kids: numKids,
      total_pax: totalPax,
      notes: notes !== undefined ? notes : lead.notes
    };

    if (canManageProfit && profit !== undefined && profit !== null && profit !== '') {
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

    if (paidAmt > 0) {
      await Payment.create({
        case_id: newCase.id,
        amount: paidAmt,
        payment_date: validPayDate,
        payment_method: 'CASH',
        notes: `Initial lead conversion payment`,
        created_by: req.user.id
      }, { transaction });
    }

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'CONVERT_LEAD',
      old_value: lead.status,
      new_value: 'CONVERTED',
      description: `Lead ${lead.lead_number} successfully converted to Case ${finalCaseNumber}`,
      ip_address: req.ip
    }, { transaction });

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
      attributes: ['id', 'client_name', 'mobile', 'email', 'country', 'nationality', 'city', 'counselor_id']
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
          { email: { [Op.like]: `%${search}%` } }
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
        { model: User, as: 'caseManager', attributes: ['id', 'name', 'email'] }
      ]
    });

    return res.status(200).json({
      success: true,
      data: {
        cases: rows,
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

    const oldVal = JSON.stringify(singleCase);
    await singleCase.update(req.body);

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: singleCase.id,
      action: 'UPDATE_CASE',
      old_value: oldVal,
      new_value: JSON.stringify(singleCase),
      description: `Case ${singleCase.case_number} details updated by ${req.user.name}`,
      ip_address: req.ip
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

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: singleCase.id,
      action: 'CASE_STATUS_CHANGED',
      old_value: oldStatus,
      new_value: status,
      description: `Case ${singleCase.case_number} status updated from ${oldStatus} to ${status}`,
      ip_address: req.ip
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

    const activity = await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: singleCase.id,
      action: 'ADD_CASE_NOTE',
      description: note,
      ip_address: req.ip
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

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: req.params.id,
      action: 'DELETE_CASE',
      description: `Case ${singleCase.case_number} deleted by ${req.user.name}`,
      ip_address: req.ip
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

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      action: 'BULK_DELETE_CASES',
      description: `Bulk deleted ${count} cases by ${req.user.name}`,
      ip_address: req.ip
    });

    return res.status(200).json({ success: true, message: `Successfully deleted ${count} cases` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete cases', errors: [error.message] });
  }
};

const getCaseInteractions = async (req, res) => {
  try {
    const { id } = req.params;
    const singleCase = await Case.findByPk(id);

    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    const leadInteractions = await LeadInteraction.findAll({
      where: { lead_id: singleCase.lead_id },
      include: [{
        model: User,
        attributes: ['id', 'name', 'email'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
      }],
      order: [['interaction_date', 'DESC']]
    });

    const caseActivities = await ActivityLog.findAll({
      where: { entity_type: 'Case', entity_id: singleCase.id },
      include: [{
        model: User,
        attributes: ['id', 'name', 'email'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
      }],
      order: [['created_at', 'DESC']]
    });

    const combined = [
      ...leadInteractions.map(i => {
        const data = i.toJSON();
        const roleName = data.User?.role?.name || 'COUNSELOR';
        return {
          id: `li-${data.id}`,
          source: 'SALES_TEAM',
          team_label: roleName === 'COUNSELOR' ? 'Sales Team (Counselor)' : 'Sales Team',
          author: data.User ? data.User.name : 'Salesperson',
          author_role: roleName,
          interaction_type: data.interaction_type || 'CALL',
          notes: data.notes || '',
          old_status: data.old_status,
          new_status: data.new_status,
          created_at: data.interaction_date || data.created_at
        };
      }),
      ...caseActivities.map(a => {
        const data = a.toJSON();
        const roleName = data.User?.role?.name || 'CASE_MANAGER';
        return {
          id: `ca-${data.id}`,
          source: 'CASE_TEAM',
          team_label: roleName === 'CASE_MANAGER' ? 'Case Management Team' : (roleName === 'ADMIN' ? 'Admin / Management' : 'Case Team'),
          author: data.User ? data.User.name : 'Case Staff',
          author_role: roleName,
          interaction_type: data.action === 'ADD_CASE_NOTE' ? 'NOTE' : (data.action === 'CASE_STATUS_CHANGED' ? 'STATUS_UPDATE' : data.action),
          notes: data.description || '',
          old_status: data.old_value,
          new_status: data.new_value,
          created_at: data.created_at
        };
      })
    ];

    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({ success: true, data: combined });
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

    if (singleCase.lead_id) {
      await LeadInteraction.create({
        lead_id: singleCase.lead_id,
        user_id: req.user.id,
        interaction_type: interaction_type || 'CALL',
        notes: notes,
        old_status: statusChanged ? oldStatus : null,
        new_status: statusChanged ? new_status : null,
        interaction_date: new Date()
      });
    }

    const activity = await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: singleCase.id,
      action: statusChanged ? 'CASE_STATUS_CHANGED' : 'ADD_CASE_NOTE',
      old_value: statusChanged ? oldStatus : null,
      new_value: statusChanged ? new_status : null,
      description: `${interaction_type || 'CALL'}: ${notes}`,
      ip_address: req.ip
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

