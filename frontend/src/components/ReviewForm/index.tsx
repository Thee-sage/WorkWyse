'use client';

import { useState, useEffect } from 'react';
import styles from './style.module.css';
import { useAuth } from '../AuthContext';

interface ReviewFormProps {
  jobId: string;
  onReviewAdded: () => void;
}

export default function ReviewForm({ jobId, onReviewAdded }: ReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState(user?.username || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAuthor(user?.username || '');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!comment.trim() || !author.trim()) {
      alert('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          author: author.trim(),
          uid: user.uid,
        }),
      });
      if (response.ok) {
        setComment('');
        setAuthor('');
        setRating(5);
        onReviewAdded();
      } else {
        const error = await response.json();
        alert(`Failed to add review: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to add review:', error);
      alert('Failed to add review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user?.uid) {
    return <div className={styles.notLoggedIn}>You must be logged in to add a review.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      <h5 className={styles.title}>Add Your Review</h5>
      <div className={styles.formContent}>
        {/* Rating */}
        <div className={styles.ratingSection}>
          <label className={styles.label}>
            Rating
          </label>
          <div className={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={styles.starButton}
              >
                <span className={star <= rating ? styles.starFilled : styles.starEmpty}>
                  ★
                </span>
              </button>
            ))}
          </div>
          <p className={styles.ratingText}>
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        </div>
        {/* Author */}
        <div className={styles.inputSection}>
          <label htmlFor="author" className={styles.label}>
            Your Name
          </label>
          <input
            type="text"
            id="author"
            value={author}
            className={styles.input}
            readOnly
            required
          />
        </div>
        {/* Comment */}
        <div className={styles.inputSection}>
          <label htmlFor="comment" className={styles.label}>
            Review
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className={styles.textarea}
            placeholder="Share your experience with this job posting..."
            required
          />
        </div>
        {/* Submit Button */}
        <div className={styles.buttonContainer}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
          <button
            type="button"
            onClick={() => {
              setComment('');
              setAuthor('');
              setRating(5);
            }}
            className={styles.clearButton}
          >
            Clear
          </button>
        </div>
      </div>
    </form>
  );
} 