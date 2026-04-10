import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Calendar, DollarSign, Users, Star, MessageCircle, Flag, Ban, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { formatDate, getInitials, CATEGORY_COLORS, timeAgo } from '../utils/helpers';

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    loadTask();
  }, [id]); // eslint-disable-line

  const loadTask = async () => {
    try {
      const data = await api.getTask(id);
      setTask(data.task);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    setActionLoading(true);
    try {
      await api.applyToTask(id);
      await loadTask();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  };

  const handleAccept = async (appId) => {
    setActionLoading(true);
    try {
      await api.acceptApplicant(id, appId);
      await loadTask();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  };

  const handleDecline = async (appId) => {
    try {
      await api.declineApplicant(id, appId);
      await loadTask();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this task as complete? This will finalize the task.')) return;
    setActionLoading(true);
    try {
      await api.completeTask(id);
      await loadTask();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Cancel this task? This action cannot be undone.')) return;
    try {
      await api.deleteTask(id);
      navigate('/my-tasks');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelApplication = async () => {
    if (!window.confirm('Cancel your application?')) return;
    try {
      await api.cancelApplication(id);
      await loadTask();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await api.reportUser({ reportedId: task.posterId, taskId: id, reason: reportReason });
      setShowReport(false);
      setReportReason('');
      alert('Report submitted. Our team will review it.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm('Block this user? You won\'t see their tasks anymore.')) return;
    try {
      await api.blockUser(task.posterId);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!task) return <div className="page-content"><div className="error-banner">{error || 'Task not found'}</div></div>;

  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Other'];
  const isOwner = task.posterId === user.id;
  const slotsOpen = task.helpersNeeded - task.helpersAccepted;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-500)' }}>Task Details</span>
        {!isOwner && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowReport(true)} style={{ background: 'none', color: 'var(--gray-400)' }}>
              <Flag size={18} />
            </button>
            <button onClick={handleBlock} style={{ background: 'none', color: 'var(--gray-400)' }}>
              <Ban size={18} />
            </button>
          </div>
        )}
        {isOwner && task.status === 'open' && (
          <button onClick={handleDelete} style={{ background: 'none', color: 'var(--danger)' }}>
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="page-content desktop-narrow">
        {error && <div className="error-banner">{error}</div>}

        {/* Category & Status */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span className="category-badge" style={{ background: colors.bg, color: colors.text }}>
            {task.category}
          </span>
          {task.status !== 'open' && (
            <span className="category-badge" style={{
              background: task.status === 'completed' ? '#ffedd5' : task.status === 'in_progress' ? '#dbeafe' : '#fef3c7',
              color: task.status === 'completed' ? '#ea580c' : task.status === 'in_progress' ? '#2563eb' : '#d97706',
            }}>
              {task.status === 'in_progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>{task.title}</h1>

        {/* Poster info */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, cursor: 'pointer' }}
          onClick={() => navigate(`/user/${task.posterId}`)}
        >
          <div className="avatar">
            {task.posterPhoto ? <img src={task.posterPhoto} alt="" /> : getInitials(task.posterName)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{task.posterName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--gray-500)' }}>
              {task.posterRating && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--warning)' }}>
                  <Star size={12} fill="currentColor" /> {task.posterRating}
                </span>
              )}
              <span>{task.posterReviewCount} review{task.posterReviewCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-400)' }}>
            {timeAgo(task.createdAt)}
          </div>
        </div>

        {/* Pay */}
        <div style={{
          background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: 16,
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <DollarSign size={24} color="var(--primary)" />
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>${task.offeredPay}</div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>Offered pay</div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 12, marginBottom: 4 }}>
              <MapPin size={14} /> Location
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{task.location}</div>
          </div>
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 12, marginBottom: 4 }}>
              <Calendar size={14} /> When
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{task.dateType === 'asap' ? 'ASAP' : formatDate(task.dateTime)}</div>
          </div>
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 12, marginBottom: 4 }}>
              <Clock size={14} /> Duration
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{task.estimatedDuration || 'Not specified'}</div>
          </div>
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 12, marginBottom: 4 }}>
              <Users size={14} /> Helpers
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {task.helpersAccepted}/{task.helpersNeeded} filled
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Description</h3>
          <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {task.description}
          </p>
        </div>

        {/* Photos */}
        {task.photos && task.photos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Photos</h3>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {task.photos.map((photo, i) => (
                <img key={i} src={photo} alt="" style={{ height: 120, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
              ))}
            </div>
          </div>
        )}

        {/* Applicants (poster view) */}
        {isOwner && task.applicants && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              Applicants ({task.applicants.length})
            </h3>
            {task.applicants.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--gray-400)' }}>No one has applied yet.</p>
            ) : (
              task.applicants.map(app => (
                <div key={app.applicationId} style={{
                  border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
                  padding: 12, marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div className="avatar avatar-sm" onClick={() => navigate(`/user/${app.user.id}`)} style={{ cursor: 'pointer' }}>
                      {app.user.profilePhoto ? <img src={app.user.profilePhoto} alt="" /> : getInitials(app.user.displayName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{app.user.displayName}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {app.user.avgRating && <span style={{ color: 'var(--warning)' }}>★ {app.user.avgRating}</span>}
                        {' '}{app.user.tasksCompleted} tasks done
                      </div>
                    </div>
                    <span className="category-badge" style={{
                      background: app.status === 'accepted' ? '#ffedd5' : app.status === 'declined' ? '#fee2e2' : '#f3f4f6',
                      color: app.status === 'accepted' ? '#ea580c' : app.status === 'declined' ? '#dc2626' : '#6b7280',
                    }}>
                      {app.status}
                    </span>
                  </div>
                  {app.user.bio && (
                    <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 8 }}>{app.user.bio}</p>
                  )}
                  {app.status === 'pending' && slotsOpen > 0 && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleAccept(app.applicationId)} disabled={actionLoading} style={{ flex: 1 }}>
                        Accept
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDecline(app.applicationId)} style={{ flex: 1 }}>
                        Decline
                      </button>
                    </div>
                  )}
                  {app.status === 'accepted' && (
                    <button className="btn btn-outline btn-sm btn-full" onClick={() => navigate(`/chat/${task.id}/${app.user.id}`)}>
                      <MessageCircle size={14} /> Message
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ paddingBottom: 20 }}>
          {/* Tasker: apply */}
          {!isOwner && task.status === 'open' && !task.myApplication && slotsOpen > 0 && (
            <button className="btn btn-primary btn-full" onClick={handleApply} disabled={actionLoading} style={{ fontSize: 16, padding: 16 }}>
              {actionLoading ? 'Applying...' : "I'll Do It"}
            </button>
          )}

          {/* Tasker: already applied */}
          {!isOwner && task.myApplication && task.myApplication.status === 'pending' && (
            <div>
              <div style={{ textAlign: 'center', padding: 16, background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Application submitted! Waiting for poster to respond.</span>
              </div>
              <button className="btn btn-secondary btn-full btn-sm" onClick={handleCancelApplication}>
                Cancel Application
              </button>
            </div>
          )}

          {/* Tasker: accepted */}
          {!isOwner && task.myApplication && task.myApplication.status === 'accepted' && (
            <div>
              <div style={{ textAlign: 'center', padding: 16, background: '#ffedd5', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: '#ea580c' }}>You've been accepted!</span>
              </div>
              <button className="btn btn-primary btn-full" onClick={() => navigate(`/chat/${task.id}/${task.posterId}`)}>
                <MessageCircle size={18} /> Message Poster
              </button>
            </div>
          )}

          {/* Poster: mark complete */}
          {isOwner && (task.status === 'in_progress' || task.status === 'open') && task.helpersAccepted > 0 && (
            <button className="btn btn-primary btn-full" onClick={handleComplete} disabled={actionLoading} style={{ marginBottom: 8 }}>
              <CheckCircle size={18} /> Mark as Complete
            </button>
          )}

          {/* Completed: review prompt */}
          {task.status === 'completed' && !isOwner && task.myApplication?.status === 'completed' && (
            <button className="btn btn-primary btn-full" onClick={() => navigate(`/review/${task.id}/${task.posterId}`)}>
              <Star size={18} /> Rate This Experience
            </button>
          )}
          {task.status === 'completed' && isOwner && task.applicants?.some(a => a.status === 'completed') && (
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Rate your tasker(s):</p>
              {task.applicants.filter(a => a.status === 'completed').map(a => (
                <button key={a.user.id} className="btn btn-outline btn-full btn-sm" style={{ marginBottom: 6 }}
                  onClick={() => navigate(`/review/${task.id}/${a.user.id}`)}>
                  <Star size={14} /> Rate {a.user.displayName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report modal */}
      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report User</h2>
              <button onClick={() => setShowReport(false)} style={{ background: 'none' }}>✕</button>
            </div>
            <div className="input-group">
              <label>Reason</label>
              <select value={reportReason} onChange={e => setReportReason(e.target.value)}>
                <option value="">Select a reason</option>
                <option value="spam">Spam or fake task</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="scam">Scam or fraud</option>
                <option value="harassment">Harassment</option>
                <option value="safety">Safety concern</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button className="btn btn-danger btn-full" onClick={handleReport}>Submit Report</button>
          </div>
        </div>
      )}
    </div>
  );
}
