const fs = require('fs');
const path = require('path');
const { sequelize, Payment, Case, CasePackage, ActivityLog, Notification, Lead, User, Role } = require('../models');

const getPayments = async (req, res) => {
  try {
    const where = {};
    const caseInclude = {
      model: Case,
      attributes: ['id', 'case_number', 'case_manager_id'],
      include: [{ model: Lead, attributes: ['id', 'client_name'] }]
    };

    if (req.user.role.name === 'CASE_MANAGER') {
      caseInclude.where = { case_manager_id: req.user.id };
    }

    const list = await Payment.findAll({
      where,
      include: [
        caseInclude,
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      order: [['payment_date', 'DESC']]
    });

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
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
    const singleCase = await Case.findByPk(id);
    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    if (req.user.role.name === 'CASE_MANAGER' && singleCase.case_manager_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const cp = await CasePackage.findOne({
      where: { case_id: id },
      order: [['assigned_at', 'DESC']]
    });

    const packageAmount = cp ? parseFloat(cp.package_amount) : 0;
    const totalPaid = await Payment.sum('amount', { where: { case_id: id } }) || 0;
    const balance = packageAmount - totalPaid;

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

    const packageAmount = cp ? parseFloat(cp.package_amount) : 0;
    const totalPaid = await Payment.sum('amount', { where: { case_id: singleCase.id }, transaction }) || 0;
    const balance = packageAmount - totalPaid;

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
      await Notification.create({
        user_id: admin.id,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Logged',
        message: `A payment of ${amount} was logged on Case ${singleCase.case_number} (${singleCase.Lead.client_name})`,
        entity_type: 'Case',
        entity_id: singleCase.id
      }, { transaction });
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
