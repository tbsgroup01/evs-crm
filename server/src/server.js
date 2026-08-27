const app = require('./app');
const { sequelize } = require('./models');
const env = require('./config/env');
const logger = require('./utils/logger');

const PORT = env.PORT || 5505;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MySQL Database connection established successfully.');

    app.listen(PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Error starting database/server connection:', error);
    process.exit(1);
  }
};

startServer();
