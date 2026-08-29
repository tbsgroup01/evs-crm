const { Sequelize } = require('sequelize');
const databaseConfig = require('../config/database');
const env = require('../config/env');

const config = databaseConfig[env.NODE_ENV] || databaseConfig.development;

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const models = {
  Role: require('./role')(sequelize),
  User: require('./user')(sequelize),
  Lead: require('./lead')(sequelize),
  LeadInteraction: require('./leadInteraction')(sequelize),
  LeadFollowUp: require('./leadFollowUp')(sequelize),
  LeadImport: require('./leadImport')(sequelize),
  Case: require('./case')(sequelize),
  CaseAssignment: require('./caseAssignment')(sequelize),
  DocumentType: require('./documentType')(sequelize),
  Document: require('./document')(sequelize),
  Package: require('./package')(sequelize),
  CasePackage: require('./casePackage')(sequelize),
  Payment: require('./payment')(sequelize),
  Notification: require('./notification')(sequelize),
  ActivityLog: require('./activityLog')(sequelize),
  Setting: require('./setting')(sequelize)
};

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
