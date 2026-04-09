import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const categoryLabels = {
  moving: 'Moving', tutoring: 'Tutoring', errands: 'Errands',
  tech_help: 'Tech Help', cleaning: 'Cleaning', delivery: 'Delivery', other: 'Other',
};

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  const fetchTask = async () => {
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!task) return;
    const otherUserId = user.id === task.poster_id ? task.accepted_by : task.poster_id;
    if (!otherUserId) return;
    try {
      const res = await api.get(`/messages/task/${id}/user/${otherUserId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  useEffect(() => { fetchTask(); }, [id]);

  useEffect(() => {
    if (task && task.accepted_by && (user.id === task.poster_id || user.id === task.accepted_by)) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [task?.id, task?.accepted_by]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAccept = async () => {
    try {
      const res = await api.post(`/tasks/${id}/accept`);
      setTask(prev => ({ ...prev, ...res.data, poster_name: prev.poster_name, poster_email: prev.poster_email }));
      fetchTask();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept task');
    }
  };

  const handleUnaccept = async () => {
    if (!confirm('Release this task? It will go back to open status.')) return;
    try {
      await api.post(`/tasks/${id}/unaccept`);
      fetchTask();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to release task');
    }
  };

  const handleComplete = async () => {
    try {
      await api.post(`/tasks/${id}/complete`);
      fetchTask();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete task');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this task?')) return;
    try {
      await api.post(`/tasks/${id}/cancel`);
      fetchTask();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel task');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const receiverId = user.id === task.poster_id ? task.accepted_by : task.poster_id;
    try {
      await api.post('/messages', { task_id: task.id, receiver_id: receiverId, content: newMessage });
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (reviewForm.rating === 0) { setError('Please select a rating'); return; }
    try {
      await api.post(`/tasks/${id}/review`, reviewForm);
      setReviewForm({ rating: 0, comment: '' });
      fetchTask();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!task) return null;

  const isPoster = user.id === task.poster_id;
  const isAcceptor = user.id === task.accepted_by;
  const isParticipant = isPoster || isAcceptor;
  const hasReviewed = task.reviews?.some(r => r.reviewer_id === user.id);

  return (
    <div className="task-detail">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="task-detail-header">
        <div>
          <h1>{task.title}</h1>
          <div className="task-detail-meta">
            <span className="badge badge-category">{categoryLabels[task.category]}</span>
            <span className={`badge badge-${task.status}`}>{task.status}</span>
          </div>
        </div>
        <div className="task-detail-fee">${Number(task.fee).toFixed(2)}</div>
      </div>

      <div className="task-info-grid">
        <div className="task-info-item">
          <div className="task-info-label">Posted by</div>
          <div className="task-info-value">
            <Link to={`/profile/${task.poster_id}`}>{task.poster_name}</Link>
          </div>
        </div>
        {task.location && (
          <div className="task-info-item">
            <div className="task-info-label">Location</div>
            <div className="task-info-value">{task.location}</div>
          </div>
        )}
        <div className="task-info-item">
          <div className="task-info-label">Posted</div>
          <div className="task-info-value">{new Date(task.created_at + 'Z').toLocaleDateString()}</div>
        </div>
        {task.due_date && (
          <div className="task-info-item">
            <div className="task-info-label">Due by</div>
            <div className="task-info-value">{new Date(task.due_date).toLocaleDateString()}</div>
          </div>
        )}
        {task.accepted_by && (
          <div className="task-info-item">
            <div className="task-info-label">Accepted by</div>
            <div className="task-info-value">
              <Link to={`/profile/${task.accepted_by}`}>{task.acceptor_name}</Link>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="task-detail-body">{task.description}</div>
      </div>

      <div className="task-actions">
        {task.status === 'open' && !isPoster && (
          <button className="btn btn-success" onClick={handleAccept}>I'll do this</button>
        )}
        {task.status === 'accepted' && isPoster && (
          <button className="btn btn-success" onClick={handleComplete}>Mark as done</button>
        )}
        {task.status === 'accepted' && isParticipant && (
          <button className="btn btn-secondary" onClick={handleUnaccept}>Release task</button>
        )}
        {isPoster && task.status !== 'completed' && task.status !== 'cancelled' && (
          <button className="btn btn-danger" onClick={handleCancel}>Cancel</button>
        )}
      </div>

      {/* Messaging section */}
      {isParticipant && task.accepted_by && (
        <div style={{ marginBottom: '28px' }}>
          <h3 className="section-title">Messages</h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="chat-messages" style={{ maxHeight: '360px' }}>
              {messages.length === 0 ? (
                <div className="chat-empty" style={{ padding: '36px' }}>No messages yet. Say hi!</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`message-bubble ${msg.sender_id === user.id ? 'message-sent' : 'message-received'}`}>
                    <div>{msg.content}</div>
                    <div className="message-time">
                      {msg.sender_name} &middot; {new Date(msg.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            {task.status !== 'cancelled' && (
              <form className="chat-input" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">Send</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Review section */}
      {task.status === 'completed' && isParticipant && !hasReviewed && (
        <div style={{ marginBottom: '28px' }}>
          <h3 className="section-title">Leave a review</h3>
          <form onSubmit={handleReview} className="card">
            <div className="form-group">
              <label>Rating</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={star <= reviewForm.rating ? 'filled' : ''}
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  >
                    &#9733;
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Comment (optional)</label>
              <textarea
                className="form-control"
                value={reviewForm.comment}
                onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                placeholder="How was your experience?"
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary">Submit review</button>
          </form>
        </div>
      )}

      {/* Existing reviews */}
      {task.reviews?.length > 0 && (
        <div>
          <h3 className="section-title">Reviews</h3>
          <div className="reviews-list">
            {task.reviews.map(review => (
              <div key={review.id} className="card review-card">
                <div className="review-content">
                  <div className="review-header">
                    <strong>{review.reviewer_name}</strong>
                    <span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  {review.comment && <p className="review-text">{review.comment}</p>}
                  <div className="review-meta">{new Date(review.created_at + 'Z').toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
