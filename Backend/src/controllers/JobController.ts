import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import JobService from '../services/JobService';
// import { IUser } from '../models/User'; // No longer needed for type extension

// Extend Express Request type to include 'user' as any for compatibility with demo middleware
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

const JobController = {
  async getAllJobs(req: Request, res: Response) {
    try {
      const jobs = await JobService.getAllJobs();
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  },

  async getJobById(req: Request, res: Response) {
    try {
      const job = await JobService.getJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  },

  async createJob(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      // Restrict to public users only
      if (!req.user || req.user.type !== 'public') {
        return res.status(403).json({ error: 'Only public users can post jobs.' });
      }
      const { title, company, location, jobUrl, description, isFake } = req.body;
      const job = await JobService.createJob({
        title,
        company,
        location,
        jobUrl,
        description,
        isFake: isFake || false
      });
      res.status(201).json(job);
    } catch (error) {
      console.error('Error creating job:', error);
      res.status(500).json({ error: 'Failed to create job' });
    }
  },

  async vote(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      // Restrict to public users only
      if (!req.user || req.user.type !== 'public') {
        return res.status(403).json({ error: 'Only public users can vote.' });
      }
      const { userId, voteType } = req.body;
      const success = await JobService.vote(req.params.id, userId, voteType);
      if (!success) {
        return res.status(404).json({ error: 'Job not found' });
      }
      const job = await JobService.getJobById(req.params.id);
      res.json({
        message: 'Vote recorded successfully',
        job: {
          id: job?._id,
          upvotes: job?.upvotes,
          downvotes: job?.downvotes
        }
      });
    } catch (error) {
      console.error('Error voting on job:', error);
      res.status(500).json({ error: 'Failed to record vote' });
    }
  },

  async addReview(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      // Allow all logged-in users to add reviews
      if (!req.user) {
        return res.status(403).json({ error: 'You must be logged in to add comments.' });
      }
      const { rating, comment, author } = req.body;
      const review = await JobService.addReview(req.params.id, {
        rating,
        comment,
        author
      });
      if (!review) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.status(201).json(review);
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({ error: 'Failed to add review' });
    }
  },

  async getReviewsByJobId(req: Request, res: Response) {
    try {
      const reviews = await JobService.getReviewsByJobId(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  },

  async getJobsByCompany(req: Request, res: Response) {
    try {
      const jobs = await JobService.getJobsByCompany(req.params.company);
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching jobs by company:', error);
      res.status(500).json({ error: 'Failed to fetch jobs by company' });
    }
  },

  async getFakeJobs(req: Request, res: Response) {
    try {
      const jobs = await JobService.getFakeJobs();
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching fake jobs:', error);
      res.status(500).json({ error: 'Failed to fetch fake jobs' });
    }
  },

  async getRealJobs(req: Request, res: Response) {
    try {
      const jobs = await JobService.getRealJobs();
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching real jobs:', error);
      res.status(500).json({ error: 'Failed to fetch real jobs' });
    }
  }
};

export default JobController; 