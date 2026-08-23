import { Request, Response } from 'express';
import '../types/express';
import CompanyService from '../services/CompanyService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const CompanyController = {
  getAll: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await CompanyService.getAll({ page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const company = await CompanyService.getById(req.params.id);
    ApiResponse.success(res, company);
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    const company = await CompanyService.create(req.body);
    ApiResponse.created(res, company, 'Company created successfully');
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const company = await CompanyService.update(req.params.id, req.body);
    ApiResponse.success(res, company, 'Company updated successfully');
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    await CompanyService.remove(req.params.id);
    ApiResponse.noContent(res);
  }),

  resolveByName: catchAsync(async (req: Request, res: Response) => {
    const company = await CompanyService.resolveByName(req.params.name);
    ApiResponse.success(res, company);
  }),

  getReviews: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await CompanyService.getReviews(req.params.id, { page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  addReview: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const review = await CompanyService.addReview(req.params.id, req.body, req.user.uid);
    ApiResponse.created(res, review, 'Review added successfully');
  }),

  getStats: catchAsync(async (req: Request, res: Response) => {
    const stats = await CompanyService.getStats(req.params.id);
    ApiResponse.success(res, stats);
  }),

  getPatterns: catchAsync(async (req: Request, res: Response) => {
    const patterns = await CompanyService.getPatterns(req.params.id);
    ApiResponse.success(res, patterns);
  }),
};

export default CompanyController;
