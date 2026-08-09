import { Job, IJob } from '../models/Job';
import Report from '../models/Report';
import User from '../models/User';
import { ApiError } from '../utils/ApiError';
import { Readable, PassThrough } from 'stream';

// ─── CSV Helpers ─────────────────────────────────────────────────────

function escapeCSV(value: unknown): string {
  const str = String(value ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

function rowsToCSV(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCSV).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCSV).join(','));
  }
  return lines.join('\r\n');
}

// ─── ExportService ───────────────────────────────────────────────────

class ExportService {
  /**
   * Export jobs as CSV.
   * Admin gets all jobs; regular user gets only their own.
   */
  static async exportJobsCSV(
    requestingUid: string,
    requestingRole: string
  ): Promise<string> {
    let jobs: IJob[];

    if (requestingRole === 'admin') {
      jobs = await Job.find().select('-__v').sort({ createdAt: -1 }).limit(5000);
    } else {
      const user = await User.findOne({ uid: requestingUid }).select('_id');
      if (!user) throw ApiError.notFound('User not found');
      jobs = await Job.find({ submittedBy: user._id })
        .select('-__v')
        .sort({ createdAt: -1 })
        .limit(5000);
    }

    const headers = [
      'ID', 'Title', 'Company', 'Location', 'Job URL',
      'Is Fake', 'Upvotes', 'Downvotes',
      'Verification Status', 'Has Evidence',
      'Created At',
    ];

    const rows = jobs.map((j) => [
      (j._id as any).toString(),
      j.title,
      j.company,
      j.location,
      j.jobUrl,
      j.isFake ? 'Yes' : 'No',
      String(j.upvotes),
      String(j.downvotes),
      j.verificationStatus,
      j.hasEvidence ? 'Yes' : 'No',
      j.createdAt.toISOString(),
    ]);

    return rowsToCSV(headers, rows);
  }

  /**
   * Export reports as CSV (admin only).
   */
  static async exportReportsCSV(requestingRole: string): Promise<string> {
    if (requestingRole !== 'admin') throw ApiError.forbidden('Admin access required');

    const reports = await Report.find()
      .select('-__v')
      .populate('reportedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(5000);

    const headers = [
      'ID', 'Reported By', 'Target Type', 'Target ID',
      'Reason', 'Status', 'Created At',
    ];

    const rows = reports.map((r) => [
      (r._id as any).toString(),
      (r.reportedBy as any)?.username ?? 'Unknown',
      r.targetType,
      r.targetId.toString(),
      r.reason,
      r.status,
      r.createdAt.toISOString(),
    ]);

    return rowsToCSV(headers, rows);
  }

  /**
   * Parse a CSV buffer and return an array of job-like objects.
   * Used by the import route.
   */
  static parseJobsCSV(csvText: string): Array<Record<string, string>> {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw ApiError.badRequest('CSV must have a header row and at least one data row');

    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'));

    const records: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic CSV parsing — handles quoted fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx] ?? '';
      });
      records.push(record);
    }

    return records;
  }
}

export default ExportService;
