'use client';

import { useState } from 'react';
import { Job } from '../../types/job';
import { ExtractionResult } from '../../types/extraction';
import { api } from '../../lib/api';
import styles from './style.module.css';
import { useAuth } from '../AuthContext';

interface AddJobFormProps {
  onJobAdded: (job: Job) => void;
}

type ExtractionStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; result: ExtractionResult }
  | { type: 'error'; message: string };

export default function AddJobForm({ onJobAdded }: AddJobFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    jobUrl: '',
    description: '',
    isFake: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionStatus>({ type: 'idle' });

  // Track verification data from extraction
  const [verification, setVerification] = useState<{
    status: 'verified' | 'unverified' | 'none';
    confidence: 'low' | 'medium' | 'high' | null;
    source: 'linkedin' | 'indeed' | 'external' | null;
  }>({
    status: 'none',
    confidence: null,
    source: null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleAutoFill = async () => {
    if (!formData.jobUrl) {
      setExtraction({ type: 'error', message: 'Please enter a job URL first' });
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.jobUrl);
    } catch {
      setExtraction({ type: 'error', message: 'Please enter a valid URL' });
      return;
    }

    setExtraction({ type: 'loading' });

    try {
      const response = await api.jobs.extractUrl(formData.jobUrl);
      const result = response.data;

      if (result.detected) {
        // Auto-fill form fields with extracted data
        setFormData(prev => ({
          ...prev,
          title: result.data.title || prev.title,
          company: result.data.company || prev.company,
          description: result.data.description || prev.description,
        }));

        // Set verification metadata
        const verificationStatus = result.validation.confidence === 'high'
          ? 'verified' as const
          : 'unverified' as const;

        setVerification({
          status: verificationStatus,
          confidence: result.validation.confidence,
          source: result.source,
        });
      } else {
        setVerification({
          status: 'unverified',
          confidence: 'low',
          source: result.source,
        });
      }

      setExtraction({ type: 'success', result });
    } catch (err: any) {
      setExtraction({
        type: 'error',
        message: err.message || 'Failed to extract job data',
      });
      setVerification({ status: 'none', confidence: null, source: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!formData.title || !formData.company || !formData.location || !formData.jobUrl || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      // Use the api wrapper instead of raw fetch; verification fields are server-only
      const response = await api.jobs.create({
        title: formData.title,
        company: formData.company,
        location: formData.location,
        jobUrl: formData.jobUrl,
        description: formData.description,
        isFake: formData.isFake,
      });
      onJobAdded(response.data);
      setFormData({
        title: '',
        company: '',
        location: '',
        jobUrl: '',
        description: '',
        isFake: false
      });
      setExtraction({ type: 'idle' });
      setVerification({ status: 'none', confidence: null, source: null });
    } catch (error: any) {
      console.error('Failed to add job:', error);
      alert(error.message || 'Failed to add job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      company: '',
      location: '',
      jobUrl: '',
      description: '',
      isFake: false
    });
    setExtraction({ type: 'idle' });
    setVerification({ status: 'none', confidence: null, source: null });
  };

  // ─── Source Label Helpers ────────────────────────────────────────

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'linkedin': return 'LinkedIn';
      case 'indeed': return 'Indeed';
      default: return 'external source';
    }
  };

  const getConfidenceBadge = () => {
    if (extraction.type !== 'success') return null;
    const { result } = extraction;
    const { confidence } = result.validation;

    if (result.detected && confidence === 'high') {
      return (
        <div className={styles.badgeSuccess}>
          <span className={styles.badgeIcon}>✓</span>
          Auto-filled from {getSourceLabel(result.source)}
        </div>
      );
    }

    if (result.detected && confidence === 'medium') {
      return (
        <div className={styles.badgeMedium}>
          <span className={styles.badgeIcon}>⚡</span>
          Partially extracted from {getSourceLabel(result.source)} — please review
        </div>
      );
    }

    if (result.detected && confidence === 'low') {
      return (
        <div className={styles.badgeWarning}>
          <span className={styles.badgeIcon}>⚠</span>
          Low confidence extraction — please verify all fields
        </div>
      );
    }

    return (
      <div className={styles.badgeWarning}>
        <span className={styles.badgeIcon}>⚠</span>
        Could not verify this URL — please fill in details manually
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────

  if (!user?.uid) {
    return (
      <div className={`${styles.container} ${styles.notLoggedInContainer}`}>
        <h2 className={styles.title}>Add New Job Listing</h2>
        <p className={styles.notLoggedInText}>You must be <span className={styles.loginLink}>logged in</span> to add a job.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Add New Job Listing</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Job URL + Auto Fill — TOP OF FORM */}
          <div className={styles.fullWidth}>
            <label htmlFor="jobUrl" className={styles.label}>
              Job Posting URL *
            </label>
            <div className={styles.urlRow}>
              <input
                type="url"
                id="jobUrl"
                name="jobUrl"
                value={formData.jobUrl}
                onChange={handleChange}
                className={styles.urlInput}
                placeholder="https://linkedin.com/jobs/view/..."
                required
              />
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={extraction.type === 'loading' || !formData.jobUrl}
                className={styles.autoFillButton}
              >
                {extraction.type === 'loading' ? (
                  <>
                    <span className={styles.spinner} />
                    Extracting…
                  </>
                ) : (
                  <>
                    <span className={styles.autoFillIcon}>⚙</span>
                    Auto Fill
                  </>
                )}
              </button>
            </div>
            {/* Extraction Status Badge */}
            {extraction.type === 'success' && getConfidenceBadge()}
            {extraction.type === 'error' && (
              <div className={styles.badgeError}>
                <span className={styles.badgeIcon}>✕</span>
                {extraction.message}
              </div>
            )}
          </div>

          {/* Job Title */}
          <div className={styles.fullWidth}>
            <label htmlFor="title" className={styles.label}>
              Job Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={styles.input}
              placeholder="e.g., Senior Software Engineer"
              required
            />
          </div>
          {/* Company */}
          <div>
            <label htmlFor="company" className={styles.label}>
              Company *
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className={styles.input}
              placeholder="e.g., TechCorp Inc."
              required
            />
          </div>
          {/* Location */}
          <div>
            <label htmlFor="location" className={styles.label}>
              Location *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={styles.input}
              placeholder="e.g., San Francisco, CA or Remote"
              required
            />
          </div>
          {/* Description */}
          <div className={styles.fullWidth}>
            <label htmlFor="description" className={styles.label}>
              Job Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={styles.textarea}
              placeholder="Brief description of the job posting..."
              required
            />
          </div>
          {/* Is Fake Job */}
          <div className={styles.fullWidth}>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="isFake"
                name="isFake"
                checked={formData.isFake}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <label htmlFor="isFake" className={styles.checkboxLabel}>
                This appears to be a fake or ghost job posting
              </label>
            </div>
            <p className={styles.helpText}>
              Check this if you believe this job posting is fake, doesn't exist, or the company is not actually hiring.
            </p>
          </div>
        </div>
        {/* Submit Button */}
        <div className={styles.buttonContainer}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? 'Adding Job...' : 'Add Job Listing'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className={styles.clearButton}
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
}