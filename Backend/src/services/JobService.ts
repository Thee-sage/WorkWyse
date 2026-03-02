import { Job, Review, Vote, IJob, IReview } from '../models/Job';

class JobService {
  static async getAllJobs(): Promise<IJob[]> {
    return await Job.find().sort({ createdAt: -1 });
  }

  static async getJobById(id: string): Promise<IJob | null> {
    return await Job.findById(id);
  }

  static async createJob(jobData: {
    title: string;
    company: string;
    location: string;
    jobUrl: string;
    description: string;
    isFake: boolean;
  }): Promise<IJob> {
    const job = new Job(jobData);
    return await job.save();
  }

  static async vote(jobId: string, userId: string, voteType: 'upvote' | 'downvote'): Promise<boolean> {
    try {
      const existingVote = await Vote.findOne({ jobId, userId });
      if (existingVote) {
        await Vote.findByIdAndDelete(existingVote._id);
        const updateField = existingVote.voteType === 'upvote' ? 'upvotes' : 'downvotes';
        await Job.findByIdAndUpdate(jobId, { $inc: { [updateField]: -1 } });
      }
      const vote = new Vote({ jobId, userId, voteType });
      await vote.save();
      const updateField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
      await Job.findByIdAndUpdate(jobId, { $inc: { [updateField]: 1 } });
      return true;
    } catch {
      return false;
    }
  }

  static async addReview(jobId: string, reviewData: {
    rating: number;
    comment: string;
    author: string;
  }): Promise<IReview | null> {
    const job = await Job.findById(jobId);
    if (!job) return null;
    const review = new Review({ ...reviewData, jobId });
    job.reviews.push(review);
    await job.save();
    return review;
  }

  static async getReviewsByJobId(jobId: string): Promise<IReview[]> {
    const job = await Job.findById(jobId);
    return job ? job.reviews : [];
  }

  static async getJobsByCompany(company: string): Promise<IJob[]> {
    return await Job.find({ company });
  }

  static async getFakeJobs(): Promise<IJob[]> {
    return await Job.find({ isFake: true });
  }

  static async getRealJobs(): Promise<IJob[]> {
    return await Job.find({ isFake: false });
  }
}

export default JobService; 