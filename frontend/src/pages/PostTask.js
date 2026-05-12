import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Users, DollarSign } from 'lucide-react';
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
  const [step, setStep] = useState(1);

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
          <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm">
            <ArrowLeft size={18} /> Edit
          </button>
          <h1>Preview</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="page-content desktop-narrow">
          {error && <div className="error-banner">{error}</div>}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: 20 }}>
              <span className="category-badge" style={{ 
                background: 'var(--accent-light)', 
                color: 'var(--accent)', 
                marginBottom: 12, 
                display: 'inline-block' 
              }}>
                {CATEGORY_ICONS[category]} {category}
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>
                {title}
              </h2>
              <div style={{ 
                fontSize: 28, 
                fontWeight: 700, 
                color: 'var(--accent)', 
                marginBottom: 16,
                fontVariantNumeric: 'tabular-nums',
              }}>
                ${offeredPay}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <MapPin size={16} style={{ color: 'var(--text-tertiary)' }} /> {location}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
                  {dateType === 'asap' ? 'ASAP' : dateTime ? new Date(dateTime).toLocaleString() : 'Not set'}
                </div>
                {estimatedDuration && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                    ⏱ {estimatedDuration}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <Users size={16} style={{ color: 'var(--text-tertiary)' }} /> {helpersNeeded} helper{helpersNeeded > 1 ? 's' : ''} needed
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {description}
              </p>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading} style={{ padding: '14px 18px' }}>
            {loading ? 'Posting...' : 'Post Task'}
          </button>
          <button className="btn btn-secondary btn-full" onClick={() => setStep(1)} style={{ marginTop: 10 }}>
            Go Back & Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">
          <ArrowLeft size={18} />
        </button>
        <h1>Post a Task</h1>
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
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${category === cat ? 'var(--accent)' : 'var(--border)'}`,
                  background: category === cat ? 'var(--accent-light)' : 'var(--surface)',
                  textAlign: 'left',
                  fontSize: 13,
                  fontWeight: 500,
                  color: category === cat ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
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
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${dateType === type ? 'var(--accent)' : 'var(--border)'}`,
                  background: dateType === type ? 'var(--accent-light)' : 'var(--surface)',
                  fontWeight: 600,
                  fontSize: 13,
                  color: dateType === type ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
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
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
              Suggested range for {category}: ${suggestion.min}–${suggestion.max}
            </p>
          )}
        </div>

        <div className="input-group">
          <label>Number of Helpers Needed</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setHelpersNeeded(Math.max(1, helpersNeeded - 1))}
              style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 'var(--radius-md)', 
                background: 'var(--surface-hover)', 
                border: '1px solid var(--border)',
                fontWeight: 700, 
                fontSize: 18,
                color: 'var(--text-primary)',
              }}
            >
              -
            </button>
            <span style={{ fontSize: 20, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
              {helpersNeeded}
            </span>
            <button
              onClick={() => setHelpersNeeded(Math.min(5, helpersNeeded + 1))}
              style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 'var(--radius-md)', 
                background: 'var(--surface-hover)', 
                border: '1px solid var(--border)',
                fontWeight: 700, 
                fontSize: 18,
                color: 'var(--text-primary)',
              }}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
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
