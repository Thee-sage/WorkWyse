# Workwyse (JobReview Platform) - Project Survey

This document summarizes the current state of the Workwyse project, including the implemented features, current technical setup, pending changes, and critical security issues.

## 1. Stuff Done Till Now (Current Features)

**Frontend (Next.js)**
- **UI Framework & Design**: Built with Next.js 15, React 19, Tailwind CSS v4, and Framer Motion for animations. Lucide React is used for iconography.
- **Pages Implemented**: 
  - `home`, `about`, `contact`, `how-it-works`, `mission`, `privacy` (Informational pages).
  - `login`, `register` (Authentication pages).
  - `jobs`, `companies`, `reports`, `submit-report` (Core platform entities).
  - `profile`, `settings` (User management).
- **Core Components**: `JobList`, `JobCard`, `AddJobForm`, `ReviewForm`, `AuthForm`, and `NavBar`.
- **State Management**: Using React Context (`AuthContext.tsx`) for managing user sessions.

**Backend (Node.js/Express)**
- **Authentication (`auth.ts`)**: 
  - User registration with Email OTP verification (via Nodemailer & Gmail SMTP).
  - Login using JWT (JSON Web Tokens) and bcrypt for password hashing.
  - Support for `public` and `private` user types.
- **Jobs API (`jobs.ts`)**:
  - CRUD operations for Job listings.
  - Voting system to flag jobs as "fake" or "real" (upvote/downvote).
  - Review system to add and fetch reviews/ratings for jobs or companies.
- **Database (`models/`)**: Mongoose schemas set up for `User`, `Job`, and `OTP`.

## 2. Current Setup (Technical Architecture)

- **Frontend Environment**: Runs locally on `http://localhost:3000` using `next dev --turbopack`.
- **Backend Environment**: Runs locally on `http://localhost:5000` using `ts-node` for TypeScript execution.
- **Database**: Connected to a remote MongoDB Atlas cluster.
- **Directory Structure**: Monorepo-style splitting `d:/Workwyse/frontend` and `d:/Workwyse/backend`.

## 3. Critical Security Issues 🚨

**IMMEDIATE ACTION REQUIRED:**
1. **Exposed Database Credentials**: The `backend/.env` file contains the `MONGODB_URI` with the raw username and password (`Abhijeet`). If this file is ever pushed to a public repository, your database is compromised.
2. **Exposed Email Credentials**: The `GMAIL_APP_PASSWORD` (`fnrv fbbm ikck rdbs`) is exposed in the `.env` file. **You should revoke this App Password immediately from your Google Account and generate a new one** to prevent unauthorized access to your email.
3. **Missing Rate Limiting on OTP**: The `/api/auth/register` endpoint sends an email upon request. Without rate limiting, a malicious user could spam this endpoint, leading to your Gmail account being blocked for spamming (Email Bombing).
4. **Hardcoded Fallbacks**: In `auth.ts`, the `JWT_SECRET` falls back to `'supersecretkey'`. It's safer to throw an error and crash the server if the `JWT_SECRET` is missing in production.

## 4. Changes Needed / Next Steps

### Backend Additions
- **Missing Entities**: The frontend has pages for `companies` and `reports` (`submit-report`), but the backend currently only handles `jobs.ts` and `auth.ts`. You need to create `Company.ts` and `Report.ts` models, along with their respective Express routes.
- **Input Validation**: While the `jobs.ts` route uses `express-validator` for structured validation, `auth.ts` does everything manually. Standardize validation using a library like Zod or Joi across all routes.
- **Rate Limiter**: Install `express-rate-limit` to protect auth and OTP endpoints.

### Frontend Improvements
- **API Integration**: Ensure all the new pages (`companies`, `reports`) are wired up to the backend via `fetch` or Axios.
- **Error Handling**: Enhance the `AuthContext` and frontend forms to gracefully handle and display backend errors (like "OTP Expired" or "Invalid Credentials").

### Infrastructure / DevOps
- **Environment Management**: Ensure `.env` is firmly in `.gitignore` (which it appears to be), but create a `.env.example` file so new developers know what variables are required without exposing secrets.
- **Production Build**: Test the production build for both frontend (`npm run build`) and backend (`tsc`) to catch any TypeScript errors not visible in development mode.
