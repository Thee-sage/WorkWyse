# JobReview Platform

A platform where people can list job postings and vote on whether they are real or fake/ghost jobs, plus write reviews about companies.

## Features

- 📝 Submit job listings with company information
- 👍👎 Vote on job authenticity (upvote/downvote)
- ⭐ Write and read company reviews
- 🔍 Filter jobs by real/fake status
- 📊 Trust score calculation
- 🏢 Search jobs by company
- ✉️ Email-based registration with OTP verification

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript, MongoDB
- **Database**: MongoDB with Mongoose ODM

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd Backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. MongoDB Setup

#### Option A: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service
3. The app will connect to `mongodb://localhost:27017/job-review-platform`

#### Option B: MongoDB Atlas
1. Create a free MongoDB Atlas account
2. Create a cluster and get your connection string
3. Set the `MONGODB_URI` environment variable

### 3. Environment Variables

Create a `.env` file in the `Backend` directory:

```env
MONGODB_URI=mongodb://localhost:27017/job-review-platform
PORT=5000
JWT_SECRET=supersecretkey

# Gmail SMTP Configuration (for email OTP verification)
# To get a Gmail App Password:
# 1. Go to your Google Account settings (https://myaccount.google.com/)
# 2. Enable 2-Step Verification if not already enabled
# 3. Go to App Passwords (https://myaccount.google.com/apppasswords)
# 4. Select "Mail" and "Other (Custom name)" - name it "JobReview App"
# 5. Generate the password and copy the 16-character code
# 6. Use that password here (NOT your regular Gmail password!)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

**Important**: You must use a Gmail App Password, not your regular Gmail password. Regular passwords won't work with SMTP.

### 4. Database Seeding

```bash
cd Backend
npm run seed
```

This will populate the database with sample job listings and reviews.

### 5. Start the Application

#### Start Backend
```bash
cd Backend
npm run dev
```

The backend will run on `http://localhost:5000`

#### Start Frontend
```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create new job
- `POST /api/jobs/:id/vote` - Vote on job
- `GET /api/jobs/company/:company` - Get jobs by company
- `GET /api/jobs/filter/fake` - Get fake jobs
- `GET /api/jobs/filter/real` - Get real jobs

### Reviews
- `POST /api/jobs/:id/reviews` - Add review to job
- `GET /api/jobs/:id/reviews` - Get reviews for job

### Authentication
- `POST /api/auth/register` - Send OTP to email for registration
- `POST /api/auth/verify-otp` - Verify OTP and complete registration
- `POST /api/auth/login` - Login with username and password

## Project Structure

```
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts          # MongoDB connection
│   │   ├── middleware/
│   │   │   └── cors.ts              # CORS configuration
│   │   ├── models/
│   │   │   └── Job.ts               # MongoDB schemas and service
│   │   ├── routes/
│   │   │   └── jobs.ts              # API routes
│   │   ├── scripts/
│   │   │   └── seed.ts              # Database seeding
│   │   └── app.ts                   # Express app setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Main page
│   │   │   └── layout.tsx           # App layout
│   │   └── components/
│   │       ├── JobList.tsx          # Job listing component
│   │       ├── JobCard.tsx          # Individual job card
│   │       ├── AddJobForm.tsx       # Job submission form
│   │       └── ReviewForm.tsx       # Review submission form
│   └── package.json
└── README.md
```

## Usage

1. **Browse Jobs**: View all job listings on the homepage
2. **Filter Jobs**: Use the filter buttons to view real or fake jobs
3. **Add Jobs**: Click "Add Job" to submit a new job listing
4. **Vote**: Use thumbs up/down buttons to vote on job authenticity
5. **Review**: Add reviews with ratings and comments
6. **View Details**: Click on job cards to see full details and reviews

## Development

### Backend Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run seed     # Seed database with sample data
```

### Frontend Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License 