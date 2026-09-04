const app = require('./app');
const { sequelize } = require('./models');
const env = require('./config/env');
const logger = require('./utils/logger');

const PORT = env.PORT || 5505;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MySQL Database connection established successfully.');

    await sequelize.sync();
    logger.info('Database models synchronized successfully.');

    try {
      const [results] = await sequelize.query("SHOW COLUMNS FROM payments LIKE 'status'");
      if (results.length === 0) {
        await sequelize.query("ALTER TABLE payments ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'PENDING';");
        logger.info('Added status column to payments table.');
      }

      const { Case, Lead, Payment, CasePackage } = require('./models');
      const allCases = await Case.findAll({ include: [Lead] });
      for (const c of allCases) {
        if (c.Lead) {
          const leadPkg = parseFloat(c.Lead.package_amount || 0);
          const cp = await CasePackage.findOne({
            where: { case_id: c.id },
            order: [['assigned_at', 'DESC']]
          });
          if (cp && parseFloat(cp.package_amount || 0) !== leadPkg) {
            await cp.update({ package_amount: leadPkg });
          }
          const paymentCount = await Payment.count({ where: { case_id: c.id } });
          const approvedSum = await Payment.sum('amount', { where: { case_id: c.id, status: 'APPROVED' } }) || 0;
          const paidAmt = paymentCount > 0 ? approvedSum : parseFloat(c.Lead.paid_amount || 0);
          const bal = Math.max(0, leadPkg - paidAmt);
          await c.Lead.update({ paid_amount: paidAmt, pending_amount: bal });

          // Ensure initial token payments preserve the original lead creator (Admin/Manager who added the lead)
          if (c.Lead.created_by) {
            const initialPayments = await Payment.findAll({ where: { case_id: c.id } });
            for (const p of initialPayments) {
              if (p.notes && (p.notes.includes('Initial lead token payment') || p.notes.includes('Initial lead conversion payment'))) {
                if (p.created_by !== c.Lead.created_by) {
                  await p.update({ created_by: c.Lead.created_by });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error checking/adding status column in payments table:', err.message);
    }

    app.listen(PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    });

  } catch (error) {
    logger.error('Error starting database/server connection:', error);
    process.exit(1);
  }
};

startServer();
