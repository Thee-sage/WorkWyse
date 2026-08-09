import express from 'express';
import CompanyController from '../controllers/CompanyController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
  createCompanySchema,
  updateCompanySchema,
  companyIdParamSchema,
} from '../validators/company.schema';
import { paginationSchema } from '../validators/job.schema';

const router = express.Router();

// Public read routes
router.get('/', validate(paginationSchema), CompanyController.getAll);
router.get('/:id', validate(companyIdParamSchema), CompanyController.getById);

// Protected write routes (admin only for create/update/delete)
router.post('/', authenticate, authorize('admin'), validate(createCompanySchema), CompanyController.create);
router.put('/:id', authenticate, authorize('admin'), validate(companyIdParamSchema), validate(updateCompanySchema), CompanyController.update);
router.delete('/:id', authenticate, authorize('admin'), validate(companyIdParamSchema), CompanyController.remove);

export default router;
