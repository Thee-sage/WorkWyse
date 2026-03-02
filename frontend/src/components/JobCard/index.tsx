'use client';

import { useState } from 'react';
import ReviewForm from '../ReviewForm';
import { Job, Review } from '../../types/job';
import styles from './style.module.css';
import { useAuth } from '../AuthContext';

interface JobCardProps {
  job: Job;
  onVote: (jobId: string, voteType: 'upvote' | 'downvote', uid?: string) => void;
  userType: 'public' | 'private';
}

export default function JobCard({ job, onVote, userType }: JobCardProps) {
  const { user } = useAuth();
  const [showReviews, setShowReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleVote = (voteType: 'upvote' | 'downvote') => {
    if (!user?.uid) return;
    onVote(job._id, voteType, user.uid);
  };

  const handleReviewAdded = () => {
    setShowReviewForm(false);
    window.location.reload();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={styles.container}>
      {/* Job Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleContainer}>
            <h3 className={styles.title}>{job.title}</h3>
            {job.isFake && (
              <span className={styles.fakeBadge}>
                Fake Job
              </span>
            )}
          </div>
          <p className={styles.company}>{job.company}</p>
          <p className={styles.location}>{job.location}</p>
        </div>
        <div className={styles.dateContainer}>
          <p className={styles.date}>Posted: {formatDate(job.createdAt)}</p>
        </div>
      </div>

      {/* Job Description */}
      <p className={styles.description}>{job.description}</p>

      {/* Job URL */}
      <div className={styles.urlContainer}>
        <a
          href={job.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.jobUrl}
        >
          View Job Posting →
        </a>
      </div>

      {/* Voting Section - only for public users */}
      {userType === 'public' && (
        <div className={styles.votingSection}>
          <div className={styles.voteButtons}>
            <button
              onClick={() => handleVote('upvote')}
              className={styles.upvoteButton}
              disabled={!user?.uid}
              title={user?.uid ? 'Upvote' : 'Login to vote'}
            >
              <span>👍</span>
              <span className={styles.voteCount}>{job.upvotes}</span>
            </button>
            <button
              onClick={() => handleVote('downvote')}
              className={styles.downvoteButton}
              disabled={!user?.uid}
              title={user?.uid ? 'Downvote' : 'Login to vote'}
            >
              <span>👎</span>
              <span className={styles.voteCount}>{job.downvotes}</span>
            </button>
          </div>
          <div className={styles.trustScore}>
            {job.upvotes + job.downvotes > 0 && (
              <span>
                Trust Score: {Math.round((job.upvotes / (job.upvotes + job.downvotes)) * 100)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className={styles.reviewsSection}>
        <div className={styles.reviewsHeader}>
          <h4 className={styles.reviewsTitle}>
            Reviews ({job.reviews.length})
          </h4>
          <div className={styles.reviewsActions}>
            <button
              onClick={() => setShowReviews(!showReviews)}
              className={styles.reviewButton}
            >
              {showReviews ? 'Hide Reviews' : 'Show Reviews'}
            </button>
            {/* All logged-in users can add reviews */}
            {user?.uid && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className={styles.reviewButton}
                title={'Add Review'}
              >
                Add Review
              </button>
            )}
          </div>
        </div>

        {/* Review Form - for all logged-in users */}
        {showReviewForm && user?.uid && (
          <div className={styles.reviewFormContainer}>
            <ReviewForm jobId={job._id} onReviewAdded={handleReviewAdded} />
          </div>
        )}

        {/* Reviews List */}
        {showReviews && (
          <div className={styles.reviewsList}>
            {job.reviews.length === 0 ? (
              <p className={styles.noReviews}>No reviews yet. Be the first to review!</p>
            ) : (
              job.reviews.map((review) => (
                <div key={review._id} className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewAuthor}>
                      <span className={styles.authorName}>{review.author}</span>
                      <div className={styles.stars}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={styles.star}>
                            {i < review.rating ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={styles.reviewDate}>
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  <p className={styles.reviewComment}>{review.comment}</p>
                </div>
              ))
            )}
          </div>
        )}
        {!user?.uid && (
          <div className={styles.loginPrompt}>
            Login to {userType === 'public' ? 'vote' : 'add a review'}.
          </div>
        )}
      </div>
    </div>
  );
} 