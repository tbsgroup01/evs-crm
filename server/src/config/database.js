const env = require('./env');

const config = {
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD === '' ? null : env.DB_PASSWORD,
  database: env.DB_NAME,
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
};

module.exports = {
  development: config,
  test: config,
  production: config
};
