import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { formatDate, getInitials, CATEGORY_COLORS } from '../utils/helpers';

export default function MyTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('posted');
  const [postedTasks, setPostedTasks] = useState([]);
  const [acceptedTasks, setAcceptedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);  // eslint-disable-line

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getMyTasks();
      setPostedTasks(data.posted);
      setAcceptedTasks(data.accepted);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      open: { bg: '#ffedd5', color: '#ea580c', label: 'Open' },
      in_progress: { bg: '#dbeafe', color: '#2563eb', label: 'In Progress' },
      completed: { bg: '#f3f4f6', color: '#6b7280', label: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
    };
    const s = styles[status] || styles.open;
    return (
      <span className="category-badge" style={{ background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const TaskItem = ({ task, showPoster }) => {
    const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Other'];
    return (
      <div
        className="card"
        style={{ marginBottom: 10, cursor: 'pointer' }}
        onClick={() => navigate(`/task/${task.id}`)}
      >
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="category-badge" style={{ background: colors.bg, color: colors.text, fontSize: 10 }}>
              {task.category}
            </span>
            <StatusBadge status={task.status} />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{task.title}</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>${task.offeredPay}</span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
              {task.dateType === 'asap' ? 'ASAP' : formatDate(task.dateTime)}
            </span>
          </div>
          {showPoster && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: 'var(--gray-500)' }}>
              <div className="avatar avatar-sm">
                {task.posterPhoto ? <img src={task.posterPhoto} alt="" /> : getInitials(task.posterName)}
              </div>
              {task.posterName}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Tasks</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'posted' ? 'active' : ''}`} onClick={() => setTab('posted')}>
          Posted ({postedTasks.length})
        </button>
        <button className={`tab ${tab === 'accepted' ? 'active' : ''}`} onClick={() => setTab('accepted')}>
          Accepted ({acceptedTasks.length})
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : tab === 'posted' ? (
          postedTasks.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48 }}>📋</div>
              <h3>No tasks posted yet</h3>
              <p>Post a task to get help from students on your campus.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/post')}>
                Post a Task
              </button>
            </div>
          ) : (
            <>
              {postedTasks.filter(t => ['open', 'in_progress'].includes(t.status)).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Active</h3>
                  {postedTasks.filter(t => ['open', 'in_progress'].includes(t.status)).map(t => (
                    <TaskItem key={t.id} task={t} />
                  ))}
                </div>
              )}
              {postedTasks.filter(t => t.status === 'completed').length > 0 && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Completed</h3>
                  {postedTasks.filter(t => t.status === 'completed').map(t => (
                    <TaskItem key={t.id} task={t} />
                  ))}
                </div>
              )}
            </>
          )
        ) : (
          acceptedTasks.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48 }}>🏃</div>
              <h3>No tasks accepted yet</h3>
              <p>Browse the feed and tap "I'll Do It" to start earning.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
                Browse Tasks
              </button>
            </div>
          ) : (
            <>
              {acceptedTasks.filter(t => t.status !== 'completed').length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Upcoming</h3>
                  {acceptedTasks.filter(t => t.status !== 'completed').map(t => (
                    <TaskItem key={t.id} task={t} showPoster />
                  ))}
                </div>
              )}
              {acceptedTasks.filter(t => t.status === 'completed').length > 0 && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Completed</h3>
                  {acceptedTasks.filter(t => t.status === 'completed').map(t => (
                    <TaskItem key={t.id} task={t} showPoster />
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
