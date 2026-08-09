import express from 'express';
import ExportController from '../controllers/ExportController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Any authenticated user can export their own jobs
router.get('/jobs.csv', authenticate, ExportController.exportJobsCSV);

// Admin only for reports export
router.get('/reports.csv', authenticate, authorize('admin'), ExportController.exportReportsCSV);

// Import — CSV text in body (any authenticated user)
router.post('/jobs/import', authenticate, ExportController.importJobsCSV);

export default router;
