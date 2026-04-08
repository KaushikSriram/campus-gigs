import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (convo) => {
    setActiveConvo(convo);
    try {
      const res = await api.get(`/messages/task/${convo.task_id}/user/${convo.other_user_id}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  useEffect(() => {
    if (!activeConvo) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/messages/task/${activeConvo.task_id}/user/${activeConvo.other_user_id}`);
        setMessages(res.data);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConvo]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo) return;
    try {
      await api.post('/messages', {
        task_id: activeConvo.task_id,
        receiver_id: activeConvo.other_user_id,
        content: newMessage,
      });
      setNewMessage('');
      const res = await api.get(`/messages/task/${activeConvo.task_id}/user/${activeConvo.other_user_id}`);
      setMessages(res.data);
      fetchConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.6rem' }}>Messages</h1>
      {conversations.length === 0 ? (
        <div className="empty-state">
          <h3>No messages yet</h3>
          <p>When you accept a task or someone accepts yours, you can message them here.</p>
        </div>
      ) : (
        <div className="messages-layout">
          <div className="conversations-list">
            {conversations.map((convo, i) => (
              <div
                key={`${convo.task_id}-${convo.other_user_id}`}
                className={`conversation-item ${activeConvo?.task_id === convo.task_id && activeConvo?.other_user_id === convo.other_user_id ? 'active' : ''}`}
                onClick={() => selectConversation(convo)}
              >
                <h4>
                  {convo.other_user_name}
                  {convo.unread_count > 0 && <span className="conversation-unread">{convo.unread_count}</span>}
                </h4>
                <div className="conversation-task-title">Re: {convo.task_title}</div>
                <div className="conversation-preview">{convo.last_message}</div>
              </div>
            ))}
          </div>

          <div className="chat-area">
            {activeConvo ? (
              <>
                <div className="chat-header">
                  {activeConvo.other_user_name} &mdash; {activeConvo.task_title}
                </div>
                <div className="chat-messages">
                  {messages.map(msg => (
                    <div key={msg.id} className={`message-bubble ${msg.sender_id === user.id ? 'message-sent' : 'message-received'}`}>
                      <div>{msg.content}</div>
                      <div className="message-time">
                        {new Date(msg.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form className="chat-input" onSubmit={handleSend}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">Send</button>
                </form>
              </>
            ) : (
              <div className="chat-empty">Select a conversation to start messaging</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
