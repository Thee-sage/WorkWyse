import express from 'express';
import { body } from 'express-validator';
import JobController from '../controllers/JobController';

const router = express.Router();

router.get('/', JobController.getAllJobs);
router.get('/:id', JobController.getJobById);
router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('company').notEmpty().withMessage('Company is required'),
    body('location').notEmpty().withMessage('Location is required'),
    body('jobUrl').isURL().withMessage('Valid job URL is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('isFake').optional().isBoolean().withMessage('isFake must be a boolean'),
  ],
  JobController.createJob
);
router.post(
  '/:id/vote',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('voteType').isIn(['upvote', 'downvote']).withMessage('Vote type must be upvote or downvote'),
  ],
  JobController.vote
);
router.post(
  '/:id/reviews',
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').notEmpty().withMessage('Comment is required'),
    body('author').notEmpty().withMessage('Author is required'),
  ],
  JobController.addReview
);
router.get('/:id/reviews', JobController.getReviewsByJobId);
router.get('/company/:company', JobController.getJobsByCompany);
router.get('/filter/fake', JobController.getFakeJobs);
router.get('/filter/real', JobController.getRealJobs);

export default router; 