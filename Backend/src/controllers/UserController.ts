import { Request, Response } from 'express';
import TrustService from '../services/TrustService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';

const UserController = {
  /** Public contributor standing — powers Job Record accounts, Profile, and Moderation. */
  getContributorStats: catchAsync(async (req: Request, res: Response) => {
    const stats = await TrustService.getContributorStats(req.params.username);
    ApiResponse.success(res, stats);
  }),
};

export default UserController;
