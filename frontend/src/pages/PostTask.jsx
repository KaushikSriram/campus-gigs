import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const CATEGORIES = [
  { value: 'moving', label: 'Moving / Heavy Lifting' },
  { value: 'tutoring', label: 'Tutoring / Academic Help' },
  { value: 'errands', label: 'Errands / Pickup' },
  { value: 'tech_help', label: 'Tech Help' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Other' },
];

export default function PostTask() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'errands',
    fee: '',
    location: '',
    due_date: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title || !form.description || !form.fee) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, fee: Number(form.fee) };
      if (!payload.due_date) delete payload.due_date;
      const res = await api.post('/tasks', payload);
      navigate(`/task/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-task">
      <h1>Post a task</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>What do you need done? *</label>
          <input
            type="text"
            name="title"
            className="form-control"
            placeholder="e.g., Help me move furniture to my new dorm"
            value={form.title}
            onChange={handleChange}
            required
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label>Details *</label>
          <textarea
            name="description"
            className="form-control"
            placeholder="What needs to be done? When? Any requirements?"
            value={form.description}
            onChange={handleChange}
            required
            rows={4}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Category *</label>
            <select
              name="category"
              className="form-control"
              value={form.category}
              onChange={handleChange}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Pay ($) *</label>
            <input
              type="number"
              name="fee"
              className="form-control"
              placeholder="25"
              value={form.fee}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              className="form-control"
              placeholder="e.g., West Campus Dorm B"
              value={form.location}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Due by</label>
            <input
              type="date"
              name="due_date"
              className="form-control"
              value={form.due_date}
              onChange={handleChange}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Posting...' : 'Post task'}
        </button>
      </form>
    </div>
  );
}
