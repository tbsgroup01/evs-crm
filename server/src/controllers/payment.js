const fs = require('fs');
const path = require('path');
const { sequelize, Payment, Case, CasePackage, ActivityLog, Notification, Lead, User, Role } = require('../models');
const { createNotification } = require('../services/notificationService');

const getPayments = async (req, res) => {
  try {
    const roleName = req.user.role?.name || req.user.role;
    const caseWhere = {};

    const leadInclude = {
      model: Lead,
      attributes: ['id', 'lead_number', 'client_name', 'mobile', 'email', 'service_required', 'package_amount', 'paid_amount', 'pending_amount', 'payment_date', 'notes', 'counselor_id'],
      include: [{ model: User, as: 'counselor', attributes: ['id', 'name'] }]
    };

    if (roleName === 'CASE_MANAGER') {
      caseWhere.case_manager_id = req.user.id;
    } else if (roleName === 'COUNSELOR') {
      leadInclude.where = { counselor_id: req.user.id };
      leadInclude.required = true;
    }

    const cases = await Case.findAll({
      where: caseWhere,
      include: [
        leadInclude,
        { model: User, as: 'caseManager', attributes: ['id', 'name', 'email'] },
        { model: CasePackage, as: 'casePackages', attributes: ['id', 'package_amount'] },
        {
          model: Payment,
          as: 'payments',
          include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }]
        }
      ],
      order: [['id', 'DESC']]
    });

    const caseRecords = cases.map(c => {
      const caseData = c.toJSON();
      const casePayments = caseData.payments || [];
      const sumPayments = casePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const pkgAmt = parseFloat(caseData.casePackages?.[0]?.package_amount || caseData.Lead?.package_amount || 0);
      const effectivePaid = Math.max(sumPayments, parseFloat(caseData.Lead?.paid_amount || 0));
      const pendingAmt = Math.max(0, pkgAmt - effectivePaid);

      const latestPayment = casePayments.length > 0 ? casePayments[0] : null;
      const latestDate = latestPayment?.payment_date || caseData.Lead?.payment_date || caseData.opened_at || caseData.createdAt;

      return {
        id: caseData.id,
        amount: effectivePaid,
        package_amount: pkgAmt,
        pending_amount: pendingAmt,
        payment_date: latestDate,
        payment_method: latestPayment?.payment_method || (effectivePaid > 0 ? 'CASH/ONLINE' : 'DEAL_PACKAGE'),
        transaction_id: latestPayment?.transaction_id || caseData.case_number,
        notes: latestPayment?.notes || caseData.Lead?.notes || 'Case deal registered',
        receipt_path: latestPayment?.receipt_path || null,
        created_by: latestPayment?.created_by || caseData.Lead?.counselor_id || req.user.id,
        creator: latestPayment?.creator || (caseData.Lead?.counselor ? { id: caseData.Lead.counselor.id, name: caseData.Lead.counselor.name } : (caseData.caseManager ? { id: caseData.caseManager.id, name: caseData.caseManager.name } : null)),
        paymentCount: casePayments.length,
        Case: {
          id: caseData.id,
          case_number: caseData.case_number,
          case_manager_id: caseData.case_manager_id,
          status: caseData.status,
          lead_id: caseData.lead_id,
          Lead: {
            ...caseData.Lead,
            package_amount: pkgAmt,
            paid_amount: effectivePaid,
            pending_amount: pendingAmt
          },
          casePackages: caseData.casePackages
        }
      };
    });

    return res.status(200).json({ success: true, data: caseRecords });
  } catch (error) {
    console.error('Error in getPayments:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payments', errors: [error.message] });
  }
};

const getCasePayments = async (req, res) => {
  try {
    const { id } = req.params;
    const singleCase = await Case.findByPk(id);
    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    if (req.user.role.name === 'CASE_MANAGER' && singleCase.case_manager_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
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

    if (req.user.role.name === 'CASE_MANAGER' && singleCase.case_manager_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const cp = await CasePackage.findOne({
      where: { case_id: id },
      order: [['assigned_at', 'DESC']]
    });

    const packageAmount = cp ? parseFloat(cp.package_amount) : (singleCase.Lead?.package_amount ? parseFloat(singleCase.Lead.package_amount) : 0);
    const totalPaid = await Payment.sum('amount', { where: { case_id: id } }) || (singleCase.Lead?.paid_amount ? parseFloat(singleCase.Lead.paid_amount) : 0);
    const balance = Math.max(0, packageAmount - totalPaid);

    let paymentStatus = 'PENDING';
    if (totalPaid >= packageAmount && packageAmount > 0) {
      paymentStatus = 'FULLY_PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    return res.status(200).json({
      success: true,
      data: {
        packageAmount,
        totalPaid,
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

    const singleCase = await Case.findByPk(id, { include: [Lead], transaction });
    if (!singleCase) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (req.user.role.name === 'CASE_MANAGER' && singleCase.case_manager_id !== req.user.id) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const payment = await Payment.create({
      case_id: singleCase.id,
      amount,
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      payment_method: payment_method || 'CASH',
      transaction_id,
      notes,
      receipt_path: req.file ? req.file.path : null,
      created_by: req.user.id
    }, { transaction });

    const cp = await CasePackage.findOne({
      where: { case_id: singleCase.id },
      order: [['assigned_at', 'DESC']],
      transaction
    });

    const packageAmount = cp ? parseFloat(cp.package_amount) : (singleCase.Lead?.package_amount ? parseFloat(singleCase.Lead.package_amount) : 0);
    const totalPaid = await Payment.sum('amount', { where: { case_id: singleCase.id }, transaction }) || 0;
    const balance = Math.max(0, packageAmount - totalPaid);

    if (singleCase.Lead) {
      await singleCase.Lead.update({
        paid_amount: totalPaid,
        pending_amount: balance
      }, { transaction });
    }

    let paymentStatus = 'PENDING';
    if (totalPaid >= packageAmount && packageAmount > 0) {
      paymentStatus = 'FULLY_PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: singleCase.id,
      action: 'PAYMENT_RECEIVED',
      description: `Payment of ${amount} received via ${payment_method}. Transaction ID: ${transaction_id || 'N/A'}. Balance: ${balance.toFixed(2)}. Status: ${paymentStatus}`,
      ip_address: req.ip
    }, { transaction });

    const admins = await User.findAll({
      include: [{ model: Role, as: 'role', where: { name: ['ADMIN', 'LEAD_MANAGER'] } }],
      transaction
    });

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Logged',
        message: `A payment of ${amount} was logged on Case ${singleCase.case_number} (${singleCase.Lead.client_name})`,
        entityType: 'Case',
        entityId: singleCase.id
      });
    }

    await transaction.commit();
    return res.status(201).json({ success: true, data: { payment, summary: { packageAmount, totalPaid, balance, paymentStatus } } });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to process payment', errors: [error.message] });
  }
};

const downloadPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id, {
      include: [{ model: Case, attributes: ['id', 'case_manager_id'] }]
    });

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });
    if (!payment.receipt_path) return res.status(404).json({ success: false, message: 'No receipt file uploaded for this payment' });

    if (req.user.role.name === 'CASE_MANAGER') {
      if (payment.Case.case_manager_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
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

module.exports = {
  getPayments,
  getCasePayments,
  getCasePaymentSummary,
  addPayment,
  downloadPaymentReceipt
};
