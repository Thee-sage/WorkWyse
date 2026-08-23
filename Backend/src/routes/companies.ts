import express from 'express';
import CompanyController from '../controllers/CompanyController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
  createCompanySchema,
  updateCompanySchema,
  companyIdParamSchema,
  addCompanyReviewSchema,
} from '../validators/company.schema';
import { paginationSchema } from '../validators/job.schema';
import { requireVerified } from '../middleware/auth';

const router = express.Router();

// Public read routes
router.get('/', validate(paginationSchema), CompanyController.getAll);
// Resolves (or transparently creates) a company profile by its free-text
// name — every employer named in a job listing is reachable this way, not
// just ones an admin has explicitly registered.
router.get('/resolve/:name', CompanyController.resolveByName);
router.get('/:id', validate(companyIdParamSchema), CompanyController.getById);
router.get('/:id/stats', validate(companyIdParamSchema), CompanyController.getStats);
router.get('/:id/patterns', validate(companyIdParamSchema), CompanyController.getPatterns);
router.get('/:id/reviews', validate(companyIdParamSchema), validate(paginationSchema), CompanyController.getReviews);
router.post(
  '/:id/reviews',
  authenticate,
  requireVerified,
  validate(companyIdParamSchema),
  validate(addCompanyReviewSchema),
  CompanyController.addReview
);

// Protected write routes (admin only for create/update/delete)
router.post('/', authenticate, authorize('admin'), validate(createCompanySchema), CompanyController.create);
router.put('/:id', authenticate, authorize('admin'), validate(companyIdParamSchema), validate(updateCompanySchema), CompanyController.update);
router.delete('/:id', authenticate, authorize('admin'), validate(companyIdParamSchema), CompanyController.remove);

export default router;
