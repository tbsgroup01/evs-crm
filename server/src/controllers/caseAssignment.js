const { Op } = require('sequelize');
const { sequelize, Case, User, Role, CaseAssignment, ActivityLog, Notification, Lead } = require('../models');
const { createNotification } = require('../services/notificationService');
const { getRealIp } = require('../utils/ipHelper');

const getUnassignedCases = async (req, res) => {
  try {
    const cases = await Case.findAll({
      where: { case_manager_id: null },
      include: [{ model: Lead }],
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json({ success: true, data: cases });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch unassigned cases', errors: [error.message] });
  }
};

const assignCase = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { case_manager_id } = req.body;

    if (!case_manager_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Case Manager ID is required' });
    }

    const singleCase = await Case.findByPk(id, { transaction });
    if (!singleCase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const manager = await User.findByPk(case_manager_id, {
      include: [{ model: Role, as: 'role', where: { name: 'CASE_MANAGER' } }],
      transaction
    });

    if (!manager) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Case Manager not found or invalid role' });
    }

    const oldManagerId = singleCase.case_manager_id;
    await singleCase.update({ case_manager_id }, { transaction });

    await CaseAssignment.create({
      case_id: singleCase.id,
      case_manager_id,
      assigned_by: req.user.id,
      assigned_at: new Date()
    }, { transaction });

    await createNotification({
      userId: case_manager_id,
      type: 'CASE_ASSIGNED',
      title: 'New Case Assigned',
      message: `You have been assigned Case: ${singleCase.case_number}`,
      entityType: 'Case',
      entityId: singleCase.id
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: singleCase.id,
      action: 'ASSIGN_CASE',
      old_value: oldManagerId,
      new_value: case_manager_id,
      description: `Case ${singleCase.case_number} assigned to manager ${manager.name}`,
      ip_address: getRealIp(req)
    }, { transaction });

    await transaction.commit();
    return res.status(200).json({ success: true, message: 'Case assigned successfully', data: singleCase });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to assign case', errors: [error.message] });
  }
};

const bulkAssignCases = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { case_ids, case_manager_id } = req.body;

    if (!case_ids || !Array.isArray(case_ids) || case_ids.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Case IDs array is required' });
    }

    if (!case_manager_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Case Manager ID is required' });
    }

    const manager = await User.findByPk(case_manager_id, {
      include: [{ model: Role, as: 'role', where: { name: 'CASE_MANAGER' } }],
      transaction
    });

    if (!manager) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Case Manager not found' });
    }

    await Case.update(
      { case_manager_id },
      { where: { id: { [Op.in]: case_ids } }, transaction }
    );

    for (const cid of case_ids) {
      await CaseAssignment.create({
        case_id: cid,
        case_manager_id,
        assigned_by: req.user.id,
        assigned_at: new Date()
      }, { transaction });
    }

    await createNotification({
      userId: case_manager_id,
      type: 'CASE_ASSIGNED_BULK',
      title: 'Bulk Cases Assigned',
      message: `You have been bulk-assigned ${case_ids.length} cases.`,
      entityType: 'User',
      entityId: case_manager_id
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'User',
      entity_id: case_manager_id,
      action: 'BULK_ASSIGN_CASES',
      new_value: JSON.stringify({ case_ids, case_manager_id }),
      description: `Bulk assigned ${case_ids.length} cases to manager ${manager.name}`,
      ip_address: getRealIp(req)
    }, { transaction });

    await transaction.commit();
    return res.status(200).json({ success: true, message: `Successfully assigned ${case_ids.length} cases` });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed bulk assignment', errors: [error.message] });
  }
};

const getCaseManagerWorkload = async (req, res) => {
  try {
    const caseManagers = await User.findAll({
      include: [
        { model: Role, as: 'role', where: { name: 'CASE_MANAGER' } },
        { model: Case, as: 'managedCases', attributes: ['id', 'status'] }
      ]
    });

    const workload = caseManagers.map(cm => {
      const cases = cm.managedCases || [];
      return {
        case_manager_id: cm.id,
        case_manager_name: cm.name,
        total: cases.length,
        new: cases.filter(c => c.status === 'NEW').length,
        active: cases.filter(c => c.status === 'ACTIVE').length,
        pending: cases.filter(c => c.status === 'PENDING').length,
        on_hold: cases.filter(c => c.status === 'ON_HOLD').length,
        completed: cases.filter(c => c.status === 'COMPLETED').length
      };
    });

    return res.status(200).json({ success: true, data: workload });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch workloads', errors: [error.message] });
  }
};

module.exports = {
  getUnassignedCases,
  assignCase,
  bulkAssignCases,
  getCaseManagerWorkload
};
