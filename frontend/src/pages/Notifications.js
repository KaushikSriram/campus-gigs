import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCheck, Bell, UserPlus, CheckCircle, MessageCircle, XCircle } from 'lucide-react';
import { api } from '../utils/api';
import { timeAgo } from '../utils/helpers';

const ICON_MAP = {
  new_applicant: { icon: UserPlus, color: 'var(--primary)' },
  application_accepted: { icon: CheckCircle, color: '#ea580c' },
  application_declined: { icon: XCircle, color: 'var(--danger)' },
  task_completed: { icon: CheckCircle, color: '#ea580c' },
  task_cancelled: { icon: XCircle, color: 'var(--danger)' },
  tasker_cancelled: { icon: XCircle, color: 'var(--warning)' },
  new_message: { icon: MessageCircle, color: 'var(--secondary)' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.markNotificationRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      } catch {
        // ignore
      }
    }

    // Navigate based on type
    if (notif.data.taskId) {
      if (notif.type === 'new_message' && notif.data.senderId) {
        navigate(`/chat/${notif.data.taskId}/${notif.data.senderId}`);
      } else {
        navigate(`/task/${notif.data.taskId}`);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none' }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontWeight: 600 }}>Notifications</span>
        <button onClick={handleMarkAllRead} style={{ background: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
          <CheckCheck size={18} />
        </button>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>🔔</div>
          <h3>No notifications yet</h3>
          <p>You'll get notified about task applications, messages, and more.</p>
        </div>
      ) : (
        <div>
          {notifications.map(notif => {
            const iconConfig = ICON_MAP[notif.type] || { icon: Bell, color: 'var(--gray-500)' };
            const Icon = iconConfig.icon;
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                style={{
                  display: 'flex', gap: 12, padding: '14px 20px',
                  borderBottom: '1px solid var(--gray-100)',
                  background: notif.isRead ? 'white' : 'var(--primary-50)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: `${iconConfig.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color={iconConfig.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: notif.isRead ? 500 : 700, fontSize: 14, marginBottom: 2 }}>
                    {notif.title}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.4 }}>
                    {notif.body}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{timeAgo(notif.createdAt)}</span>
                </div>
                {!notif.isRead && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
