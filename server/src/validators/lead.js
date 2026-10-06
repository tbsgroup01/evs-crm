const { z } = require('zod');

const emptyToNull = (v) => (v === '' || v === undefined || v === null ? null : v);
const emptyToNullNumber = (v) => {
  if (v === '' || v === undefined || v === null || v === 0 || v === '0' || isNaN(Number(v))) return null;
  return Number(v);
};

const phoneRegex = /^\+?[0-9]{7,15}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const leadCreateSchema = z.object({
  client_name: z.string().min(1, 'Client name is required').max(100),
  mobile: z.string({ required_error: 'Mobile number is required' })
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .refine((v) => phoneRegex.test(v), {
      message: 'Invalid mobile number. It must contain only numbers (optional leading +) and be between 7 and 15 digits.'
    }),
  email: z.preprocess(
    emptyToNull,
    z.string()
      .trim()
      .refine((v) => !v || emailRegex.test(v), {
        message: 'Invalid email address format (e.g. client@example.com)'
      })
      .nullable()
      .optional()
  ),
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
