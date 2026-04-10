import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { getInitials, timeAgo } from '../utils/helpers';

export default function Chat() {
  const { taskId, userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [task, setTask] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    loadData();
    // Poll for new messages every 3 seconds
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [taskId, userId]); // eslint-disable-line

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      const [userData, taskData] = await Promise.all([
        api.getUser(userId),
        api.getTask(taskId),
      ]);
      setOtherUser(userData.user);
      setTask(taskData.task);
      await loadMessages();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    try {
      const data = await api.getMessages(taskId, userId);
      setMessages(data.messages);
    } catch {
      // ignore
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || sending) return;

    setSending(true);
    try {
      await api.sendMessage(taskId, userId, newMsg.trim());
      setNewMsg('');
      await loadMessages();
    } catch (err) {
      console.error(err);
    }
    setSending(false);
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="chat-page">
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: 'white', borderBottom: '1px solid var(--gray-100)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/messages')} style={{ background: 'none' }}>
          <ArrowLeft size={22} />
        </button>
        <div className="avatar avatar-sm" onClick={() => navigate(`/user/${userId}`)} style={{ cursor: 'pointer' }}>
          {otherUser?.profilePhoto ? <img src={otherUser.profilePhoto} alt="" /> : getInitials(otherUser?.displayName)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{otherUser?.displayName}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
            {task?.title}
          </div>
        </div>
      </div>

      {/* Task card pinned */}
      {task && (
        <div
          onClick={() => navigate(`/task/${taskId}`)}
          style={{
            margin: '8px 12px', padding: '10px 14px', background: 'white', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--gray-200)', cursor: 'pointer', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>{task.title}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>${task.offeredPay}</div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '24px 0', fontSize: 14 }}>
            Start a conversation to coordinate the task details.
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.senderId === user.id;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMine ? 'var(--primary)' : 'white',
                color: isMine ? 'white' : 'var(--gray-800)',
                boxShadow: isMine ? 'none' : 'var(--shadow-sm)',
                border: isMine ? 'none' : '1px solid var(--gray-100)',
              }}>
                <p style={{ fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.content}</p>
                <span style={{
                  fontSize: 10, display: 'block', textAlign: 'right', marginTop: 4,
                  color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--gray-400)',
                }}>
                  {timeAgo(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'white', borderTop: '1px solid var(--gray-100)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-full)',
            border: '2px solid var(--gray-200)', fontSize: 14, background: 'var(--gray-50)',
          }}
        />
        <button
          type="submit"
          disabled={!newMsg.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: newMsg.trim() ? 'var(--primary)' : 'var(--gray-200)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
