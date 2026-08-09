import { Request, Response } from 'express';
import CompanyService from '../services/CompanyService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';

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
};

export default CompanyController;
