import Company, { ICompany } from '../models/Company';
import { ApiError } from '../utils/ApiError';

interface PaginationParams {
  page: number;
  limit: number;
}

class CompanyService {
  static async getAll({ page, limit }: PaginationParams) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Company.find().select('-__v').sort({ name: 1 }).skip(skip).limit(limit),
      Company.countDocuments(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string): Promise<ICompany> {
    const company = await Company.findById(id).select('-__v');
    if (!company) throw ApiError.notFound('Company not found');
    return company;
  }

  static async create(data: {
    name: string;
    website?: string;
    description?: string;
    industry?: string;
  }): Promise<ICompany> {
    const existing = await Company.findOne({ name: data.name });
    if (existing) throw ApiError.conflict('Company already exists');
    return await Company.create(data);
  }

  // Finding 10.1 — explicit field picking to prevent mass assignment
  static async update(id: string, data: {
    name?: string;
    website?: string;
    description?: string;
    industry?: string;
  }): Promise<ICompany> {
    // Only pick fields that admins are allowed to update
    const safeUpdate: Record<string, unknown> = {};
    if (data.name !== undefined) safeUpdate.name = data.name;
    if (data.website !== undefined) safeUpdate.website = data.website;
    if (data.description !== undefined) safeUpdate.description = data.description;
    if (data.industry !== undefined) safeUpdate.industry = data.industry;
    // averageRating and totalReports are NEVER set via this endpoint

    const company = await Company.findByIdAndUpdate(id, safeUpdate, { new: true, runValidators: true });
    if (!company) throw ApiError.notFound('Company not found');
    return company;
  }

  static async remove(id: string) {
    const company = await Company.findByIdAndDelete(id);
    if (!company) throw ApiError.notFound('Company not found');
  }
}

export default CompanyService;
