/**
 * Database Seed Script
 * Run: npx ts-node src/seed.ts
 *
 * Creates:
 *  - 1 admin + 5 regular users
 *  - 8 companies
 *  - 20 jobs (mix of ghost/legit across companies)
 *  - Reviews and votes on jobs
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// ─── Models ─────────────────────────────────────────────────────────
import User from '../models/User';
import Company from '../models/Company';
import { Job, Vote } from '../models/Job';

const MONGODB_URI = process.env.MONGODB_URI!;
const SALT_ROUNDS = 10;

// ─── Helpers ────────────────────────────────────────────────────────
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 86400000);
}

// ─── Data ───────────────────────────────────────────────────────────

const usersData = [
  { username: 'admin', email: 'admin@workwyse.com', password: 'Admin@123', type: 'public' as const, role: 'admin' as const },
  { username: 'sarah_dev', email: 'sarah@example.com', password: 'Test@1234', type: 'public' as const, role: 'user' as const },
  { username: 'mike_jones', email: 'mike@example.com', password: 'Test@1234', type: 'public' as const, role: 'user' as const },
  { username: 'priya_k', email: 'priya@example.com', password: 'Test@1234', type: 'private' as const, role: 'user' as const },
  { username: 'alex_recruiter', email: 'alex@example.com', password: 'Test@1234', type: 'public' as const, role: 'user' as const },
  { username: 'jordan_98', email: 'jordan@example.com', password: 'Test@1234', type: 'public' as const, role: 'user' as const },
];

const companiesData = [
  { name: 'NovaTech Solutions', website: 'https://novatech.io', description: 'Enterprise SaaS platform for workflow automation and data analytics.', industry: 'SaaS / Enterprise', averageRating: 2.1, totalReports: 12 },
  { name: 'Greenfield Labs', website: 'https://greenfieldlabs.com', description: 'Biotech research company working on sustainable agriculture solutions.', industry: 'Biotech', averageRating: 4.2, totalReports: 5 },
  { name: 'PixelForge Studios', website: 'https://pixelforge.co', description: 'Indie game development studio known for narrative-driven RPGs.', industry: 'Gaming', averageRating: 3.8, totalReports: 8 },
  { name: 'UrbanShift', website: 'https://urbanshift.app', description: 'Mobility startup building the next generation of urban transportation.', industry: 'Transportation', averageRating: 1.4, totalReports: 18 },
  { name: 'CloudBridge Inc', website: 'https://cloudbridge.dev', description: 'Cloud infrastructure and DevOps consulting for mid-market companies.', industry: 'Cloud / DevOps', averageRating: 4.5, totalReports: 3 },
  { name: 'Meridian Health', website: 'https://meridianhealth.org', description: 'Digital health platform connecting patients with specialists.', industry: 'Healthcare', averageRating: 3.2, totalReports: 7 },
  { name: 'DataPulse AI', website: 'https://datapulse.ai', description: 'AI/ML startup focused on real-time predictive analytics for e-commerce.', industry: 'AI / Machine Learning', averageRating: 2.8, totalReports: 10 },
  { name: 'Apex Financial', website: 'https://apexfinancial.com', description: 'Fintech company offering next-gen investment and banking tools.', industry: 'Fintech', averageRating: 3.9, totalReports: 6 },
];

const jobsData = [
  // NovaTech — mostly ghost jobs
  { title: 'Senior Frontend Engineer', company: 'NovaTech Solutions', location: 'Remote', jobUrl: 'https://novatech.io/careers/sfe-2025', description: 'Applied for this role in January. The listing has been up for 8 months with zero updates. I completed a 3-hour take-home assignment, did two rounds of interviews, and then complete radio silence. The recruiter ghosted me after I asked for a timeline. Multiple other candidates on Blind confirmed the same experience. This role has been reposted 4 times.', isFake: true, upvotes: 34, downvotes: 3 },
  { title: 'Backend Developer', company: 'NovaTech Solutions', location: 'New York, NY', jobUrl: 'https://novatech.io/careers/bd-2025', description: 'Listing asks for 7+ years of experience but offers junior-level salary ($55K-$65K in NYC). Job description was copy-pasted from three different roles. After my interview, the hiring manager admitted they had already filled the position internally but needed to "post it for compliance."', isFake: true, upvotes: 28, downvotes: 5 },
  { title: 'Product Manager', company: 'NovaTech Solutions', location: 'San Francisco, CA', jobUrl: 'https://novatech.io/careers/pm', description: 'Went through the full 5-round interview process over 3 weeks. Got offer, negotiated, they agreed on terms. Then the offer was rescinded because of "budget restructuring." The same position was reposted two weeks later at a lower salary band.', isFake: true, upvotes: 45, downvotes: 2 },

  // Greenfield Labs — mostly legitimate
  { title: 'Research Scientist', company: 'Greenfield Labs', location: 'Boston, MA', jobUrl: 'https://greenfieldlabs.com/jobs/rs-bio', description: 'Amazing hiring experience. Applied on Monday, phone screen on Wednesday, onsite the following week. Clear communication from the recruiting team throughout. They even provided detailed feedback after each round. Got an offer within 10 business days. The team was transparent about compensation, benefits, and growth paths.', isFake: false, upvotes: 52, downvotes: 1 },
  { title: 'Lab Technician', company: 'Greenfield Labs', location: 'Boston, MA', jobUrl: 'https://greenfieldlabs.com/jobs/lt', description: 'Smooth process. Two interviews total — one technical, one culture fit. They were upfront about the role expectations, day-to-day tasks, and team structure. Received a fair offer with good benefits. The whole process took about 2 weeks.', isFake: false, upvotes: 38, downvotes: 0 },

  // PixelForge — mixed
  { title: 'Game Designer', company: 'PixelForge Studios', location: 'Los Angeles, CA', jobUrl: 'https://pixelforge.co/careers/gd', description: 'Great interview experience overall. The team was passionate and the project sounded exciting. However, they took 6 weeks to get back with an offer, and during that time I accepted another position. Communication could be improved but the role itself was legitimate.', isFake: false, upvotes: 22, downvotes: 8 },
  { title: 'Unity Developer', company: 'PixelForge Studios', location: 'Remote', jobUrl: 'https://pixelforge.co/careers/unity', description: 'Asked me to complete a 40-hour game prototype as a "test project" before even having a first interview. When I pushed back, they said it was "standard practice." Multiple developers in the Unity community have reported the same ask. Feels like they are farming free labor under the guise of hiring.', isFake: true, upvotes: 41, downvotes: 6 },

  // UrbanShift — very sketchy
  { title: 'Full Stack Developer', company: 'UrbanShift', location: 'Austin, TX', jobUrl: 'https://urbanshift.app/jobs/fsd', description: 'This listing has been posted every single month for the past year. I applied 3 separate times. First time: ghosted. Second time: got to a phone screen, interviewer didn\'t show up. Third time: completed a technical assessment and was told the role was "on hold." It\'s still being posted.', isFake: true, upvotes: 67, downvotes: 4 },
  { title: 'Marketing Lead', company: 'UrbanShift', location: 'Austin, TX', jobUrl: 'https://urbanshift.app/jobs/ml', description: 'The job listing advertised "competitive salary + equity." In the interview, they revealed the salary was $40K with vesting over 6 years. When I asked about the discrepancy, they said "startup culture requires flexibility." Several Glassdoor reviews confirm a pattern of bait-and-switch compensation.', isFake: true, upvotes: 53, downvotes: 7 },
  { title: 'Data Analyst', company: 'UrbanShift', location: 'Remote', jobUrl: 'https://urbanshift.app/jobs/da', description: 'Applied and heard back within a week. Interview process was 3 rounds in 2 weeks. They made an offer that matched the posted range. I declined for personal reasons but the process itself was fair and transparent. Seems like the company has improved recently.', isFake: false, upvotes: 15, downvotes: 12 },

  // CloudBridge — great
  { title: 'DevOps Engineer', company: 'CloudBridge Inc', location: 'Remote', jobUrl: 'https://cloudbridge.dev/careers/devops', description: 'Best hiring experience I\'ve ever had. The recruiter was responsive, the technical interview was practical (pair programming on a real problem instead of LeetCode), and they gave me a detailed breakdown of how they evaluated my performance. Offer was competitive and came within a week.', isFake: false, upvotes: 71, downvotes: 0 },
  { title: 'Solutions Architect', company: 'CloudBridge Inc', location: 'Chicago, IL', jobUrl: 'https://cloudbridge.dev/careers/sa', description: 'Transparent process from start to finish. They shared the interview rubric upfront, gave me prep materials, and the interviewers were clearly trained. The team was diverse and welcoming. Accepted the offer happily.', isFake: false, upvotes: 48, downvotes: 1 },

  // Meridian Health — mixed
  { title: 'UX Designer', company: 'Meridian Health', location: 'Denver, CO', jobUrl: 'https://meridianhealth.org/jobs/ux', description: 'Interview went well but the role described in the listing was completely different from what the hiring manager described. Listed as "Senior UX Designer" but was actually a junior role with admin tasks mixed in. Feel misled about the scope and responsibilities.', isFake: true, upvotes: 29, downvotes: 11 },
  { title: 'Registered Nurse (Telehealth)', company: 'Meridian Health', location: 'Remote', jobUrl: 'https://meridianhealth.org/jobs/rn', description: 'Straightforward application and interview. Two rounds: clinical scenario and behavioral. Got an offer within a week. Pay was as advertised. Good experience.', isFake: false, upvotes: 33, downvotes: 2 },

  // DataPulse AI — mixed
  { title: 'ML Engineer', company: 'DataPulse AI', location: 'San Francisco, CA', jobUrl: 'https://datapulse.ai/careers/mle', description: 'Promising initial conversation but then they asked me to build an entire end-to-end ML pipeline as a "takehome." The assignment would\'ve taken 30+ hours. When I completed it, they gave me generic rejection with no feedback. Suspiciously, their next product release included features very similar to my submission.', isFake: true, upvotes: 56, downvotes: 8 },
  { title: 'Data Engineer', company: 'DataPulse AI', location: 'Remote', jobUrl: 'https://datapulse.ai/careers/de', description: 'Decent process. The interview was challenging but fair. They were upfront about the startup pace and expectations. Offer was reasonable. Nothing shady about the process itself.', isFake: false, upvotes: 20, downvotes: 5 },

  // Apex Financial — good
  { title: 'iOS Developer', company: 'Apex Financial', location: 'New York, NY', jobUrl: 'https://apexfinancial.com/jobs/ios', description: 'Clean process. Applied through their website, got a response in 3 days. Technical round was a live coding session (reasonable difficulty). The team was friendly and professional. Got an offer with a signing bonus.', isFake: false, upvotes: 37, downvotes: 3 },
  { title: 'Compliance Analyst', company: 'Apex Financial', location: 'New York, NY', jobUrl: 'https://apexfinancial.com/jobs/ca', description: 'Smooth process. They were transparent about the regulatory aspects of the role. Two interviews, both with relevant team members. Offer was fair. The company seems to genuinely invest in their hiring process.', isFake: false, upvotes: 25, downvotes: 1 },
];

const reviewsPool = [
  { rating: 5, comment: 'I had the exact same experience. The recruiter was incredibly responsive and the interview process was very well organized.' },
  { rating: 4, comment: 'Can confirm this is accurate. I went through their process last month and it matches this description closely.' },
  { rating: 1, comment: 'This company ghosted me too. Applied 4 months ago, completed their assessment, then nothing. No response to follow-ups.' },
  { rating: 2, comment: 'Similar experience. The job posting has been up for over a year now. I doubt they are actually hiring for this role.' },
  { rating: 5, comment: 'They reached back out after 2 weeks with an update even though I didn\'t get the role. Really professional.' },
  { rating: 3, comment: 'The interview itself was fine but the timeline was painfully slow. Took 8 weeks from application to decision.' },
  { rating: 1, comment: 'They stole my work. I submitted a design challenge and saw elements of my design in their product a month later.' },
  { rating: 4, comment: 'Great company culture. The interview felt more like a conversation than an interrogation.' },
  { rating: 2, comment: 'Bait and switch on the salary. Listed $120K-$150K, offered $85K and said the higher range was for "exceptional candidates."' },
  { rating: 5, comment: 'One of the best hiring processes I\'ve been through. Transparent, fast, and respectful of my time.' },
  { rating: 3, comment: 'Mixed feelings. The role was legitimate but the process was disorganized. Different interviewers asked the same questions.' },
  { rating: 1, comment: 'Fake listing. The role was filled internally before they even posted it. Just checking a box for compliance.' },
];

// ─── Seed Function ──────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Job.deleteMany({}),
    Vote.deleteMany({}),
  ]);
  console.log('✅ Cleared\n');

  // Create users
  console.log('👤 Creating users...');
  const createdUsers = [];
  for (const u of usersData) {
    const hashed = await bcrypt.hash(u.password, SALT_ROUNDS);
    const user = await User.create({
      username: u.username,
      email: u.email,
      password: hashed,
      uid: uuidv4(),
      type: u.type,
      role: u.role,
    });
    createdUsers.push(user);
    console.log(`   ✓ ${u.username} (${u.role}) — password: ${u.password}`);
  }
  console.log('');

  // Create companies
  console.log('🏢 Creating companies...');
  for (const c of companiesData) {
    await Company.create(c);
    console.log(`   ✓ ${c.name} (${c.industry}) — Rating: ${c.averageRating}/5`);
  }
  console.log('');

  // Create jobs with reviews
  console.log('📋 Creating jobs with reviews...');
  for (let i = 0; i < jobsData.length; i++) {
    const jd = jobsData[i];
    const submitter = createdUsers[randInt(1, createdUsers.length - 1)]; // non-admin

    // Build 1-4 reviews per job
    const reviewCount = randInt(1, 4);
    const reviews = [];
    for (let r = 0; r < reviewCount; r++) {
      const rev = rand(reviewsPool);
      reviews.push({
        jobId: new mongoose.Types.ObjectId(), // placeholder, will be set after
        rating: rev.rating,
        comment: rev.comment,
        author: rand(createdUsers).username,
        createdAt: daysAgo(randInt(0, 60)),
      });
    }

    const job = await Job.create({
      ...jd,
      submittedBy: submitter._id,
      reviews,
      createdAt: daysAgo(randInt(1, 90)),
    });

    // Fix review jobIds
    for (const rev of job.reviews) {
      rev.jobId = job._id as mongoose.Types.ObjectId;
    }
    await job.save();

    // Create some votes
    const voterCount = randInt(2, 5);
    const usedVoters = new Set<string>();
    for (let v = 0; v < voterCount; v++) {
      const voter = rand(createdUsers);
      if (usedVoters.has(voter.uid)) continue;
      usedVoters.add(voter.uid);
      try {
        await Vote.create({
          jobId: job._id,
          userId: voter.uid,
          voteType: Math.random() > 0.3 ? 'upvote' : 'downvote',
          createdAt: daysAgo(randInt(0, 30)),
        });
      } catch {
        // skip duplicates
      }
    }

    const status = jd.isFake ? '🔴 GHOST' : '🟢 Legit';
    console.log(`   ✓ ${status} — ${jd.title} @ ${jd.company} (${reviews.length} reviews, ${jd.upvotes}↑ ${jd.downvotes}↓)`);
  }

  console.log('\n─────────────────────────────────────────');
  console.log('🎉 Seed complete!');
  console.log(`   ${createdUsers.length} users`);
  console.log(`   ${companiesData.length} companies`);
  console.log(`   ${jobsData.length} jobs`);
  console.log('\n📌 Login credentials:');
  console.log('   Admin:  admin / Admin@123');
  console.log('   User:   sarah_dev / Test@1234');
  console.log('   User:   mike_jones / Test@1234');
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
