'use client';

import { useState } from 'react';
import JobCard from '../JobCard';
import { Job } from '../../types/job';
import styles from './style.module.css';

interface JobListProps {
  jobs: Job[];
  onVote: (jobId: string, voteType: 'upvote' | 'downvote') => void;
  userType: 'public' | 'private';
}

export default function JobList({ jobs, onVote, userType }: JobListProps) {
  const [filter, setFilter] = useState<'all' | 'fake' | 'real'>('all');

  const filteredJobs = jobs.filter(job => {
    if (filter === 'fake') return job.isFake;
    if (filter === 'real') return !job.isFake;
    return true;
  });

  const realJobsCount = jobs.filter(j => !j.isFake).length;
  const fakeJobsCount = jobs.filter(j => j.isFake).length;

  return (
    <div className={styles.container}>
      {/* Stats Section */}
      <div className={styles.statsSection}>
        <div className={`${styles.statCard} ${styles.statCardTotal}`}>
          <span className={styles.statNumber}>{jobs.length}</span>
          <span className={styles.statLabel}>Total Jobs</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardReal}`}>
          <span className={styles.statNumber}>{realJobsCount}</span>
          <span className={styles.statLabel}>Real Jobs</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardFake}`}>
          <span className={styles.statNumber}>{fakeJobsCount}</span>
          <span className={styles.statLabel}>Fake Jobs</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>Filter Job Listings</h3>
        <div className={styles.filterButtons}>
          <button
            onClick={() => setFilter('all')}
            className={`${styles.filterButton} ${
              filter === 'all' ? styles.filterButtonAll : styles.filterButtonInactive
            }`}
          >
            All Jobs
            <span className={styles.jobCount}>({jobs.length})</span>
          </button>
          <button
            onClick={() => setFilter('real')}
            className={`${styles.filterButton} ${
              filter === 'real' ? styles.filterButtonReal : styles.filterButtonInactive
            }`}
          >
            Real Jobs
            <span className={styles.jobCount}>({realJobsCount})</span>
          </button>
          <button
            onClick={() => setFilter('fake')}
            className={`${styles.filterButton} ${
              filter === 'fake' ? styles.filterButtonFake : styles.filterButtonInactive
            }`}
          >
            Fake Jobs
            <span className={styles.jobCount}>({fakeJobsCount})</span>
          </button>
        </div>
      </div>

      {/* Job Cards */}
      <div className={styles.jobsContainer}>
        {filteredJobs.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>🔍</div>
            <h3 className={styles.emptyStateTitle}>No jobs found</h3>
            <p className={styles.emptyStateMessage}>
              No jobs match your current filter. Try adjusting your filter or add a new job listing.
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <JobCard key={job._id} job={job} onVote={onVote} userType={userType} />
          ))
        )}
      </div>
    </div>
  );
} 