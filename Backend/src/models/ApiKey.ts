import mongoose, { Document, Schema } from 'mongoose';

/**
 * API keys for the future WorkWyse browser extension (and any other
 * non-browser client that cannot use the cookie-based refresh flow).
 *
 * A Chrome extension popup calls the API from a `chrome-extension://<id>`
 * origin, not a page served by the frontend, so it cannot rely on the
 * SameSite refresh cookie or participate in the CORS-origin allowlist the
 * same way the web app does — the extension's request will simply not carry
 * that cookie. A long-lived bearer key, sent in an `X-API-Key` header and
 * validated in server-side middleware (not CORS), is the standard shape for
 * this kind of client and is what this model backs.
 *
 * Only the hash is stored, the same pattern used for OTPs and passwords —
 * a database read never recovers the usable key. `keyPrefix` keeps the
 * first characters in the clear purely so a key can be identified in the UI
 * ("wwx_a1b2c3...") without exposing the secret.
 */
export interface IApiKey extends Document {
  /** Owner, so the extension can eventually act as a specific user rather
   *  than fully anonymously (e.g. showing "you already filed this"). */
  userId?: mongoose.Types.ObjectId;
  label: string;
  keyHash: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
}

/**
 * Scopes are deliberately narrow. 'extension:lookup' is the only one that
 * exists today and grants nothing beyond the public listing-lookup
 * endpoint — it can never be used to read another user's private data,
 * because the endpoint itself never returns any.
 */
export type ApiKeyScope = 'extension:lookup';

const ApiKeySchema = new Schema<IApiKey>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  label: { type: String, required: true, trim: true, maxlength: 100 },
  // unique: true already creates the index below — no separate .index() call.
  keyHash: { type: String, required: true, unique: true },
  keyPrefix: { type: String, required: true },
  scopes: {
    type: [String],
    enum: ['extension:lookup'],
    default: ['extension:lookup'],
  },
  lastUsedAt: { type: Date },
  revokedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

ApiKeySchema.index({ userId: 1 });

export default mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
