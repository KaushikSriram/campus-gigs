import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ClipboardCheck, Flag, Ban } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { getInitials } from '../utils/helpers';

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [ratingBreakdown, setRatingBreakdown] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If viewing own profile, redirect
    if (id === currentUser.id) {
      navigate('/profile');
      return;
    }
    loadProfile();
  }, [id]); // eslint-disable-line

  const loadProfile = async () => {
    try {
      const [userData, reviewData] = await Promise.all([
        api.getUser(id),
        api.getUserReviews(id),
      ]);
      setProfileUser(userData.user);
      setReviews(reviewData.reviews);
      setRatingBreakdown(reviewData.ratingBreakdown);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleBlock = async () => {
    if (!window.confirm('Block this user?')) return;
    try {
      await api.blockUser(id);
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!profileUser) return <div className="page-content"><div className="error-banner">User not found</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none' }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontWeight: 600 }}>Profile</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleBlock} style={{ background: 'none', color: 'var(--gray-400)' }} title="Block user">
            <Ban size={18} />
          </button>
        </div>
      </div>

      <div className="page-content">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>
            {profileUser.profilePhoto ? <img src={profileUser.profilePhoto} alt="" /> : getInitials(profileUser.displayName)}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{profileUser.displayName}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{profileUser.university}</p>
          {profileUser.bio && <p style={{ color: 'var(--gray-600)', fontSize: 14, marginTop: 6 }}>{profileUser.bio}</p>}
          <p style={{ color: 'var(--gray-400)', fontSize: 12, marginTop: 4 }}>
            Member since {new Date(profileUser.createdAt + 'Z').toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
            <ClipboardCheck size={20} color="var(--primary)" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 22, fontWeight: 800 }}>{profileUser.tasksCompleted}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Tasks Done</div>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
            <Star size={20} color="var(--warning)" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 22, fontWeight: 800 }}>{profileUser.avgRating || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{profileUser.reviewCount} reviews</div>
          </div>
        </div>

        {/* Rating breakdown */}
        {profileUser.reviewCount > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Ratings</h3>
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingBreakdown[star] || 0;
              const pct = profileUser.reviewCount > 0 ? (count / profileUser.reviewCount) * 100 : 0;
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 16 }}>{star}</span>
                  <Star size={12} color="var(--warning)" fill="var(--warning)" />
                  <div style={{ flex: 1, height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--warning)', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--gray-400)', width: 24, textAlign: 'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Reviews</h3>
            {reviews.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--gray-100)', padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div className="avatar avatar-sm">
                    {r.reviewerPhoto ? <img src={r.reviewerPhoto} alt="" /> : getInitials(r.reviewerName)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{r.reviewerName}</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} color="var(--warning)" fill={s <= r.rating ? 'var(--warning)' : 'none'} />
                      ))}
                    </div>
                  </div>
                </div>
                {r.comment && <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>{r.comment}</p>}
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>For: {r.taskTitle}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
