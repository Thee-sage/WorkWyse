import express from 'express';
import ExtensionController from '../controllers/ExtensionController';
import { requireApiKey } from '../middleware/apiKeyAuth';
import { extensionLookupLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { lookupUrlSchema } from '../validators/extension.schema';

/**
 * API surface for the future WorkWyse browser extension.
 *
 * Kept as its own router (mounted at /api/extension in app.ts) rather than
 * folded into the jobs/companies routers, so the extension's contract can
 * evolve independently of the web app's — the web app is free to add
 * fields to a job response tomorrow without that silently expanding what
 * the extension is allowed to see, because this router builds its own
 * response shape (see services/ExtensionService.ts) rather than reusing
 * JobController's.
 *
 * Authenticated with an API key (X-API-Key header), not the cookie/JWT
 * session flow — a browser extension popup runs from a chrome-extension://
 * origin and cannot participate in that flow. No route here ever requires
 * or exposes a specific end user's private data.
 */
const router = express.Router();

router.post(
  '/lookup',
  requireApiKey('extension:lookup'),
  extensionLookupLimiter,
  validate(lookupUrlSchema),
  ExtensionController.lookup
);

export default router;
