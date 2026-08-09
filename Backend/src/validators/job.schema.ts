import { z } from 'zod';

export const extractJobUrlSchema = {
  body: z.object({
    jobUrl: z.string().url('A valid URL is required'),
  }),
};

const evidenceItemSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('image'), value: z.string().url('Image evidence must be a valid URL') }),
  z.object({ type: z.literal('url'), value: z.string().url('URL evidence must be a valid URL') }),
  z.object({ type: z.literal('text'), value: z.string().min(1, 'Text evidence cannot be empty').max(2000) }),
]);

// ObjectId format: 24-character hex string
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const createJobSchema = {
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    company: z.string().min(1, 'Company is required').max(100),
    location: z.string().min(1, 'Location is required').max(100),
    jobUrl: z.string().url('Valid job URL is required'),
    description: z.string().min(1, 'Description is required').max(5000),
    jobDescription: z.string().max(5000).optional().default(''),
    isFake: z.boolean().optional().default(false),
    // verificationStatus, verificationConfidence, verificationSource are SERVER-ONLY
    // fields — they must NOT be set by the client (Finding 1.1)
    evidence: z.array(evidenceItemSchema).max(5, 'Maximum 5 evidence items allowed').optional().default([]),
  }),
};

export const updateJobSchema = {
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    company: z.string().min(1).max(100).optional(),
    location: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(5000).optional(),
    jobDescription: z.string().max(5000).optional(),
    isFake: z.boolean().optional(),
  }),
};

export const voteSchema = {
  body: z.object({
    voteType: z.enum(['upvote', 'downvote'], {
      message: 'Vote type must be upvote or downvote',
    }),
  }),
};

export const addReviewSchema = {
  body: z.object({
    rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
    comment: z.string().min(1, 'Comment is required').max(2000),
  }),
};

export const paginationSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

export const jobIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

export const companyParamSchema = {
  params: z.object({
    company: z.string().min(1, 'Company name is required'),
  }),
};
