// ─── Types ───

export type ReportStatus = "ghost" | "suspicious" | "legitimate";

export interface Report {
  id: string;
  company: string;
  companySlug: string;
  role: string;
  location: string;
  date: string;
  datePosted: string;
  status: ReportStatus;
  trustScore: number;
  confirmations: number;
  disputes: number;
  excerpt: string;
  fullDescription: string;
  authorId: string;
  authorName: string;
  evidence?: string[];
  comments: Comment[];
}

export interface Comment {
  id: string;
  authorName: string;
  authorId: string;
  date: string;
  text: string;
  type: "confirmation" | "dispute" | "discussion";
}

export interface Company {
  slug: string;
  name: string;
  industry: string;
  location: string;
  totalReports: number;
  ghostJobRate: number;
  trustScore: number;
  trend: "up" | "down";
  recentReportIds: string[];
  founded: string;
  employees: string;
  website: string;
  monthlyData: { month: string; reports: number; ghostRate: number }[];
}

export interface User {
  id: string;
  name: string;
  joinDate: string;
  trustScore: number;
  reportsSubmitted: number;
  confirmationsGiven: number;
  disputesFiled: number;
  reputationLevel: string;
  reportIds: string[];
  badges: { label: string; description: string; date: string }[];
  activityLog: { date: string; action: string; targetId?: string }[];
}

// ─── Mock Reports ───

