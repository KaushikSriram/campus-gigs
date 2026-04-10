import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { getInitials, timeAgo } from '../utils/helpers';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      const data = await api.getThreads();
      setThreads(data.threads);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Messages</h1>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : threads.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>💬</div>
          <h3>No messages yet</h3>
          <p>Chat threads appear here after you're matched with someone on a task.</p>
        </div>
      ) : (
        <div>
          {threads.map((thread, i) => (
            <div
              key={`${thread.taskId}-${thread.otherUser?.id}`}
              onClick={() => navigate(`/chat/${thread.taskId}/${thread.otherUser?.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                borderBottom: '1px solid var(--gray-100)', cursor: 'pointer',
                background: thread.unreadCount > 0 ? 'var(--primary-50)' : 'white',
              }}
            >
              <div className="avatar">
                {thread.otherUser?.profilePhoto ? (
                  <img src={thread.otherUser.profilePhoto} alt="" />
                ) : (
                  getInitials(thread.otherUser?.displayName)
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontWeight: thread.unreadCount > 0 ? 700 : 500, fontSize: 15 }}>
                    {thread.otherUser?.displayName}
                  </span>
                  {thread.lastMessage && (
                    <span style={{ fontSize: 12, color: 'var(--gray-400)', flexShrink: 0 }}>
                      {timeAgo(thread.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 2, fontWeight: 500 }}>
                  {thread.taskTitle}
                </div>
                {thread.lastMessage && (
                  <p style={{
                    fontSize: 13, color: thread.unreadCount > 0 ? 'var(--gray-700)' : 'var(--gray-400)',
                    fontWeight: thread.unreadCount > 0 ? 600 : 400,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {thread.lastMessage.senderId === user.id ? 'You: ' : ''}
                    {thread.lastMessage.content}
                  </p>
                )}
              </div>
              {thread.unreadCount > 0 && (
                <span className="notif-badge">{thread.unreadCount}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
