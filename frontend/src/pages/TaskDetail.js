import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Calendar, DollarSign, Users, Star,
  MessageCircle, Flag, Ban, Trash2, CheckCircle, Lock, Unlock, HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import {
  formatDate, getInitials, CATEGORY_COLORS, timeAgo,
  isTaskExpired, isTaskInactive, taskInactiveLabel,
} from '../utils/helpers';

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

  const handleMessagePoster = async () => {
    // Creates interest automatically on first send, but also pre-express
    // so the interest shows in the count immediately if they navigate away.
    try {
      await api.expressInterest(id);
    } catch (err) {
      // ignore — will be auto-created on message send
    }
    navigate(`/chat/${task.id}/${task.posterId}`);
  };

  const handleWithdraw = async () => {
    if (!window.confirm("Withdraw your interest? You won't be listed anymore.")) return;
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
    if (!window.confirm('Mark this task as filled? No new interest will be accepted.')) return;
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
    if (!window.confirm('Cancel this task? This action cannot be undone.')) return;
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
      alert('Report submitted. Our team will review it.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm("Block this user? You won't see their tasks anymore.")) return;
    try {
      await api.blockUser(task.posterId);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!task)
    return (
      <div className="page-content">
        <div className="error-banner">{error || 'Task not found'}</div>
      </div>
    );

  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Other'];
  const isOwner = task.posterId === user.id;
  const inactive = isTaskInactive(task);
  const expired = isTaskExpired(task);
  const inactiveLabel = taskInactiveLabel(task);
  const acceptingInterest = task.status === 'open' && !expired;

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

      <div
        className="page-content desktop-narrow"
        style={{ opacity: inactive ? 0.75 : 1 }}
      >
        {error && <div className="error-banner">{error}</div>}

        {/* Category & Status */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="category-badge" style={{ background: colors.bg, color: colors.text }}>
            {task.category}
          </span>
          {inactiveLabel && (
            <span
              className="category-badge"
              style={{
                background: 'var(--gray-200, #e5e7eb)',
                color: 'var(--gray-600, #4b5563)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {inactiveLabel}
            </span>
          )}
          {typeof task.interestedCount === 'number' && task.interestedCount > 0 && (
            <span
              className="category-badge"
              style={{
                background: 'var(--primary-50)',
                color: 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Users size={12} /> {task.interestedCount} interested
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.3,
            marginBottom: 16,
            textDecoration: inactive ? 'line-through' : 'none',
            color: inactive ? 'var(--gray-500)' : 'inherit',
          }}
        >
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
            <div style={{ fontWeight: 600, fontSize: 15 }}>{task.posterName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--gray-500)' }}>
              {task.posterRating && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--warning)' }}>
                  <Star size={12} fill="currentColor" /> {task.posterRating}
                </span>
              )}
              <span>
                {task.posterReviewCount} review{task.posterReviewCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-400)' }}>
            {timeAgo(task.createdAt)}
          </div>
        </div>

        {/* Pay */}
        <div
          style={{
            background: 'var(--primary-50)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <DollarSign size={24} color="var(--primary)" />
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
              ${task.offeredPay}
            </div>
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
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {task.dateType === 'asap' ? 'ASAP' : formatDate(task.dateTime)}
            </div>
          </div>
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 12, marginBottom: 4 }}>
              <Clock size={14} /> Duration
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {task.estimatedDuration || 'Not specified'}
            </div>
          </div>
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 12, marginBottom: 4 }}>
              <Users size={14} /> Interested
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {task.interestedCount || 0}{' '}
              {task.interestedCount === 1 ? 'person' : 'people'}
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
                <img
                  key={i}
                  src={photo}
                  alt=""
                  style={{ height: 120, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Assigned tasker (once completed) */}
        {task.status === 'completed' && task.assignedTasker && (
          <div
            style={{
              marginBottom: 20,
              padding: 12,
              background: '#fef3c7',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CheckCircle size={18} color="#d97706" />
            <div>
              <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                Completed by
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {task.assignedTasker.displayName}
              </div>
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
              <p style={{ fontSize: 14, color: 'var(--gray-400)' }}>
                No one has expressed interest yet.
              </p>
            ) : (
              task.interestedUsers.map((int) => (
                <div
                  key={int.interestId}
                  style={{
                    border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div
                      className="avatar avatar-sm"
                      onClick={() => navigate(`/user/${int.user.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {int.user.profilePhoto ? (
                        <img src={int.user.profilePhoto} alt="" />
                      ) : (
                        getInitials(int.user.displayName)
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{int.user.displayName}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {int.user.avgRating && (
                          <span style={{ color: 'var(--warning)' }}>★ {int.user.avgRating}</span>
                        )}{' '}
                        {int.user.tasksCompleted} tasks done
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      {timeAgo(int.createdAt)}
                    </span>
                  </div>
                  {int.user.bio && (
                    <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 8 }}>
                      {int.user.bio}
                    </p>
                  )}
                  <button
                    className="btn btn-outline btn-sm btn-full"
                    onClick={() => navigate(`/chat/${task.id}/${int.user.id}`)}
                  >
                    <MessageCircle size={14} /> Message
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ paddingBottom: 20 }}>
          {/* Tasker: not yet interested -> show Message button */}
          {!isOwner && acceptingInterest && !task.viewerIsInterested && (
            <button
              className="btn btn-primary btn-full"
              onClick={handleMessagePoster}
              disabled={actionLoading}
              style={{ fontSize: 16, padding: 16 }}
            >
              <MessageCircle size={18} /> Message poster
            </button>
          )}

          {/* Tasker: already interested */}
          {!isOwner && task.viewerIsInterested && (
            <div>
              <div
                style={{
                  textAlign: 'center',
                  padding: 16,
                  background: 'var(--primary-50)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  ✓ You're on the interested list
                </span>
              </div>
              <button
                className="btn btn-primary btn-full"
                onClick={() => navigate(`/chat/${task.id}/${task.posterId}`)}
                style={{ marginBottom: 8 }}
              >
                <MessageCircle size={18} /> Continue chat
              </button>
              {task.status !== 'completed' && (
                <button
                  className="btn btn-secondary btn-full btn-sm"
                  onClick={handleWithdraw}
                >
                  Withdraw interest
                </button>
              )}
            </div>
          )}

          {/* Tasker: task expired */}
          {!isOwner && expired && !task.viewerIsInterested && (
            <div
              style={{
                textAlign: 'center',
                padding: 16,
                background: 'var(--gray-100)',
                color: 'var(--gray-500)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
              }}
            >
              This task has expired
            </div>
          )}

          {/* Poster: open -> can mark filled or complete */}
          {isOwner && task.status === 'open' && (
            <>
              <button
                className="btn btn-primary btn-full"
                onClick={() => setShowCompleteModal(true)}
                disabled={actionLoading}
                style={{ marginBottom: 8 }}
              >
                <CheckCircle size={18} /> Mark as Completed
              </button>
              <button
                className="btn btn-secondary btn-full"
                onClick={handleFill}
                disabled={actionLoading}
              >
                <Lock size={18} /> Mark as Filled (stop new interest)
              </button>
            </>
          )}

          {/* Poster: filled -> can complete or reopen */}
          {isOwner && task.status === 'filled' && (
            <>
              <button
                className="btn btn-primary btn-full"
                onClick={() => setShowCompleteModal(true)}
                disabled={actionLoading}
                style={{ marginBottom: 8 }}
              >
                <CheckCircle size={18} /> Mark as Completed
              </button>
              <button
                className="btn btn-secondary btn-full"
                onClick={handleReopen}
                disabled={actionLoading}
              >
                <Unlock size={18} /> Reopen
              </button>
            </>
          )}

          {/* Completed: review prompt (tasker who did it) */}
          {task.status === 'completed' &&
            !isOwner &&
            task.assignedTaskerId === user.id && (
              <button
                className="btn btn-primary btn-full"
                onClick={() => navigate(`/review/${task.id}/${task.posterId}`)}
              >
                <Star size={18} /> Rate This Experience
              </button>
            )}

          {/* Completed: poster can rate the assigned tasker */}
          {task.status === 'completed' && isOwner && task.assignedTasker && (
            <button
              className="btn btn-outline btn-full"
              onClick={() =>
                navigate(`/review/${task.id}/${task.assignedTasker.id}`)
              }
            >
              <Star size={16} /> Rate {task.assignedTasker.displayName}
            </button>
          )}
        </div>
      </div>

      {/* Complete task modal — pick who did it */}
      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2>Who did this task?</h2>
              <button onClick={() => setShowCompleteModal(false)} style={{ background: 'none' }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
              Pick the person who did it so we can credit them. Or tap "I don't remember"
              to just mark it done.
            </p>
            <div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 12 }}>
              {(task.interestedUsers || []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-400)', padding: 12, textAlign: 'center' }}>
                  No one expressed interest. Use "I don't remember" below.
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
                      padding: 10,
                      marginBottom: 6,
                      background: 'var(--gray-50)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div className="avatar avatar-sm">
                      {int.user.profilePhoto ? (
                        <img src={int.user.profilePhoto} alt="" />
                      ) : (
                        getInitials(int.user.displayName)
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {int.user.displayName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {int.user.avgRating && (
                          <span style={{ color: 'var(--warning)' }}>★ {int.user.avgRating}</span>
                        )}{' '}
                        {int.user.tasksCompleted} tasks done
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button
              className="btn btn-secondary btn-full"
              onClick={() => handleCompleteWith(null)}
              disabled={actionLoading}
            >
              <HelpCircle size={16} /> I don't remember who did it
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
              <button onClick={() => setShowReport(false)} style={{ background: 'none' }}>
                ✕
              </button>
            </div>
            <div className="input-group">
              <label>Reason</label>
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                <option value="">Select a reason</option>
                <option value="spam">Spam or fake task</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="scam">Scam or fraud</option>
                <option value="harassment">Harassment</option>
                <option value="safety">Safety concern</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button className="btn btn-danger btn-full" onClick={handleReport}>
              Submit Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
