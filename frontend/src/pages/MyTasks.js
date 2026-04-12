import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import {
  formatDate, getInitials, CATEGORY_COLORS,
  isTaskInactive, isTaskExpired, taskInactiveLabel,
} from '../utils/helpers';

export default function MyTasks() {
  const { user } = useAuth(); // eslint-disable-line
  const navigate = useNavigate();
  const [tab, setTab] = useState('posted');
  const [postedTasks, setPostedTasks] = useState([]);
  const [interestedTasks, setInterestedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []); // eslint-disable-line

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getMyTasks();
      setPostedTasks(data.posted || []);
      // Server uses `interested` now; fall back to old `accepted` for safety.
      setInterestedTasks(data.interested || data.accepted || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const StatusBadge = ({ task }) => {
    const label = taskInactiveLabel(task);
    if (!label) {
      return (
        <span className="category-badge" style={{ background: '#ffedd5', color: '#ea580c' }}>
          Open
        </span>
      );
    }
    return (
      <span
        className="category-badge"
        style={{
          background: 'var(--gray-200, #e5e7eb)',
          color: 'var(--gray-600, #4b5563)',
        }}
      >
        {label}
      </span>
    );
  };

  const TaskItem = ({ task, showPoster }) => {
    const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Other'];
    const inactive = isTaskInactive(task);
    return (
      <div
        className="card"
        style={{
          marginBottom: 10,
          cursor: 'pointer',
          opacity: inactive ? 0.55 : 1,
          transition: 'opacity 160ms ease',
        }}
        onClick={() => navigate(`/task/${task.id}`)}
      >
        <div style={{ padding: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span
              className="category-badge"
              style={{ background: colors.bg, color: colors.text, fontSize: 10 }}
            >
              {task.category}
            </span>
            <StatusBadge task={task} />
          </div>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 6,
              textDecoration: inactive ? 'line-through' : 'none',
              color: inactive ? 'var(--gray-500)' : 'inherit',
            }}
          >
            {task.title}
          </h3>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: inactive ? 'var(--gray-500)' : 'var(--primary)',
              }}
            >
              ${task.offeredPay}
            </span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
              {task.dateType === 'asap' ? 'ASAP' : formatDate(task.dateTime)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
              fontSize: 12,
              color: 'var(--gray-500)',
              flexWrap: 'wrap',
            }}
          >
            {typeof task.interestedCount === 'number' && task.interestedCount > 0 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
              >
                <Users size={12} /> {task.interestedCount} interested
              </span>
            )}
            {showPoster && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="avatar avatar-sm">
                  {task.posterPhoto ? (
                    <img src={task.posterPhoto} alt="" />
                  ) : (
                    getInitials(task.posterName)
                  )}
                </div>
                {task.posterName}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const bucket = (tasks) => {
    const active = [];
    const done = [];
    for (const t of tasks) {
      if (t.status === 'completed' || t.status === 'cancelled' || isTaskExpired(t)) {
        done.push(t);
      } else {
        active.push(t);
      }
    }
    return { active, done };
  };

  const postedBuckets = bucket(postedTasks);
  const interestedBuckets = bucket(interestedTasks);

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Tasks</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${tab === 'posted' ? 'active' : ''}`}
          onClick={() => setTab('posted')}
        >
          Posted ({postedTasks.length})
        </button>
        <button
          className={`tab ${tab === 'interested' ? 'active' : ''}`}
          onClick={() => setTab('interested')}
        >
          Interested ({interestedTasks.length})
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div className="loader">
            <div className="spinner" />
          </div>
        ) : tab === 'posted' ? (
          postedTasks.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48 }}>📋</div>
              <h3>No tasks posted yet</h3>
              <p>Post a task to get help from students on your campus.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/post')}
              >
                Post a Task
              </button>
            </div>
          ) : (
            <>
              {postedBuckets.active.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--gray-400)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Active
                  </h3>
                  {postedBuckets.active.map((t) => (
                    <TaskItem key={t.id} task={t} />
                  ))}
                </div>
              )}
              {postedBuckets.done.length > 0 && (
                <div>
                  <h3
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--gray-400)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Past
                  </h3>
                  {postedBuckets.done.map((t) => (
                    <TaskItem key={t.id} task={t} />
                  ))}
                </div>
              )}
            </>
          )
        ) : interestedTasks.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>🏃</div>
            <h3>You haven't shown interest yet</h3>
            <p>Browse the feed and message a poster to get started.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/')}
            >
              Browse Tasks
            </button>
          </div>
        ) : (
          <>
            {interestedBuckets.active.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--gray-400)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Upcoming
                </h3>
                {interestedBuckets.active.map((t) => (
                  <TaskItem key={t.id} task={t} showPoster />
                ))}
              </div>
            )}
            {interestedBuckets.done.length > 0 && (
              <div>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--gray-400)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Past
                </h3>
                {interestedBuckets.done.map((t) => (
                  <TaskItem key={t.id} task={t} showPoster />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
