import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Star, DollarSign, ClipboardCheck, Edit2, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { formatMonthYear, getInitials } from '../utils/helpers';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [ratingBreakdown, setRatingBreakdown] = useState({});
  const [pendingReviews, setPendingReviews] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editPayment, setEditPayment] = useState(user?.paymentHandle || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      api.getUserReviews(user.id).then(data => {
        setReviews(data.reviews);
        setRatingBreakdown(data.ratingBreakdown);
      }).catch(() => {});
      api.getPendingReviews().then(data => {
        setPendingReviews(data.pending);
      }).catch(() => {});
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        displayName: editName,
        bio: editBio,
        paymentHandle: editPayment,
      });
      await refreshUser();
      setShowEdit(false);
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/onboarding');
  };

  if (!user) return null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Profile</h1>
        <button onClick={() => setShowEdit(true)} style={{ background: 'none', color: 'var(--gray-500)' }}>
          <Edit2 size={20} />
        </button>
      </div>

      <div className="page-content">
        {/* Profile card */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>
            {user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : getInitials(user.displayName)}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{user.displayName}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{user.university}</p>
          {user.bio && <p style={{ color: 'var(--gray-600)', fontSize: 14, marginTop: 6 }}>{user.bio}</p>}
          <p style={{ color: 'var(--gray-400)', fontSize: 12, marginTop: 4 }}>
            Member since {formatMonthYear(user.createdAt)}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
          <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
            <ClipboardCheck size={20} color="var(--primary)" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-800)' }}>{user.tasksCompleted}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Completed</div>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
            <Star size={20} color="var(--warning)" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-800)' }}>
              {user.avgRating || '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{user.reviewCount} reviews</div>
          </div>
          <div style={{ background: '#ffedd5', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
            <DollarSign size={20} color="var(--primary)" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-800)' }}>
              ${user.totalEarnings}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Earned</div>
          </div>
        </div>

        {/* Pending reviews */}
        {pendingReviews.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Pending Reviews</h3>
            {pendingReviews.map((pr, i) => (
              <div
                key={i}
                onClick={() => navigate(`/review/${pr.task_id}/${pr.reviewee_id}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)',
                  marginBottom: 6, cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Rate {pr.reviewee_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{pr.title}</div>
                </div>
                <ChevronRight size={18} color="var(--gray-400)" />
              </div>
            ))}
          </div>
        )}

        {/* Rating breakdown */}
        {user.reviewCount > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Rating Breakdown</h3>
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingBreakdown[star] || 0;
              const pct = user.reviewCount > 0 ? (count / user.reviewCount) * 100 : 0;
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 16 }}>{star}</span>
                  <Star size={12} color="var(--warning)" fill="var(--warning)" />
                  <div style={{ flex: 1, height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--warning)', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--gray-400)', width: 24, textAlign: 'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div style={{ marginBottom: 24 }}>
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

        {/* Payment info */}
        {user.paymentHandle && (
          <div style={{ marginBottom: 24, padding: 14, background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Payment Handle</div>
            <div style={{ fontWeight: 600 }}>{user.paymentHandle}</div>
          </div>
        )}

        {/* Logout */}
        <button className="btn btn-secondary btn-full" onClick={handleLogout} style={{ marginTop: 8 }}>
          <LogOut size={18} /> Log Out
        </button>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button onClick={() => setShowEdit(false)} style={{ background: 'none' }}>✕</button>
            </div>
            <div className="input-group">
              <label>Display Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Bio</label>
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} />
            </div>
            <div className="input-group">
              <label>Payment Handle</label>
              <input type="text" value={editPayment} onChange={e => setEditPayment(e.target.value)} placeholder="@yourname-venmo" />
            </div>
            <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
