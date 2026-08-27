const { z } = require('zod');

const leadCreateSchema = z.object({
  client_name: z.string().min(1, 'Client name is required').max(100),
  mobile: z.string().min(5, 'Valid mobile is required').max(20),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
  city: z.string().max(50).optional().or(z.literal('')),
  requirement: z.string().max(255).optional().or(z.literal('')),
  service_required: z.string().max(100).optional().or(z.literal('')),
  lead_source: z.string().max(50).optional().or(z.literal('')),
  estimated_budget: z.coerce.number().nonnegative().optional(),
  requirement_details: z.string().optional().or(z.literal('')),
  counselor_id: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['NEW', 'INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'COLD_LEAD', 'CONVERTED']).default('NEW'),
  follow_up_date: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()).or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  remarks: z.string().optional().or(z.literal(''))
});

const leadUpdateSchema = leadCreateSchema.partial();

const leadStatusSchema = z.object({
  status: z.enum(['NEW', 'INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'COLD_LEAD', 'CONVERTED'])
});

module.exports = { leadCreateSchema, leadUpdateSchema, leadStatusSchema };
