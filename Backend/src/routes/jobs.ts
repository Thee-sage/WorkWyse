import express from 'express';
import JobController from '../controllers/JobController';
import { validate } from '../middleware/validate';
import { authenticate, optionalAuth, requireVerified } from '../middleware/auth';
import { reportLimiter, voteLimiter } from '../middleware/rateLimiter';
import {
  extractJobUrlSchema,
  createJobSchema,
  updateJobSchema,
  voteSchema,
  addReviewSchema,
  paginationSchema,
  jobIdParamSchema,
  companyParamSchema,
} from '../validators/job.schema';

const router = express.Router();

// Public read routes (with optional auth for personalization)
router.get('/', validate(paginationSchema), JobController.getAllJobs);
router.get('/filter/fake', validate(paginationSchema), JobController.getFakeJobs);
router.get('/filter/real', validate(paginationSchema), JobController.getRealJobs);
router.get('/company/:company', validate(companyParamSchema), validate(paginationSchema), JobController.getJobsByCompany);
router.get('/:id', validate(jobIdParamSchema), JobController.getJobById);
router.get('/:id/reviews', validate(jobIdParamSchema), JobController.getReviewsByJobId);

// Protected write routes
router.post('/extract', authenticate, requireVerified, validate(extractJobUrlSchema), JobController.extractJobUrl);
router.post('/', authenticate, requireVerified, reportLimiter, validate(createJobSchema), JobController.createJob);

// Finding 1.3 / 11.1 — edit and delete (owner or admin)
router.put('/:id', authenticate, validate(jobIdParamSchema), validate(updateJobSchema), JobController.updateJob);
router.delete('/:id', authenticate, validate(jobIdParamSchema), JobController.deleteJob);

// Voting
router.post('/:id/vote', authenticate, requireVerified, voteLimiter, validate(jobIdParamSchema), validate(voteSchema), JobController.vote);
router.get('/:id/vote', authenticate, validate(jobIdParamSchema), JobController.getUserVote);

// Reviews
router.post('/:id/reviews', authenticate, requireVerified, validate(jobIdParamSchema), validate(addReviewSchema), JobController.addReview);
// Finding 11.2 — delete review (owner or admin)
router.delete('/:id/reviews/:reviewId', authenticate, requireVerified, validate(jobIdParamSchema), JobController.deleteReview);

export default router;