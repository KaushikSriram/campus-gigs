import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { api } from '../utils/api';
import { getInitials } from '../utils/helpers';

export default function ReviewForm() {
  const { taskId, revieweeId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewee, setReviewee] = useState(null);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [taskId, revieweeId]); // eslint-disable-line

  const loadData = async () => {
    try {
      const [userData, taskData] = await Promise.all([
        api.getUser(revieweeId),
        api.getTask(taskId),
      ]);
      setReviewee(userData.user);
      setTask(taskData.task);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.submitReview({
        taskId,
        revieweeId,
        rating,
        comment: comment.trim(),
      });
      navigate(-1);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none' }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontWeight: 600 }}>Rate Experience</span>
        <div style={{ width: 28 }} />
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}

        {/* Task info */}
        {task && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>Task</p>
            <p style={{ fontWeight: 600, fontSize: 15 }}>{task.title}</p>
          </div>
        )}

        {/* Reviewee */}
        {reviewee && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="avatar avatar-lg" style={{ margin: '0 auto 8px' }}>
              {reviewee.profilePhoto ? <img src={reviewee.profilePhoto} alt="" /> : getInitials(reviewee.displayName)}
            </div>
            <p style={{ fontWeight: 700, fontSize: 18 }}>{reviewee.displayName}</p>
            <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>How was your experience?</p>
          </div>
        )}

        {/* Star rating */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              style={{ background: 'none', padding: 4, transition: 'transform 0.15s' }}
            >
              <Star
                size={40}
                color="var(--warning)"
                fill={s <= (hoverRating || rating) ? 'var(--warning)' : 'none'}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--gray-600)', marginBottom: 16, fontWeight: 500 }}>
            {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Excellent!'}
          </p>
        )}

        {/* Comment */}
        <div className="input-group">
          <label>Leave a comment (optional)</label>
          <textarea
            placeholder="Tell them what went well or could be improved..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          style={{ fontSize: 16, padding: 16 }}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => navigate(-1)} style={{ marginTop: 8 }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
