import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Star, Users } from 'lucide-react';
import {
  timeAgo,
  formatDate,
  getInitials,
  CATEGORY_COLORS,
  isTaskInactive,
  taskInactiveLabel,
} from '../utils/helpers';

export default function TaskCard({ task }) {
  const navigate = useNavigate();
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Other'];
  const inactive = isTaskInactive(task);
  const inactiveLabel = inactive ? taskInactiveLabel(task) : '';

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        opacity: inactive ? 0.55 : 1,
        position: 'relative',
        transition: 'opacity 160ms ease',
      }}
      onClick={() => navigate(`/task/${task.id}`)}
    >
      <div style={{ padding: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <div style={{ flex: 1, marginRight: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span
                className="category-badge"
                style={{ background: colors.bg, color: colors.text, display: 'inline-block' }}
              >
                {task.category}
              </span>
              {inactiveLabel && (
                <span
                  className="category-badge"
                  style={{
                    background: 'var(--gray-200, #e5e7eb)',
                    color: 'var(--gray-600, #4b5563)',
                    textTransform: 'uppercase',
                    fontSize: 10,
                    letterSpacing: 0.5,
                  }}
                >
                  {inactiveLabel}
                </span>
              )}
            </div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textDecoration: inactive ? 'line-through' : 'none',
                color: inactive ? 'var(--gray-500)' : 'inherit',
              }}
            >
              {task.title}
            </h3>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: inactive ? 'var(--gray-500)' : 'var(--primary)',
              }}
            >
              ${task.offeredPay}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            fontSize: 13,
            color: 'var(--gray-500)',
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={14} /> {task.location}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> {task.dateType === 'asap' ? 'ASAP' : formatDate(task.dateTime)}
          </span>
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
              <Users size={14} /> {task.interestedCount} interested
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="avatar avatar-sm">
              {task.posterPhoto ? (
                <img src={task.posterPhoto} alt="" />
              ) : (
                getInitials(task.posterName)
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-600)' }}>
              {task.posterName}
            </span>
            {task.posterRating && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: 13,
                  color: 'var(--warning)',
                }}
              >
                <Star size={12} fill="currentColor" /> {task.posterRating}
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{timeAgo(task.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
