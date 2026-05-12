import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Calendar, DollarSign, Users, Star,
  MessageCircle, Flag, Ban, Trash2, CheckCircle, Lock, Unlock, HelpCircle, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import {
  formatDate, getInitials, timeAgo,
  isTaskExpired, isTaskInactive, taskInactiveLabel,
} from '../utils/helpers';

const CATEGORY_COLORS = {
  'Moving & Heavy Lifting': { bg: '#FEE2E2', text: '#991B1B' },
  'Delivery & Pickup': { bg: '#DBEAFE', text: '#1E40AF' },
  'Academic Help': { bg: '#FEF3C7', text: '#92400E' },
  'Tech Help': { bg: '#EDE9FE', text: '#5B21B6' },
  'Errands': { bg: '#FFEDD5', text: '#9A3412' },
  'Cleaning & Organization': { bg: '#FCE7F3', text: '#9D174D' },
  'Assembly & Setup': { bg: '#FED7AA', text: '#9A3412' },
  'Event Help': { bg: '#E9D5FF', text: '#6B21A8' },
  'Creative & Design': { bg: '#CCFBF1', text: '#115E59' },
  'Other': { bg: '#F3F4F6', text: '#374151' },
};

export default function TaskDetail() {
  const { id } = useParams();
  const { user, requireLogin } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);

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

  const handleMessagePoster = () => {
    requireLogin(async () => {
      try {
        await api.expressInterest(id);
      } catch {
        // ignore
      }
      navigate(`/chat/${task.id}/${task.posterId}`);
    });
  };

  const handleWithdraw = async () => {
    if (!window.confirm("Withdraw your interest?")) return;
    setActionLoading(true);
    try {
      await api.withdrawInterest(id);
      await loadTask();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  };

  const handleFill = async () => {
    if (!window.confirm('Mark as filled? No new interest will be accepted.')) return;
    setActionLoading(true);
    try {
      await api.fillTask(id);
      await loadTask();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  };

  const handleReopen = async () => {
    setActionLoading(true);
    try {
      await api.reopenTask(id);
      await loadTask();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  };

  const handleCompleteWith = async (assignedTaskerId) => {
    setActionLoading(true);
    try {
      await api.completeTask(id, assignedTaskerId);
      setShowCompleteModal(false);
      await loadTask();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Cancel this task?')) return;
    try {
      await api.deleteTask(id);
      navigate('/my-tasks');
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
      alert('Report submitted.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm("Block this user?")) return;
    try {
      await api.blockUser(task.posterId);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!task) return (
    <div className="page-content">
      <div className="error-banner">{error || 'Task not found'}</div>
    </div>
  );

  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Other'];
  const isOwner = user && task.posterId === user.id;
  const inactive = isTaskInactive(task);
  const expired = isTaskExpired(task);
  const inactiveLabel = taskInactiveLabel(task);
  const acceptingInterest = task.status === 'open' && !expired;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">
          <ArrowLeft size={18} />
        </button>
        <h1>Task Details</h1>
        {user && !isOwner && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setShowReport(true)} className="icon-btn">
              <Flag size={18} />
            </button>
            <button onClick={handleBlock} className="icon-btn">
              <Ban size={18} />
            </button>
          </div>
        )}
        {isOwner && task.status === 'open' && (
          <button onClick={handleDelete} className="icon-btn" style={{ color: 'var(--danger)' }}>
            <Trash2 size={18} />
          </button>
        )}
        {!user && !isOwner && <div style={{ width: 24 }} />}
      </div>

      <div className="page-content desktop-narrow" style={{ opacity: inactive ? 0.7 : 1 }}>
        {error && <div className="error-banner">{error}</div>}

        {/* Category & Status */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="category-badge" style={{ background: colors.bg, color: colors.text }}>
            {task.category}
          </span>
          {inactiveLabel && (
            <span className={`status-badge ${inactiveLabel.toLowerCase()}`}>
              {inactiveLabel}
            </span>
          )}
          {typeof task.interestedCount === 'number' && task.interestedCount > 0 && (
            <span className="status-badge open" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} /> {task.interestedCount} interested
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ 
          fontSize: 22, 
          fontWeight: 700, 
          lineHeight: 1.35, 
          marginBottom: 16, 
          textDecoration: inactive ? 'line-through' : 'none', 
          color: inactive ? 'var(--text-tertiary)' : 'var(--text-primary)',
        }}>
          {task.title}
        </h1>

        {/* Poster info */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, cursor: 'pointer' }} 
          onClick={() => navigate(`/user/${task.posterId}`)}
        >
          <div className="avatar">
            {task.posterPhoto ? <img src={task.posterPhoto} alt="" /> : getInitials(task.posterName)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{task.posterName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              {task.posterRating && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--warning)' }}>
                  <Star size={12} fill="currentColor" /> {task.posterRating}
                </span>
              )}
              <span>{task.posterReviewCount} review{task.posterReviewCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
            {timeAgo(task.createdAt)}
          </div>
        </div>

        {/* Pay */}
        <div style={{ 
          background: 'var(--accent-light)', 
          borderRadius: 'var(--radius-lg)', 
          padding: 18, 
          marginBottom: 16, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 14,
        }}>
          <DollarSign size={24} color="var(--accent)" />
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              ${task.offeredPay}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Offered pay</div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 12, marginBottom: 4 }}>
              <MapPin size={14} /> Location
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{task.location}</div>
          </div>
          <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 12, marginBottom: 4 }}>
              <Calendar size={14} /> When
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              {task.dateType === 'asap' ? 'ASAP' : formatDate(task.dateTime)}
            </div>
          </div>
          <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 12, marginBottom: 4 }}>
              <Clock size={14} /> Duration
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              {task.estimatedDuration || 'Not specified'}
            </div>
          </div>
          <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 12, marginBottom: 4 }}>
              <Users size={14} /> Helpers
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{task.helpersNeeded} needed</div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Description</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {task.description}
          </p>
        </div>

        {/* Photos */}
        {task.photos && task.photos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Photos</h3>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {task.photos.map((photo, i) => (
                <img key={i} src={photo} alt="" style={{ height: 120, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
              ))}
            </div>
          </div>
        )}

        {/* Assigned tasker */}
        {task.status === 'completed' && task.assignedTasker && (
          <div style={{ 
            marginBottom: 20, 
            padding: 14, 
            background: 'var(--success-light)', 
            borderRadius: 'var(--radius-lg)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
          }}>
            <CheckCircle size={20} color="#047857" />
            <div>
              <div style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>Completed by</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{task.assignedTasker.displayName}</div>
            </div>
          </div>
        )}

        {/* Interested users list (poster view) */}
        {isOwner && task.interestedUsers && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              Interested ({task.interestedUsers.length})
            </h3>
            {task.interestedUsers.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No one has expressed interest yet.</p>
            ) : (
              task.interestedUsers.map((int) => (
                <div key={int.interestId} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div 
                        className="avatar avatar-sm" 
                        onClick={() => navigate(`/user/${int.user.id}`)} 
                        style={{ cursor: 'pointer' }}
                      >
                        {int.user.profilePhoto ? <img src={int.user.profilePhoto} alt="" /> : getInitials(int.user.displayName)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{int.user.displayName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {int.user.avgRating && (
                            <span style={{ color: 'var(--warning)' }}>★ {int.user.avgRating} · </span>
                          )}
                          {int.user.tasksCompleted} tasks done
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(int.createdAt)}</span>
                    </div>
                    <button className="btn btn-outline btn-sm btn-full" onClick={() => navigate(`/chat/${task.id}/${int.user.id}`)}>
                      <MessageCircle size={14} /> Message
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ paddingBottom: 20 }}>
          {/* Not logged in or not interested yet */}
          {!isOwner && acceptingInterest && (!user || !task.viewerIsInterested) && (
            <button className="btn btn-primary btn-full" onClick={handleMessagePoster} disabled={actionLoading} style={{ padding: '14px 18px' }}>
              <MessageCircle size={18} /> {user ? 'Message poster' : 'Sign in to message'}
            </button>
          )}

          {/* Already interested */}
          {user && !isOwner && task.viewerIsInterested && (
            <div>
              <div style={{ 
                textAlign: 'center', 
                padding: 14, 
                background: 'var(--accent-light)', 
                borderRadius: 'var(--radius-lg)', 
                marginBottom: 10,
              }}>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>✓ You're interested</span>
              </div>
              <button className="btn btn-primary btn-full" onClick={() => navigate(`/chat/${task.id}/${task.posterId}`)} style={{ marginBottom: 8 }}>
                <MessageCircle size={18} /> Continue chat
              </button>
              {task.status !== 'completed' && (
                <button className="btn btn-secondary btn-full btn-sm" onClick={handleWithdraw}>
                  Withdraw interest
                </button>
              )}
            </div>
          )}

          {/* Expired task */}
          {!isOwner && expired && (!user || !task.viewerIsInterested) && (
            <div style={{ 
              textAlign: 'center', 
              padding: 16, 
              background: 'var(--surface-hover)', 
              color: 'var(--text-tertiary)', 
              borderRadius: 'var(--radius-lg)', 
              fontWeight: 600,
            }}>
              This task has expired
            </div>
          )}

          {/* Poster actions */}
          {isOwner && task.status === 'open' && (
            <>
              <button className="btn btn-primary btn-full" onClick={() => setShowCompleteModal(true)} disabled={actionLoading} style={{ marginBottom: 10 }}>
                <CheckCircle size={18} /> Mark as Completed
              </button>
              <button className="btn btn-secondary btn-full" onClick={handleFill} disabled={actionLoading}>
                <Lock size={18} /> Mark as Filled
              </button>
            </>
          )}

          {isOwner && task.status === 'filled' && (
            <>
              <button className="btn btn-primary btn-full" onClick={() => setShowCompleteModal(true)} disabled={actionLoading} style={{ marginBottom: 10 }}>
                <CheckCircle size={18} /> Mark as Completed
              </button>
              <button className="btn btn-secondary btn-full" onClick={handleReopen} disabled={actionLoading}>
                <Unlock size={18} /> Reopen
              </button>
            </>
          )}

          {/* Review prompts */}
          {task.status === 'completed' && user && !isOwner && task.assignedTaskerId === user.id && (
            <button className="btn btn-primary btn-full" onClick={() => navigate(`/review/${task.id}/${task.posterId}`)}>
              <Star size={18} /> Rate This Experience
            </button>
          )}

          {task.status === 'completed' && isOwner && task.assignedTasker && (
            <button className="btn btn-outline btn-full" onClick={() => navigate(`/review/${task.id}/${task.assignedTasker.id}`)}>
              <Star size={16} /> Rate {task.assignedTasker.displayName}
            </button>
          )}
        </div>
      </div>

      {/* Complete modal */}
      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2>Who completed this?</h2>
              <button onClick={() => setShowCompleteModal(false)} className="modal-close"><X size={20} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Select who did the task so they get credit, or tap "Skip" if unsure.
            </p>
            <div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 14 }}>
              {(task.interestedUsers || []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: 12, textAlign: 'center' }}>
                  No one expressed interest.
                </p>
              ) : (
                (task.interestedUsers || []).map((int) => (
                  <button 
                    key={int.interestId} 
                    onClick={() => handleCompleteWith(int.user.id)} 
                    disabled={actionLoading} 
                    style={{ 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10, 
                      padding: 12, 
                      marginBottom: 8, 
                      background: 'var(--surface-hover)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-md)', 
                      cursor: 'pointer', 
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div className="avatar avatar-sm">
                      {int.user.profilePhoto ? <img src={int.user.profilePhoto} alt="" /> : getInitials(int.user.displayName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{int.user.displayName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {int.user.avgRating && <span style={{ color: 'var(--warning)' }}>★ {int.user.avgRating} · </span>}
                        {int.user.tasksCompleted} tasks
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button className="btn btn-secondary btn-full" onClick={() => handleCompleteWith(null)} disabled={actionLoading}>
              <HelpCircle size={16} /> Skip / Don't remember
            </button>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report User</h2>
              <button onClick={() => setShowReport(false)} className="modal-close"><X size={20} /></button>
            </div>
            <div className="input-group">
              <label>Reason</label>
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                <option value="">Select a reason</option>
                <option value="spam">Spam or fake</option>
                <option value="inappropriate">Inappropriate</option>
                <option value="scam">Scam</option>
                <option value="harassment">Harassment</option>
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