export const mockReports: Report[] = [
  {
    id: "rpt-001",
    company: "NovaTech Solutions",
    companySlug: "novatech-solutions",
    role: "Senior Frontend Engineer",
    location: "Remote",
    date: "Feb 2026",
    datePosted: "Feb 12, 2026",
    status: "ghost",
    trustScore: 22,
    confirmations: 14,
    disputes: 1,
    excerpt: "Applied in January, received an automated response, then nothing for 6 weeks. The listing was reposted twice during this period. Multiple applicants report the same experience.",
    fullDescription: "I applied for the Senior Frontend Engineer position at NovaTech Solutions on January 3rd, 2026. The application was submitted through their careers page, which required a custom cover letter and three coding challenges.\n\nI received an automated confirmation email immediately, stating that 'our team will review your application within 2 weeks.' After 3 weeks with no response, I followed up via email — no reply.\n\nOn February 1st, I noticed the exact same listing reposted with a new date. I applied again through LinkedIn this time. Same automated response. During this period, I connected with 4 other applicants on a job seekers forum who described identical experiences.\n\nThe listing was taken down on February 8th, only to reappear on February 15th with slightly modified requirements (they added 'blockchain experience preferred'). At this point, 14 other community members have confirmed similar ghost application experiences with this company.\n\nI believe this listing is being used to collect resumes and maintain an appearance of growth, rather than for an actual open position.",
    authorId: "user-001",
    authorName: "Alex Chen",
    evidence: ["Screenshot of original listing", "Email confirmation receipt", "LinkedIn repost screenshot"],
    comments: [
      { id: "c-001", authorName: "Jordan Rivera", authorId: "user-003", date: "Feb 14, 2026", text: "I can confirm this. Applied in December and had the exact same experience. The automated email was word-for-word identical.", type: "confirmation" },
      { id: "c-002", authorName: "Sam Patel", authorId: "user-004", date: "Feb 16, 2026", text: "Same here. Three rounds of coding challenges with zero follow-up. The listing has been up since October 2025.", type: "confirmation" },
      { id: "c-003", authorName: "Taylor Kim", authorId: "user-005", date: "Feb 18, 2026", text: "Has anyone tried reaching out to their HR directly on LinkedIn? I'm curious if the position even exists internally.", type: "discussion" },
      { id: "c-004", authorName: "Morgan Lee", authorId: "user-006", date: "Feb 20, 2026", text: "I actually got a response after 8 weeks — a generic rejection. So technically they did respond, but it feels automated and the timeline is suspicious.", type: "dispute" },
      { id: "c-005", authorName: "Casey Brooks", authorId: "user-007", date: "Feb 22, 2026", text: "I checked their Glassdoor — multiple reviews mention phantom job postings. This seems to be a pattern.", type: "confirmation" },
    ],
  },
  {
    id: "rpt-002",
    company: "Meridian Analytics",
    companySlug: "meridian-analytics",
    role: "Data Scientist",
    location: "San Francisco, CA",
    date: "Jan 2026",
    datePosted: "Jan 8, 2026",
    status: "suspicious",
    trustScore: 45,
    confirmations: 7,
    disputes: 3,
    excerpt: "Had three rounds of interviews over two months. Was told the position was filled, but the listing reappeared a week later with identical requirements.",
    fullDescription: "I went through a full interview process with Meridian Analytics for their Data Scientist role. The process included:\n\n1. Initial phone screen with HR (30 min)\n2. Technical assessment — a 4-hour take-home project analyzing a sample dataset\n3. Panel interview with the data science team (90 min)\n\nAfter each round, I waited approximately 2 weeks for a response. The entire process took from mid-November to early January.\n\nOn January 5th, I received an email stating the position had been filled by an internal candidate. While this is understandable, the listing reappeared on LinkedIn and Indeed on January 12th with identical requirements and job description.\n\nWhen I emailed the recruiter about this, I received no response. Seven other applicants in the WorkWyse community have reported similar experiences with this company's data team roles specifically.",
    authorId: "user-002",
    authorName: "Priya Sharma",
    evidence: ["Interview confirmation emails", "Rejection email screenshot", "Reposted listing screenshot"],
    comments: [
      { id: "c-006", authorName: "Alex Chen", authorId: "user-001", date: "Jan 20, 2026", text: "Similar experience with their ML Engineer role. Three interviews then ghosted.", type: "confirmation" },
      { id: "c-007", authorName: "Riley Foster", authorId: "user-008", date: "Jan 22, 2026", text: "I actually got hired through a similar process at Meridian last year. It was slow but legitimate. They might just have poor communication.", type: "dispute" },
      { id: "c-008", authorName: "Drew Martinez", authorId: "user-009", date: "Jan 25, 2026", text: "The reposting is the suspicious part. If it was truly filled, why repost?", type: "discussion" },
    ],
  },
  {
    id: "rpt-003",
    company: "Greenfield Labs",
    companySlug: "greenfield-labs",
    role: "Product Designer",
    location: "New York, NY",
    date: "Mar 2026",
    datePosted: "Mar 1, 2026",
    status: "legitimate",
    trustScore: 88,
    confirmations: 12,
    disputes: 0,
    excerpt: "Smooth application process. Heard back within a week, had two interviews, and received an offer within three weeks. Transparent about salary and expectations.",
    fullDescription: "This is a positive report — I want to highlight Greenfield Labs for having an excellent hiring process.\n\nI applied for the Product Designer position on February 5th. Within 3 business days, I received a personalized email from the hiring manager (not a recruiter) with next steps.\n\nThe process:\n1. Portfolio review call with the design lead (45 min) — they had clearly looked at my work beforehand\n2. Design challenge — a reasonable 2-hour exercise with clear expectations\n3. Team culture fit conversation (30 min)\n\nI received an offer on February 26th — exactly 3 weeks from application. The salary range was posted in the original listing ($120K-$150K), and the offer was within that range. They were transparent about benefits, equity, and growth expectations.\n\nThis is how hiring should work. 12 other community members have confirmed positive experiences with Greenfield Labs.",
    authorId: "user-003",
    authorName: "Jordan Rivera",
    evidence: ["Offer letter (redacted)", "Timeline screenshot"],
    comments: [
      { id: "c-009", authorName: "Priya Sharma", authorId: "user-002", date: "Mar 3, 2026", text: "Great to see positive reports too! Applied there for a UX Research role and had a similarly smooth experience.", type: "confirmation" },
      { id: "c-010", authorName: "Sam Patel", authorId: "user-004", date: "Mar 5, 2026", text: "Greenfield Labs is consistently one of the most transparent companies on the platform. Their engineering roles are similarly well-run.", type: "confirmation" },
    ],
  },
  {
    id: "rpt-004",
    company: "NovaTech Solutions",
    companySlug: "novatech-solutions",
    role: "Backend Developer",
    location: "Austin, TX",
    date: "Jan 2026",
    datePosted: "Jan 15, 2026",
    status: "ghost",
    trustScore: 18,
    confirmations: 9,
    disputes: 0,
    excerpt: "Position has been listed for 8 months with no hires. Multiple applicants report completing technical assessments with no follow-up whatsoever.",
    fullDescription: "The Backend Developer role at NovaTech Solutions has been listed continuously since May 2025. I applied in January 2026 and completed their technical assessment — a 6-hour take-home project building a REST API.\n\nDespite the significant time investment, I never received any follow-up. Not even a rejection. Nine other applicants on WorkWyse have reported the same experience across the last 8 months.\n\nThis appears to be a perpetual listing used to collect work samples or maintain the appearance of an active hiring pipeline.",
    authorId: "user-004",
    authorName: "Sam Patel",
    comments: [
      { id: "c-011", authorName: "Alex Chen", authorId: "user-001", date: "Jan 28, 2026", text: "This matches the pattern I reported for their frontend role. NovaTech seems to use job listings as a funnel without actual hiring intent.", type: "confirmation" },
    ],
  },
  {
    id: "rpt-005",
    company: "Zenith Corp",
    companySlug: "zenith-corp",
    role: "Marketing Manager",
    location: "Chicago, IL",
    date: "Feb 2026",
    datePosted: "Feb 5, 2026",
    status: "suspicious",
    trustScore: 38,
    confirmations: 5,
    disputes: 2,
    excerpt: "Job listing salary range was $80K-$120K. During interview, they revealed the actual budget was $55K. Several applicants report similar bait-and-switch tactics.",
    fullDescription: "I applied for the Marketing Manager position at Zenith Corp, which was listed with a salary range of $80,000 to $120,000. The job description outlined responsibilities typically associated with a senior marketing role.\n\nDuring the first interview, the hiring manager casually mentioned that the 'actual budget for this role is closer to $55,000, but there's room for growth.' When I asked about the discrepancy with the posted range, they said the listing reflected 'total compensation including benefits.'\n\nFive other applicants have reported similar experiences — the listed salary never matches what's discussed in interviews. Two disputes note that Zenith did eventually negotiate closer to the posted range for some candidates.",
    authorId: "user-005",
    authorName: "Taylor Kim",
    comments: [
      { id: "c-012", authorName: "Jordan Rivera", authorId: "user-003", date: "Feb 10, 2026", text: "Classic bait-and-switch. This should be flagged more prominently.", type: "confirmation" },
      { id: "c-013", authorName: "Riley Foster", authorId: "user-008", date: "Feb 12, 2026", text: "I interviewed there and they offered $95K after negotiation. It might depend on the hiring manager.", type: "dispute" },
    ],
  },
  {
    id: "rpt-006",
    company: "Pinnacle Systems",
    companySlug: "pinnacle-systems",
    role: "DevOps Engineer",
    location: "Remote",
    date: "Mar 2026",
    datePosted: "Mar 3, 2026",
    status: "ghost",
    trustScore: 15,
    confirmations: 11,
    disputes: 0,
    excerpt: "Company appears to be collecting resumes. The application requires uploading a detailed portfolio and answering 15 custom questions, yet no one reports hearing back.",
    fullDescription: "Pinnacle Systems has a DevOps Engineer listing that requires an extraordinarily detailed application: 15 custom questions about your infrastructure experience, a portfolio of past work, and three professional references — all before any human contact.\n\nAfter investing over 2 hours in the application, I heard nothing. Eleven other community members report the same. The listing has been active since November 2025 with periodic refreshes.\n\nThe excessive upfront requirements combined with zero follow-up strongly suggest this is a data collection operation rather than a legitimate hiring effort.",
    authorId: "user-006",
    authorName: "Morgan Lee",
    comments: [
      { id: "c-014", authorName: "Drew Martinez", authorId: "user-009", date: "Mar 6, 2026", text: "15 custom questions before even a phone screen is a massive red flag. Confirmed ghost.", type: "confirmation" },
    ],
  },
  {
    id: "rpt-007",
    company: "Greenfield Labs",
    companySlug: "greenfield-labs",
    role: "Engineering Manager",
    location: "New York, NY",
    date: "Feb 2026",
    datePosted: "Feb 18, 2026",
    status: "legitimate",
    trustScore: 91,
    confirmations: 8,
    disputes: 0,
    excerpt: "Transparent process from start to finish. Posted salary matched the offer. Interview panel was respectful and well-organized.",
    fullDescription: "Another positive report for Greenfield Labs. Their Engineering Manager hiring process was exemplary. Clear job description, posted salary range that matched the final offer, and a well-structured interview process that respected candidates' time.\n\nThe entire process from application to offer took 18 business days. Every interviewer was prepared and had reviewed my background. Feedback was provided after each round within 48 hours.",
    authorId: "user-007",
    authorName: "Casey Brooks",
    comments: [
      { id: "c-015", authorName: "Priya Sharma", authorId: "user-002", date: "Feb 20, 2026", text: "Greenfield continues to set the standard. Wish more companies operated this way.", type: "confirmation" },
    ],
  },
  {
    id: "rpt-008",
    company: "Meridian Analytics",
    companySlug: "meridian-analytics",
    role: "ML Engineer",
    location: "Remote",
    date: "Feb 2026",
    datePosted: "Feb 10, 2026",
    status: "suspicious",
    trustScore: 40,
    confirmations: 6,
    disputes: 2,
    excerpt: "Interview process felt like free consulting. The take-home project was suspiciously specific to their current product challenges.",
    fullDescription: "I applied for the ML Engineer role at Meridian Analytics. The take-home assessment asked me to 'build a recommendation engine for an e-commerce platform with these specific requirements' — requirements that matched their actual product almost exactly.\n\nThe project took approximately 12 hours. After submitting, I received a brief rejection with no feedback. Six other applicants report receiving similarly product-specific assessments that felt like free consulting work.\n\nWhile some dispute that this is standard practice, the specificity and lack of compensation or feedback raises concerns.",
    authorId: "user-008",
    authorName: "Riley Foster",
    comments: [
      { id: "c-016", authorName: "Alex Chen", authorId: "user-001", date: "Feb 15, 2026", text: "This is a known pattern. Companies using interview assessments as free labor.", type: "confirmation" },
    ],
  },
  {
    id: "rpt-009",
    company: "Zenith Corp",
    companySlug: "zenith-corp",
    role: "Sales Director",
    location: "Denver, CO",
    date: "Jan 2026",
    datePosted: "Jan 20, 2026",
    status: "ghost",
    trustScore: 28,
    confirmations: 4,
    disputes: 1,
    excerpt: "Listed position requires 10+ years of experience but offers entry-level compensation. No responses to any applications.",
    fullDescription: "The Sales Director listing at Zenith Corp requires 10+ years of B2B sales experience, MBA preferred, and a proven track record of managing teams of 15+. The compensation listed? $50,000 base + 'competitive commission structure' with no details.\n\nFour applicants confirm that no one has received any response. The listing appears designed to be impossible to fill at the stated compensation, suggesting it may exist for compliance or headcount justification purposes rather than genuine hiring intent.",
    authorId: "user-009",
    authorName: "Drew Martinez",
    comments: [],
  },
];

