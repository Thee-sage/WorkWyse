import { Request, Response } from 'express';
import ExtensionService from '../services/ExtensionService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { assertUrlIsFetchable, SsrfBlockedError } from '../utils/urlGuard';
import { ApiError } from '../utils/ApiError';

const ExtensionController = {
  /**
   * POST /api/extension/lookup
   *
   * Given a job listing URL the extension observed the user viewing,
   * returns what WorkWyse knows about it. No user identity is required or
   * exposed — the API key only proves the caller is a registered client of
   * this endpoint, not a specific person.
   */
  lookup: catchAsync(async (req: Request, res: Response) => {
    const { url } = req.body as { url: string };

    // Reuses the same SSRF-hardening address check the job-URL extractor
    // uses, even though this endpoint never fetches the URL itself — it
    // still only ever does a database lookup against it. The guard is
    // cheap and it keeps this endpoint from becoming a way to probe whether
    // an internal/private address resolves, since the response otherwise
    // differs (known vs unknown) based on the input.
    try {
      await assertUrlIsFetchable(url);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw ApiError.badRequest('That URL cannot be looked up.');
      }
      throw err;
    }

    const result = await ExtensionService.lookupByUrl(url);
    ApiResponse.success(res, result);
  }),
};

export default ExtensionController;
