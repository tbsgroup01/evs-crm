const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5505),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USERNAME: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('evs-crm'),
  JWT_SECRET: z.string().default('evs_crm_jwt_secret_key_change_me_in_production'),
  JWT_REFRESH_SECRET: z.string().default('evs_crm_jwt_refresh_secret_key_change_me_in_production')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;
