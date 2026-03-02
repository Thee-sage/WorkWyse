export interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  description: string;
  isFake: boolean;
  upvotes: number;
  downvotes: number;
  reviews: Review[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  jobId: string;
  rating: number;
  comment: string;
  author: string;
  createdAt: string;
} 