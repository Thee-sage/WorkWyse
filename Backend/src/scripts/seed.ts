import { connectDB, disconnectDB } from '../config/database';
import { Job, Review, Vote } from '../models/Job';

const sampleJobs = [
  {
    title: 'Senior Software Engineer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    jobUrl: 'https://example.com/job1',
    description: 'Looking for a senior developer with 5+ years experience in React, Node.js, and MongoDB. Competitive salary and benefits.',
    isFake: false
  },
  {
    title: 'Remote Frontend Developer',
    company: 'StartupXYZ',
    location: 'Remote',
    jobUrl: 'https://example.com/job2',
    description: 'Join our growing team! No experience required. We\'ll train you from scratch.',
    isFake: true
  },
  {
    title: 'Data Scientist',
    company: 'BigData Inc',
    location: 'New York, NY',
    jobUrl: 'https://example.com/job3',
    description: 'Seeking experienced data scientist with Python, SQL, and machine learning expertise.',
    isFake: false
  },
  {
    title: 'Marketing Manager',
    company: 'GrowthCo',
    location: 'Austin, TX',
    jobUrl: 'https://example.com/job4',
    description: 'Amazing opportunity! Work from anywhere, unlimited PTO, and great culture.',
    isFake: true
  },
  {
    title: 'DevOps Engineer',
    company: 'CloudTech',
    location: 'Seattle, WA',
    jobUrl: 'https://example.com/job5',
    description: 'Looking for DevOps engineer with AWS, Docker, and Kubernetes experience.',
    isFake: false
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Job.deleteMany({});
    await Review.deleteMany({});
    await Vote.deleteMany({});
    
    // Add sample jobs
    console.log('📝 Adding sample jobs...');
    for (const jobData of sampleJobs) {
      const job = new Job(jobData);
      await job.save();
      console.log(`✅ Added job: ${job.title} at ${job.company}`);
      
      // Add some sample reviews for real jobs
      if (!job.isFake) {
        const review1 = new Review({
          jobId: job._id,
          rating: 4,
          comment: 'Great company culture and interesting projects!',
          author: 'John Doe'
        });
        await review1.save();
        
        const review2 = new Review({
          jobId: job._id,
          rating: 5,
          comment: 'Excellent work environment and competitive benefits.',
          author: 'Jane Smith'
        });
        await review2.save();
        
        // Add reviews to job
        job.reviews.push(review1, review2);
        await job.save();
        
        console.log(`   📝 Added 2 reviews for ${job.title}`);
      }
    }
    
    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

seedDatabase(); 