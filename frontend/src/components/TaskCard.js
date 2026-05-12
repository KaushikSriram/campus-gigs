import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Star, Users } from 'lucide-react';
import {
  timeAgo,
  formatDate,
  getInitials,
  isTaskInactive,
  taskInactiveLabel,
} from '../utils/helpers';

const CATEGORY_COLORS = {
  'Moving & Heavy Lifting': { bg: '#FEE2E2', text: '#991B1B' },
  'Delivery & Pickup': { bg: '#DBEAFE', text: '#1E40AF' },
  'Academic Help': { bg: '#FEF3C7', text: '#92400E' },
  'Tech Help': { bg: '#EDE9FE', text: '#5B21B6' },
  'Errands': { bg: '#FFEDD5', text: '#9A3412' },
  'Cleaning & Organization': { bg: '#FCE7F3', text: '#9D174D' },
  'Assembly & Setup': { bg: '#FED7AA', text: '#9A3412' },
  'Event Help': { bg: '#E9D5FF', text: '#6B21A8' },
  'Creative & Design': { bg: '#CCFBF1', text: '#115E59' },
  'Other': { bg: '#F3F4F6', text: '#374151' },
};

export default function TaskCard({ task, style }) {
  const navigate = useNavigate();
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Other'];
  const inactive = isTaskInactive(task);
  const inactiveLabel = inactive ? taskInactiveLabel(task) : '';

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        opacity: inactive ? 0.6 : 1,
        ...style,
      }}
      onClick={() => navigate(`/task/${task.id}`)}
    >
      <div style={{ padding: '18px 20px' }}>
        {/* Header: Category + Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span
            className="category-badge"
            style={{ background: colors.bg, color: colors.text }}
          >
            {task.category}
          </span>
          {inactiveLabel && (
            <span className={`status-badge ${inactiveLabel.toLowerCase()}`}>
              {inactiveLabel}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.4,
          marginBottom: 10,
          color: inactive ? 'var(--text-tertiary)' : 'var(--text-primary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {task.title}
        </h3>

        {/* Meta info */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 14px',
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginBottom: 14,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
            {task.location}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
            {task.dateType === 'asap' ? 'ASAP' : formatDate(task.dateTime)}
          </span>
        </div>

        {/* Footer: Poster + Price */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="avatar avatar-sm">
              {task.posterPhoto ? (
                <img src={task.posterPhoto} alt="" />
              ) : (
                getInitials(task.posterName)
              )}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {task.posterName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                {task.posterRating && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--warning)' }}>
                    <Star size={11} fill="currentColor" /> {task.posterRating}
                  </span>
                )}
                {typeof task.interestedCount === 'number' && task.interestedCount > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Users size={11} /> {task.interestedCount}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: inactive ? 'var(--text-tertiary)' : 'var(--accent)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${task.offeredPay}
          </div>
        </div>
      </div>
    </div>
  );
}
