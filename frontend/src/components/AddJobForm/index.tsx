'use client';

import { useState } from 'react';
import { Job } from '../../types/job';
import styles from './style.module.css';
import { useAuth } from '../AuthContext';

interface AddJobFormProps {
  onJobAdded: (job: Job) => void;
}

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
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
      const response = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, uid: user.uid }),
      });
      if (response.ok) {
        const newJob = await response.json();
        onJobAdded(newJob);
        setFormData({
          title: '',
          company: '',
          location: '',
          jobUrl: '',
          description: '',
          isFake: false
        });
      } else {
        const error = await response.json();
        alert(`Failed to add job: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to add job:', error);
      alert('Failed to add job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {/* Job URL */}
          <div className={styles.fullWidth}>
            <label htmlFor="jobUrl" className={styles.label}>
              Job Posting URL *
            </label>
            <input
              type="url"
              id="jobUrl"
              name="jobUrl"
              value={formData.jobUrl}
              onChange={handleChange}
              className={styles.input}
              placeholder="https://example.com/job-posting"
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
            onClick={() => setFormData({
              title: '',
              company: '',
              location: '',
              jobUrl: '',
              description: '',
              isFake: false
            })}
            className={styles.clearButton}
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
} 