import express from 'express';
import UserController from '../controllers/UserController';

const router = express.Router();

// Public: contributor standing (accounts filed, evidence verified, tier)
router.get('/:username/stats', UserController.getContributorStats);

export default router;