// ─── Mock Companies ───

export const mockCompanies: Company[] = [
  {
    slug: "novatech-solutions",
    name: "NovaTech Solutions",
    industry: "Enterprise Software",
    location: "Austin, TX",
    totalReports: 47,
    ghostJobRate: 68,
    trustScore: 22,
    trend: "up",
    recentReportIds: ["rpt-001", "rpt-004"],
    founded: "2018",
    employees: "200-500",
    website: "novatech.example.com",
    monthlyData: [
      { month: "Oct", reports: 5, ghostRate: 72 },
      { month: "Nov", reports: 8, ghostRate: 70 },
      { month: "Dec", reports: 6, ghostRate: 65 },
      { month: "Jan", reports: 12, ghostRate: 68 },
      { month: "Feb", reports: 10, ghostRate: 71 },
      { month: "Mar", reports: 6, ghostRate: 68 },
    ],
  },
  {
    slug: "greenfield-labs",
    name: "Greenfield Labs",
    industry: "Biotech & Design",
    location: "New York, NY",
    totalReports: 23,
    ghostJobRate: 8,
    trustScore: 88,
    trend: "down",
    recentReportIds: ["rpt-003", "rpt-007"],
    founded: "2015",
    employees: "100-200",
    website: "greenfieldlabs.example.com",
    monthlyData: [
      { month: "Oct", reports: 3, ghostRate: 12 },
      { month: "Nov", reports: 4, ghostRate: 10 },
      { month: "Dec", reports: 2, ghostRate: 8 },
      { month: "Jan", reports: 5, ghostRate: 6 },
      { month: "Feb", reports: 4, ghostRate: 8 },
      { month: "Mar", reports: 5, ghostRate: 8 },
    ],
  },
  {
    slug: "meridian-analytics",
    name: "Meridian Analytics",
    industry: "Data & AI",
    location: "San Francisco, CA",
    totalReports: 31,
    ghostJobRate: 42,
    trustScore: 45,
    trend: "up",
    recentReportIds: ["rpt-002", "rpt-008"],
    founded: "2019",
    employees: "50-100",
    website: "meridiananalytics.example.com",
    monthlyData: [
      { month: "Oct", reports: 4, ghostRate: 35 },
      { month: "Nov", reports: 5, ghostRate: 38 },
      { month: "Dec", reports: 6, ghostRate: 40 },
      { month: "Jan", reports: 7, ghostRate: 44 },
      { month: "Feb", reports: 5, ghostRate: 42 },
      { month: "Mar", reports: 4, ghostRate: 42 },
    ],
  },
  {
    slug: "zenith-corp",
    name: "Zenith Corp",
    industry: "Marketing & Sales",
    location: "Chicago, IL",
    totalReports: 19,
    ghostJobRate: 52,
    trustScore: 35,
    trend: "up",
    recentReportIds: ["rpt-005", "rpt-009"],
    founded: "2012",
    employees: "500-1000",
    website: "zenithcorp.example.com",
    monthlyData: [
      { month: "Oct", reports: 2, ghostRate: 45 },
      { month: "Nov", reports: 3, ghostRate: 48 },
      { month: "Dec", reports: 4, ghostRate: 50 },
      { month: "Jan", reports: 4, ghostRate: 52 },
      { month: "Feb", reports: 3, ghostRate: 54 },
      { month: "Mar", reports: 3, ghostRate: 52 },
    ],
  },
  {
    slug: "pinnacle-systems",
    name: "Pinnacle Systems",
    industry: "Cloud Infrastructure",
    location: "Remote",
    totalReports: 14,
    ghostJobRate: 78,
    trustScore: 15,
    trend: "up",
    recentReportIds: ["rpt-006"],
    founded: "2020",
    employees: "50-100",
    website: "pinnaclesys.example.com",
    monthlyData: [
      { month: "Oct", reports: 1, ghostRate: 70 },
      { month: "Nov", reports: 2, ghostRate: 74 },
      { month: "Dec", reports: 3, ghostRate: 76 },
      { month: "Jan", reports: 3, ghostRate: 78 },
      { month: "Feb", reports: 2, ghostRate: 80 },
      { month: "Mar", reports: 3, ghostRate: 78 },
    ],
  },
];

