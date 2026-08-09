import { z } from 'zod';

// ObjectId format: 24-character hex string
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const createReportSchema = {
  body: z.object({
    targetType: z.enum(['job', 'company'], {
      message: 'Target type must be "job" or "company"',
    }),
    targetId: objectIdSchema,
    reason: z.string().min(1, 'Reason is required').max(500),
    description: z.string().max(2000).optional(),
  }),
};

export const updateReportStatusSchema = {
  body: z.object({
    status: z.enum(['reviewed', 'dismissed'], {
      message: 'Status must be "reviewed" or "dismissed"',
    }),
  }),
};

export const reportIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

// Finding 8.2 — validate the status query param for admin listing
export const reportListQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['pending', 'reviewed', 'dismissed']).optional(),
  }),
};
