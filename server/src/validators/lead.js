const { z } = require('zod');

const emptyToNull = (v) => (v === '' || v === undefined || v === null ? null : v);
const emptyToNullNumber = (v) => {
  if (v === '' || v === undefined || v === null || v === 0 || v === '0' || isNaN(Number(v))) return null;
  return Number(v);
};

const leadCreateSchema = z.object({
  client_name: z.string().min(1, 'Client name is required').max(100),
  mobile: z.string().min(5, 'Valid mobile number (min 5 digits) is required').max(20, 'Mobile number cannot exceed 20 characters'),
  email: z.preprocess(emptyToNull, z.string().email('Invalid email address').nullable().optional()),
  country: z.preprocess(emptyToNull, z.string().max(50).nullable().optional()),
  nationality: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().max(50).nullable().optional()),
  requirement: z.preprocess(emptyToNull, z.string().max(255).nullable().optional()),
  service_required: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
  adults: z.preprocess((v) => (v === '' || v === undefined || v === null ? 1 : Number(v)), z.number().int().nonnegative().optional()),
  kids: z.preprocess((v) => (v === '' || v === undefined || v === null ? 0 : Number(v)), z.number().int().nonnegative().optional()),
  total_pax: z.preprocess((v) => (v === '' || v === undefined || v === null ? 1 : Number(v)), z.number().int().nonnegative().optional()),
  package_amount: z.preprocess((v) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v)), z.number().nonnegative().nullable().optional()),
  paid_amount: z.preprocess((v) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v)), z.number().nonnegative().nullable().optional()),
  pending_amount: z.preprocess((v) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v)), z.number().nonnegative().nullable().optional()),
  payment_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
  profit: z.preprocess((v) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v)), z.number().nullable().optional()),
  lead_source: z.preprocess(emptyToNull, z.string().max(50).nullable().optional()),
  estimated_budget: z.preprocess(
    (v) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v)),
    z.number().nonnegative('Budget must be a non-negative number').nullable().optional()
  ),
  requirement_details: z.preprocess(emptyToNull, z.string().nullable().optional()),
  counselor_id: z.preprocess(
    emptyToNullNumber,
    z.number().int().positive().nullable().optional()
  ),
  status: z.enum(['NEW', 'INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'COLD_LEAD', 'CONVERTED']).default('NEW'),
  follow_up_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  remarks: z.preprocess(emptyToNull, z.string().nullable().optional())
});

const leadUpdateSchema = leadCreateSchema.partial();

const leadStatusSchema = z.object({
  status: z.enum(['NEW', 'INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'COLD_LEAD', 'CONVERTED'])
});

module.exports = { leadCreateSchema, leadUpdateSchema, leadStatusSchema };
