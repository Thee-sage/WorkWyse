import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  averageRating: number;
  totalReports: number;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    website: { type: String, trim: true },
    description: { type: String, trim: true },
    industry: { type: String, trim: true },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReports: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Note: name index already created by unique: true
CompanySchema.index({ industry: 1 });

export default mongoose.model<ICompany>('Company', CompanySchema);