// ─── Mock User ───

export const mockUser: User = {
  id: "user-001",
  name: "Alex Chen",
  joinDate: "September 2025",
  trustScore: 92,
  reportsSubmitted: 8,
  confirmationsGiven: 23,
  disputesFiled: 2,
  reputationLevel: "Senior Investigator",
  reportIds: ["rpt-001", "rpt-004"],
  badges: [
    { label: "First Report", description: "Filed your first community report", date: "Sep 2025" },
    { label: "Verified Voice", description: "5+ reports confirmed by the community", date: "Nov 2025" },
    { label: "Senior Investigator", description: "Consistent, high-quality contributions", date: "Jan 2026" },
    { label: "Ghost Hunter", description: "Identified 10+ confirmed ghost listings", date: "Feb 2026" },
  ],
  activityLog: [
    { date: "Mar 5, 2026", action: "Confirmed report on Pinnacle Systems DevOps listing", targetId: "rpt-006" },
    { date: "Mar 3, 2026", action: "Commented on Greenfield Labs Product Designer report", targetId: "rpt-003" },
    { date: "Feb 22, 2026", action: "Filed report: NovaTech Solutions Backend Developer", targetId: "rpt-004" },
    { date: "Feb 15, 2026", action: "Confirmed report on Meridian Analytics ML Engineer", targetId: "rpt-008" },
    { date: "Feb 12, 2026", action: "Filed report: NovaTech Solutions Senior Frontend Engineer", targetId: "rpt-001" },
    { date: "Feb 8, 2026", action: "Disputed report on Zenith Corp Sales Director", targetId: "rpt-009" },
    { date: "Jan 28, 2026", action: "Confirmed report on NovaTech Solutions Backend Developer", targetId: "rpt-004" },
    { date: "Jan 20, 2026", action: "Confirmed report on Meridian Analytics Data Scientist", targetId: "rpt-002" },
  ],
};

// ─── Helpers ───

export function getReportById(id: string): Report | undefined {
  return mockReports.find((r) => r.id === id);
}

export function getCompanyBySlug(slug: string): Company | undefined {
  return mockCompanies.find((c) => c.slug === slug);
}

export function getReportsForCompany(slug: string): Report[] {
  return mockReports.filter((r) => r.companySlug === slug);
}

export function getReportsByUser(userId: string): Report[] {
  return mockReports.filter((r) => r.authorId === userId);
}
