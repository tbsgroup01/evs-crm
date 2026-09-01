const { Op } = require('sequelize');
const { sequelize, Case, Lead, User, Role, ActivityLog, Notification } = require('../models');

const convertLeadToCase = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id, { transaction });

    if (!lead) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (lead.status !== 'INTERESTED') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Only Interested leads can be converted to cases' });
    }

    const existingCase = await Case.findOne({ where: { lead_id: id }, transaction });
    if (existingCase) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Lead already converted to a case' });
    }

    const maxId = await Case.max('id', { transaction }) || 0;
    const caseNumber = `CASE-${1000 + maxId + 1}`;

    const newCase = await Case.create({
      case_number: caseNumber,
      lead_id: lead.id,
      status: 'NEW',
      opened_at: new Date()
    }, { transaction });

    await lead.update({ status: 'CONVERTED' }, { transaction });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'CONVERT_LEAD',
      old_value: 'INTERESTED',
      new_value: 'CONVERTED',
      description: `Lead ${lead.lead_number} successfully converted to Case ${caseNumber}`,
      ip_address: req.ip
    }, { transaction });

    await transaction.commit();
    return res.status(201).json({ success: true, message: 'Lead successfully converted to Case', data: newCase });
  } catch (error) {
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

    const singleCase = await Case.findOne({
      where,
      include: [
        { model: Lead },
        { model: User, as: 'caseManager', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

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

module.exports = {
  convertLeadToCase,
  getCases,
  getCaseById,
  updateCase,
  deleteCase,
  bulkDeleteCases,
  updateCaseStatus,
  addCaseNote,
  exportCases
};

