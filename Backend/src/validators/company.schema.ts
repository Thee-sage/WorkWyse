import { z } from 'zod';

export const createCompanySchema = {
  body: z.object({
    name: z.string().min(1, 'Company name is required').max(100),
    website: z.string().url('Invalid URL format').optional(),
    description: z.string().max(2000).optional(),
    industry: z.string().max(100).optional(),
  }),
};

export const updateCompanySchema = {
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    website: z.string().url('Invalid URL format').optional(),
    description: z.string().max(2000).optional(),
    industry: z.string().max(100).optional(),
  }),
};

// ObjectId format: 24-character hex string
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const companyIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};
