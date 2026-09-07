const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize, Payment, Case, CasePackage, ActivityLog, Notification, Lead, User, Role } = require('../models');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../utils/auditLogger');

const getRoleLabel = (user) => {
  const name = user?.role?.name || user?.role || 'User';
  if (name === 'ADMIN') return 'Admin';
  if (name === 'LEAD_MANAGER' || name === 'MANAGER') return 'Manager';
  if (name === 'CASE_MANAGER') return 'Case Manager';
  if (name === 'COUNSELOR') return 'Counselor';
  return name;
};

const getPayments = async (req, res) => {
  try {
    const roleName = req.user.role?.name || (typeof req.user.role === 'string' ? req.user.role : '');
    const caseWhere = {};

    if (roleName === 'CASE_MANAGER') {
      caseWhere.case_manager_id = req.user.id;
    }

    const leadInclude = {
      model: Lead,
      attributes: ['id', 'lead_number', 'client_name', 'mobile', 'email', 'service_required', 'package_amount', 'paid_amount', 'pending_amount', 'counselor_id', 'created_by'],
      include: [{ model: User, as: 'counselor', attributes: ['id', 'name'] }]
    };

    if (roleName === 'COUNSELOR') {
      leadInclude.where = {
        [Op.or]: [
          { counselor_id: req.user.id },
          { created_by: req.user.id }
        ]
      };
      leadInclude.required = true;
    }

    const caseInclude = {
      model: Case,
      include: [
        leadInclude,
        { model: User, as: 'caseManager', attributes: ['id', 'name', 'email'] },
        { model: CasePackage, as: 'casePackages', attributes: ['id', 'package_amount'] }
      ]
    };

    if (roleName === 'CASE_MANAGER') {
      caseInclude.where = caseWhere;
      caseInclude.required = true;
    } else if (roleName === 'COUNSELOR') {
      caseInclude.required = true;
    }

    const explicitPayments = await Payment.findAll({
      include: [
        caseInclude,
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      order: [['id', 'DESC']]
    });

    let initialLeadPayments = [];
    if (roleName !== 'CASE_MANAGER') {
      const leadWhere = { paid_amount: { [Op.gt]: 0 } };
      if (roleName === 'COUNSELOR') {
        leadWhere[Op.or] = [
          { counselor_id: req.user.id },
          { created_by: req.user.id }
        ];
      }

      const leadsWithInitialPayments = await Lead.findAll({
        where: leadWhere,
        include: [
          { model: User, as: 'counselor', attributes: ['id', 'name'] },
          { model: User, as: 'creator', attributes: ['id', 'name'] }
        ]
      });

      const leadIdsWithCases = new Set(explicitPayments.map(p => p.Case?.Lead?.id).filter(Boolean));

      for (const lead of leadsWithInitialPayments) {
        if (!leadIdsWithCases.has(lead.id)) {
          const c = await Case.findOne({
            where: { lead_id: lead.id },
            include: [
              { model: User, as: 'caseManager', attributes: ['id', 'name', 'email'] }
            ]
          });

          initialLeadPayments.push({
            id: `lead-init-${lead.id}`,
            amount: lead.paid_amount,
            payment_date: lead.payment_date || lead.created_at,
            payment_method: 'CASH',
            transaction_id: 'INITIAL_LEAD_PAYMENT',
            notes: 'Initial payment recorded during lead entry',
            created_by: lead.created_by,
            status: 'APPROVED',
            creator: lead.creator ? { name: lead.creator.name } : { name: 'Staff' },
            Case: c ? {
              id: c.id,
              case_number: c.case_number,
              caseManager: c.caseManager,
              Lead: lead
            } : {
              id: null,
              case_number: lead.lead_number,
              Lead: lead
            }
          });
        }
      }
    }

    const combinedPayments = [
      ...explicitPayments.map(p => p.toJSON ? p.toJSON() : p),
      ...initialLeadPayments
    ];

    return res.status(200).json({ success: true, data: combinedPayments });
  } catch (error) {
    console.error('Error in getPayments:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payments', errors: [error.message] });
  }
};

const getCasePayments = async (req, res) => {
  try {
    const { id } = req.params;
    const singleCase = await Case.findByPk(id, { include: [Lead] });
    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    const roleName = req.user.role?.name || (typeof req.user.role === 'string' ? req.user.role : '');
    if (roleName === 'CASE_MANAGER' && singleCase.case_manager_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this case.' });
    }

    if (roleName === 'COUNSELOR' && singleCase.Lead?.counselor_id !== req.user.id && singleCase.Lead?.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this lead/client.' });
    }

    const list = await Payment.findAll({
      where: { case_id: id },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['payment_date', 'DESC']]
    });

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve case payments', errors: [error.message] });
  }
};

const getCasePaymentSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const singleCase = await Case.findByPk(id, { include: [Lead] });
    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    const roleName = req.user.role?.name || (typeof req.user.role === 'string' ? req.user.role : '');
    if (roleName === 'CASE_MANAGER' && singleCase.case_manager_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this case.' });
    }

    if (roleName === 'COUNSELOR' && singleCase.Lead?.counselor_id !== req.user.id && singleCase.Lead?.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this lead/client.' });
    }

    const cp = await CasePackage.findOne({
      where: { case_id: id },
      order: [['assigned_at', 'DESC']]
    });

    const packageAmount = cp ? parseFloat(cp.package_amount) : (singleCase.Lead?.package_amount ? parseFloat(singleCase.Lead.package_amount) : 0);
    const paymentCount = await Payment.count({ where: { case_id: id } });
    const approvedSum = await Payment.sum('amount', { where: { case_id: id, status: 'APPROVED' } }) || 0;
    const awaitingSum = await Payment.sum('amount', { where: { case_id: id, status: 'PENDING' } }) || 0;
    
    let totalReceived = 0;
    let approvedAmount = 0;
    let awaitingApprovalAmount = 0;

    if (paymentCount > 0) {
      approvedAmount = parseFloat(approvedSum);
      awaitingApprovalAmount = parseFloat(awaitingSum);
      totalReceived = approvedAmount + awaitingApprovalAmount;
    } else {
      totalReceived = singleCase.Lead?.paid_amount ? parseFloat(singleCase.Lead.paid_amount) : 0;
      approvedAmount = totalReceived;
      awaitingApprovalAmount = 0;
    }

    const pendingBalance = Math.max(0, packageAmount - totalReceived);
    const balance = Math.max(0, packageAmount - approvedAmount);

    let paymentStatus = 'UNPAID';
    if (approvedAmount >= packageAmount && packageAmount > 0) {
      paymentStatus = 'FULLY_PAID';
    } else if (totalReceived > 0) {
      paymentStatus = 'PARTIAL';
    }

    return res.status(200).json({
      success: true,
      data: {
        packageAmount,
        totalReceived,
        approvedAmount,
        awaitingApprovalAmount,
        pendingBalance,
        totalPaid: totalReceived,
        balance,
        paymentStatus
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to calculate payment summary', errors: [error.message] });
  }
};

const addPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { amount, payment_date, payment_method, transaction_id, notes } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Valid positive payment amount is required' });
    }

    if (payment_date) {
      const pDateStr = new Date(payment_date).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      if (pDateStr > todayStr) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Payment date cannot be greater than the current date.' });
      }
    }

    const singleCase = await Case.findByPk(id, { include: [Lead], transaction });
    if (!singleCase) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const roleName = req.user.role?.name || (typeof req.user.role === 'string' ? req.user.role : '');
    if (roleName === 'CASE_MANAGER' && singleCase.case_manager_id !== req.user.id) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this case.' });
    }

    if (roleName === 'COUNSELOR' && singleCase.Lead?.counselor_id !== req.user.id && singleCase.Lead?.created_by !== req.user.id) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this lead/client.' });
    }

    const userRole = req.user.role?.name || req.user.role;
    const initialStatus = ['ADMIN', 'LEAD_MANAGER'].includes(userRole) ? 'APPROVED' : 'PENDING';

    const payment = await Payment.create({
      case_id: singleCase.id,
      amount,
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      payment_method: payment_method || 'CASH',
      transaction_id,
      notes,
      receipt_path: req.file ? req.file.path : null,
      created_by: req.user.id,
      status: initialStatus
    }, { transaction });

    const cp = await CasePackage.findOne({
      where: { case_id: singleCase.id },
      order: [['assigned_at', 'DESC']],
      transaction
    });

    const packageAmount = cp ? parseFloat(cp.package_amount) : (singleCase.Lead?.package_amount ? parseFloat(singleCase.Lead.package_amount) : 0);
    const approvedSum = await Payment.sum('amount', { where: { case_id: singleCase.id, status: 'APPROVED' }, transaction }) || 0;
    const balance = Math.max(0, packageAmount - approvedSum);

    if (singleCase.Lead) {
      await singleCase.Lead.update({
        paid_amount: approvedSum,
        pending_amount: balance
      }, { transaction });
    }

    let paymentStatus = 'PENDING';
    if (approvedSum >= packageAmount && packageAmount > 0) {
      paymentStatus = 'FULLY_PAID';
    } else if (approvedSum > 0) {
      paymentStatus = 'PARTIAL';
    }

    const roleLabel = getRoleLabel(req.user);
    const formattedAmount = `AED ${parseFloat(amount).toLocaleString()}`;
    const statusNote = initialStatus === 'APPROVED' ? 'APPROVED & CONFIRMED' : 'PENDING MANAGER APPROVAL';
    const desc = `${roleLabel} ${req.user.name} submitted payment of ${formattedAmount} via ${payment_method || 'CASH'} (${statusNote})`;

    await logAudit({
      req,
      entityType: 'Case',
      entityId: singleCase.id,
      leadId: singleCase.lead_id,
      action: 'PAYMENT_RECEIVED',
      oldValue: `Paid: AED ${approvedSum.toLocaleString()}`,
      newValue: `New Payment: ${formattedAmount} (${initialStatus})`,
      description: desc,
      transaction
    });

    const admins = await User.findAll({
      include: [{ model: Role, as: 'role', where: { name: ['ADMIN', 'LEAD_MANAGER'] } }],
      transaction
    });

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: 'PAYMENT_RECEIVED',
        title: initialStatus === 'APPROVED' ? 'Payment Approved' : 'Payment Needs Approval',
        message: `A payment of ${formattedAmount} was logged on Case ${singleCase.case_number} (${singleCase.Lead?.client_name}) - Status: ${initialStatus}`,
        entityType: 'Case',
        entityId: singleCase.id
      });
    }

    await transaction.commit();
    return res.status(201).json({ success: true, data: { payment, summary: { packageAmount, totalPaid: approvedSum, balance, paymentStatus } } });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to process payment', errors: [error.message] });
  }
};

const approvePayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userRole = req.user.role?.name || req.user.role;
    if (!['ADMIN', 'LEAD_MANAGER'].includes(userRole)) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Only Admin or Manager can approve payments' });
    }

    const payment = await Payment.findByPk(id, {
      include: [{ model: Case, include: [Lead] }],
      transaction
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const oldStatus = payment.status || 'PENDING';
    await payment.update({ status: 'APPROVED' }, { transaction });

    const caseId = payment.case_id;
    const singleCase = payment.Case;

    const cp = await CasePackage.findOne({
      where: { case_id: caseId },
      order: [['assigned_at', 'DESC']],
      transaction
    });

    const packageAmount = cp ? parseFloat(cp.package_amount) : (singleCase?.Lead?.package_amount ? parseFloat(singleCase.Lead.package_amount) : 0);
    const approvedSum = await Payment.sum('amount', { where: { case_id: caseId, status: 'APPROVED' }, transaction }) || 0;
    const balance = Math.max(0, packageAmount - approvedSum);

    if (singleCase?.Lead) {
      await singleCase.Lead.update({
        paid_amount: approvedSum,
        pending_amount: balance
      }, { transaction });
    }

    const roleLabel = getRoleLabel(req.user);
    const formattedAmount = `AED ${parseFloat(payment.amount).toLocaleString()}`;
    const desc = `${roleLabel} ${req.user.name} approved payment of ${formattedAmount} for Case ${singleCase?.case_number || caseId}`;

    await logAudit({
      req,
      entityType: 'Case',
      entityId: caseId,
      leadId: singleCase?.lead_id,
      action: 'PAYMENT_APPROVED',
      oldValue: oldStatus,
      newValue: 'APPROVED',
      description: desc,
      transaction
    });

    await transaction.commit();
    return res.status(200).json({ success: true, message: 'Payment approved successfully', data: payment });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to approve payment', errors: [error.message] });
  }
};

const rejectPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userRole = req.user.role?.name || req.user.role;
    if (!['ADMIN', 'LEAD_MANAGER'].includes(userRole)) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Only Admin or Manager can reject payments' });
    }

    const payment = await Payment.findByPk(id, {
      include: [{ model: Case, include: [Lead] }],
      transaction
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const oldStatus = payment.status || 'PENDING';
    await payment.update({ status: 'REJECTED' }, { transaction });

    const caseId = payment.case_id;
    const singleCase = payment.Case;

    const cp = await CasePackage.findOne({
      where: { case_id: caseId },
      order: [['assigned_at', 'DESC']],
      transaction
    });

    const packageAmount = cp ? parseFloat(cp.package_amount) : (singleCase?.Lead?.package_amount ? parseFloat(singleCase.Lead.package_amount) : 0);
    const approvedSum = await Payment.sum('amount', { where: { case_id: caseId, status: 'APPROVED' }, transaction }) || 0;
    const balance = Math.max(0, packageAmount - approvedSum);

    if (singleCase?.Lead) {
      await singleCase.Lead.update({
        paid_amount: approvedSum,
        pending_amount: balance
      }, { transaction });
    }

    const roleLabel = getRoleLabel(req.user);
    const formattedAmount = `AED ${parseFloat(payment.amount).toLocaleString()}`;
    const desc = `${roleLabel} ${req.user.name} rejected payment of ${formattedAmount} for Case ${singleCase?.case_number || caseId}`;

    await logAudit({
      req,
      entityType: 'Case',
      entityId: caseId,
      leadId: singleCase?.lead_id,
      action: 'PAYMENT_REJECTED',
      oldValue: oldStatus,
      newValue: 'REJECTED',
      description: desc,
      transaction
    });

    await transaction.commit();
    return res.status(200).json({ success: true, message: 'Payment rejected successfully', data: payment });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to reject payment', errors: [error.message] });
  }
};

const downloadPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id, {
      include: [{
        model: Case,
        attributes: ['id', 'case_manager_id'],
        include: [{ model: Lead, attributes: ['id', 'counselor_id', 'created_by'] }]
      }]
    });

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });
    if (!payment.receipt_path) return res.status(404).json({ success: false, message: 'No receipt file uploaded for this payment' });

    const roleName = req.user.role?.name || (typeof req.user.role === 'string' ? req.user.role : '');
    if (roleName === 'CASE_MANAGER' && payment.Case?.case_manager_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this case.' });
    }
    if (roleName === 'COUNSELOR' && payment.Case?.Lead?.counselor_id !== req.user.id && payment.Case?.Lead?.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this lead/client.' });
    }

    const absolutePath = path.resolve(payment.receipt_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'Physical file not found on disk' });
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to download receipt', errors: [error.message] });
  }
};

const bulkDeletePayments = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userRole = req.user.role?.name || req.user.role;
    if (!['ADMIN', 'LEAD_MANAGER'].includes(userRole)) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Only Admin or Manager can bulk delete payments' });
    }

    const { payment_ids } = req.body;
    if (!Array.isArray(payment_ids) || payment_ids.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No payment IDs provided for deletion' });
    }

    const virtualLeadIds = [];
    const realPaymentIds = [];

    payment_ids.forEach(id => {
      if (typeof id === 'string' && id.startsWith('lead-init-')) {
        const leadId = parseInt(id.replace('lead-init-', ''));
        if (!isNaN(leadId)) virtualLeadIds.push(leadId);
      } else {
        const pId = parseInt(id);
        if (!isNaN(pId)) realPaymentIds.push(pId);
      }
    });

    if (virtualLeadIds.length > 0) {
      const leads = await Lead.findAll({ where: { id: virtualLeadIds }, transaction });
      for (const lead of leads) {
        await lead.update({
          paid_amount: 0,
          pending_amount: lead.package_amount
        }, { transaction });
      }
    }

    if (realPaymentIds.length > 0) {
      const payments = await Payment.findAll({
        where: { id: realPaymentIds },
        include: [{ model: Case, include: [Lead] }],
        transaction
      });

      const affectedCaseIds = new Set();
      for (const p of payments) {
        if (p.receipt_path && fs.existsSync(p.receipt_path)) {
          try { fs.unlinkSync(p.receipt_path); } catch (e) {}
        }
        if (p.case_id) affectedCaseIds.add(p.case_id);
      }

      await Payment.destroy({ where: { id: realPaymentIds }, transaction });

      for (const caseId of affectedCaseIds) {
        const singleCase = await Case.findByPk(caseId, { include: [Lead], transaction });
        if (singleCase) {
          const cp = await CasePackage.findOne({
            where: { case_id: caseId },
            order: [['assigned_at', 'DESC']],
            transaction
          });
          const packageAmount = cp ? parseFloat(cp.package_amount) : (singleCase.Lead?.package_amount ? parseFloat(singleCase.Lead.package_amount) : 0);
          const approvedSum = await Payment.sum('amount', { where: { case_id: caseId, status: 'APPROVED' }, transaction }) || 0;
          const balance = Math.max(0, packageAmount - approvedSum);

          if (singleCase.Lead) {
            await singleCase.Lead.update({
              paid_amount: approvedSum,
              pending_amount: balance
            }, { transaction });
          }
        }
      }
    }

    const roleLabel = getRoleLabel(req.user);
    await logAudit({
      req,
      entityType: 'Payment',
      entityId: 0,
      action: 'BULK_DELETE_PAYMENTS',
      oldValue: `Deleted Payment IDs: ${payment_ids.join(', ')}`,
      newValue: 'DELETED',
      description: `${roleLabel} ${req.user.name} bulk deleted ${payment_ids.length} payment record(s)`,
      transaction
    });

    await transaction.commit();
    return res.status(200).json({ success: true, message: `Successfully deleted ${payment_ids.length} payment record(s)` });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to bulk delete payments', errors: [error.message] });
  }
};

module.exports = {
  getPayments,
  getCasePayments,
  getCasePaymentSummary,
  addPayment,
  approvePayment,
  rejectPayment,
  downloadPaymentReceipt,
  bulkDeletePayments
};
