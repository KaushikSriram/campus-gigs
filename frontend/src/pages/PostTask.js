import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image } from 'lucide-react';
import { api } from '../utils/api';
import { CATEGORY_ICONS } from '../utils/helpers';

const CATEGORIES = [
  'Moving & Heavy Lifting',
  'Delivery & Pickup',
  'Academic Help',
  'Tech Help',
  'Errands',
  'Cleaning & Organization',
  'Assembly & Setup',
  'Event Help',
  'Creative & Design',
  'Other',
];

const PAY_SUGGESTIONS = {
  'Moving & Heavy Lifting': { min: 20, max: 60 },
  'Delivery & Pickup': { min: 8, max: 25 },
  'Academic Help': { min: 15, max: 50 },
  'Tech Help': { min: 15, max: 40 },
  'Errands': { min: 8, max: 25 },
  'Cleaning & Organization': { min: 20, max: 50 },
  'Assembly & Setup': { min: 20, max: 50 },
  'Event Help': { min: 10, max: 35 },
  'Creative & Design': { min: 20, max: 60 },
  'Other': { min: 10, max: 40 },
};

export default function PostTask() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [dateType, setDateType] = useState('specific');
  const [dateTime, setDateTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [offeredPay, setOfferedPay] = useState('');
  const [helpersNeeded, setHelpersNeeded] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: form, 2: preview

  const suggestion = PAY_SUGGESTIONS[category];

  const handleSubmit = async () => {
    setError('');
    if (!title.trim() || !category || !description.trim() || !location.trim() || !offeredPay) {
      setError('Please fill in all required fields');
      return;
    }
    if (dateType === 'specific' && !dateTime) {
      setError('Please select a date and time');
      return;
    }

    setLoading(true);
    try {
      const dt = dateType === 'asap' ? new Date().toISOString() : dateTime;
      const data = await api.createTask({
        title: title.trim(),
        category,
        description: description.trim(),
        location: location.trim(),
        dateTime: dt,
        dateType,
        estimatedDuration,
        offeredPay: parseFloat(offeredPay),
        helpersNeeded: parseInt(helpersNeeded),
      });
      navigate(`/task/${data.task.id}`);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (step === 2) {
    return (
      <div className="page">
        <div className="page-header">
          <button onClick={() => setStep(1)} style={{ background: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={20} /> Edit
          </button>
          <span style={{ fontWeight: 600 }}>Preview</span>
          <div style={{ width: 60 }} />
        </div>
        <div className="page-content desktop-narrow">
          {error && <div className="error-banner">{error}</div>}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: 16 }}>
              <span className="category-badge" style={{ background: '#f3f4f6', color: '#6b7280', marginBottom: 8, display: 'inline-block' }}>
                {category}
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>${offeredPay}</div>
              <div style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 8 }}>📍 {location}</div>
              <div style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 8 }}>
                🕒 {dateType === 'asap' ? 'ASAP' : dateTime ? new Date(dateTime).toLocaleString() : 'Not set'}
              </div>
              {estimatedDuration && <div style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 8 }}>⏱ {estimatedDuration}</div>}
              <div style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 12 }}>👥 {helpersNeeded} helper{helpersNeeded > 1 ? 's' : ''} needed</div>
              <p style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{description}</p>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading} style={{ fontSize: 16, padding: 16 }}>
            {loading ? 'Posting...' : 'Post Task'}
          </button>
          <button className="btn btn-secondary btn-full" onClick={() => setStep(1)} style={{ marginTop: 8 }}>
            Go Back & Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontWeight: 600 }}>Post a Task</span>
        <div style={{ width: 28 }} />
      </div>
      <div className="page-content desktop-narrow">
        {error && <div className="error-banner">{error}</div>}

        <div className="input-group">
          <label>Task Title *</label>
          <input
            type="text"
            placeholder='e.g., "Help me move a couch from 3rd floor"'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="input-group">
          <label>Category *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  border: `2px solid ${category === cat ? 'var(--primary)' : 'var(--gray-200)'}`,
                  background: category === cat ? 'var(--primary-50)' : 'white',
                  textAlign: 'left', fontSize: 13, fontWeight: 500,
                  color: category === cat ? 'var(--primary-dark)' : 'var(--gray-600)',
                }}
              >
                {CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>Description *</label>
          <textarea
            placeholder="Describe what you need done, any requirements, tools involved, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="input-group">
          <label>Location *</label>
          <input
            type="text"
            placeholder="e.g., North Ave Apartments, Room 305"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>When *</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {['asap', 'specific'].map(type => (
              <button
                key={type}
                onClick={() => setDateType(type)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 'var(--radius-md)',
                  border: `2px solid ${dateType === type ? 'var(--primary)' : 'var(--gray-200)'}`,
                  background: dateType === type ? 'var(--primary-50)' : 'white',
                  fontWeight: 600, fontSize: 13,
                  color: dateType === type ? 'var(--primary-dark)' : 'var(--gray-600)',
                }}
              >
                {type === 'asap' ? 'ASAP' : 'Pick Date & Time'}
              </button>
            ))}
          </div>
          {dateType === 'specific' && (
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
        </div>

        <div className="input-group">
          <label>Estimated Duration</label>
          <select value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)}>
            <option value="">Select</option>
            <option value="15 min">15 minutes</option>
            <option value="30 min">30 minutes</option>
            <option value="1 hour">1 hour</option>
            <option value="1-2 hours">1-2 hours</option>
            <option value="2-3 hours">2-3 hours</option>
            <option value="3-4 hours">3-4 hours</option>
            <option value="Half day">Half day</option>
          </select>
        </div>

        <div className="input-group">
          <label>Offered Pay ($) *</label>
          <input
            type="number"
            placeholder="How much will you pay?"
            value={offeredPay}
            onChange={(e) => setOfferedPay(e.target.value)}
            min={1}
            step={1}
          />
          {suggestion && (
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
              Suggested range for {category}: ${suggestion.min}–${suggestion.max}
            </p>
          )}
        </div>

        <div className="input-group">
          <label>Number of Helpers Needed</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setHelpersNeeded(Math.max(1, helpersNeeded - 1))}
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gray-100)', fontWeight: 700, fontSize: 18 }}
            >
              -
            </button>
            <span style={{ fontSize: 20, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{helpersNeeded}</span>
            <button
              onClick={() => setHelpersNeeded(Math.min(5, helpersNeeded + 1))}
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gray-100)', fontWeight: 700, fontSize: 18 }}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => setStep(2)} style={{ flex: 2 }}>
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}
