// ─── Job URL Extraction API Response Types ──────────────────────────

export type JobSource = 'linkedin' | 'indeed' | 'external';
export type Confidence = 'low' | 'medium' | 'high';

export interface ExtractionData {
  title?: string;
  company?: string;
  description?: string;
  location?: string;
}

export interface ExtractionValidation {
  isValid: boolean;
  confidence: Confidence;
}

export interface ExtractionResult {
  detected: boolean;
  source: JobSource;
  reason?: string;
  data: ExtractionData;
  validation: ExtractionValidation;
}
