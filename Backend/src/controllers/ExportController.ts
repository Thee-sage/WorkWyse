import { Request, Response } from 'express';
import '../types/express';
import ExportService from '../services/ExportService';
import JobService from '../services/JobService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { z } from 'zod';
import logger from '../config/logger';

// ─── CSV row schema for job import ───────────────────────────────────
const importJobRowSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(100),
  location: z.string().min(1).max(100),
  job_url: z.string().url(),
  description: z.string().min(1).max(5000),
  is_fake: z.string().optional().transform((v) => v?.toLowerCase() === 'yes' || v === '1' || v?.toLowerCase() === 'true'),
});

const ExportController = {
  exportJobsCSV: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const csv = await ExportService.exportJobsCSV(req.user.uid, req.user.role);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="workwyse-jobs.csv"');
    res.send(csv);
  }),

  exportReportsCSV: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const csv = await ExportService.exportReportsCSV(req.user.role);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="workwyse-reports.csv"');
    res.send(csv);
  }),

  importJobsCSV: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();

    const csvText = req.body?.csv as string;
    if (!csvText || typeof csvText !== 'string') {
      throw ApiError.badRequest('CSV text is required in request body as "csv" field');
    }

    const rawRows = ExportService.parseJobsCSV(csvText);

    let imported = 0;
    const failed: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const parsed = importJobRowSchema.safeParse(rawRows[i]);
      if (!parsed.success) {
        failed.push({
          row: i + 2, // +2 = 1-indexed + skip header
          reason: (parsed.error as any).flatten?.()?.fieldErrors
            ? Object.values((parsed.error as any).flatten().fieldErrors).flat().join('; ')
            : parsed.error.message,
        });
        continue;
      }

      try {
        await JobService.createJob(
          {
            title: parsed.data.title,
            company: parsed.data.company,
            location: parsed.data.location,
            jobUrl: parsed.data.job_url,
            description: parsed.data.description,
            isFake: parsed.data.is_fake,
          },
          req.user.uid
        );
        imported++;
      } catch (err: any) {
        failed.push({ row: i + 2, reason: err.message ?? 'Unknown error' });
      }
    }

    logger.info('CSV import complete', {
      imported,
      failed: failed.length,
      by: req.user.uid,
    });

    ApiResponse.success(res, { imported, failed, total: rawRows.length }, `Import complete: ${imported} jobs added`);
  }),
};

export default ExportController;
