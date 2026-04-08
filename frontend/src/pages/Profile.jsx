import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwn = currentUser && Number(id) === currentUser.id;

  useEffect(() => {
    fetchProfile();
    fetchReviews();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/users/${id}`);
      setProfile(res.data);
      setEditForm({ name: res.data.name, bio: res.data.bio || '', phone: res.data.phone || '' });
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/users/${id}/reviews`);
      setReviews(res.data);
    } catch {}
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/users/profile', editForm);
      setProfile(prev => ({ ...prev, ...res.data }));
      if (isOwn) updateUser(res.data);
      setEditing(false);
      setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!profile) return <div className="empty-state"><h3>User not found</h3></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h1>{profile.name}</h1>
            <p>{profile.university}</p>
            {profile.bio && <p style={{ marginTop: '8px' }}>{profile.bio}</p>}
            {isOwn && profile.phone && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Phone: {profile.phone}</p>}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Joined {new Date(profile.created_at + 'Z').toLocaleDateString()}
            </p>
          </div>
          {isOwn && !editing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)} style={{ marginLeft: 'auto' }}>
              Edit Profile
            </button>
          )}
        </div>

        {editing && isOwn && (
          <form onSubmit={handleSave} style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                className="form-control"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                className="form-control"
                value={editForm.bio}
                onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell others about yourself"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                className="form-control"
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Your phone number"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-value">{profile.rating > 0 ? profile.rating.toFixed(1) : '-'}</div>
          <div className="stat-label">Rating</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{profile.total_reviews}</div>
          <div className="stat-label">Reviews</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{profile.tasks_posted}</div>
          <div className="stat-label">Tasks Posted</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{profile.tasks_helped}</div>
          <div className="stat-label">Tasks Helped</div>
        </div>
      </div>

      {reviews.length > 0 && (
        <div>
          <h3 className="section-title">Reviews</h3>
          <div className="reviews-list">
            {reviews.map(review => (
              <div key={review.id} className="card review-card">
                <div className="review-content">
                  <div className="review-header">
                    <strong>{review.reviewer_name}</strong>
                    <span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  <div className="review-meta" style={{ marginBottom: '4px' }}>for: {review.task_title}</div>
                  {review.comment && <p className="review-text">{review.comment}</p>}
                  <div className="review-meta">{new Date(review.created_at + 'Z').toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
