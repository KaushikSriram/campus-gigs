import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const slides = [
  {
    emoji: '📋',
    headline: 'Need help on campus? Post it.',
    description: 'Got a couch to move, a package to pick up, or an essay to proofread? Post a task and set your price.',
  },
  {
    emoji: '💰',
    headline: 'Got free time? Get paid.',
    description: 'Browse tasks from students on your campus. Accept a gig, do the work, get paid. Simple.',
  },
  {
    emoji: '🎓',
    headline: 'Only verified students. Your campus, your community.',
    description: 'Every user is verified with their .edu email. A trusted, closed marketplace just for your school.',
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
      zIndex: 1000,
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        padding: '0 24px',
      }}>
        {/* Logo */}
        <div style={{ paddingTop: 48, textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary-dark)' }}>
            Campus<span style={{ color: 'var(--gray-800)' }}>Gig</span>
          </h1>
        </div>

        {/* Slide */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '0 8px' }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>{slides[current].emoji}</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 12, lineHeight: 1.2 }}>
            {slides[current].headline}
          </h2>
          <p style={{ fontSize: 16, color: 'var(--gray-600)', lineHeight: 1.6 }}>
            {slides[current].description}
          </p>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === current ? 'var(--primary)' : 'var(--gray-300)',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ paddingBottom: 48 }}>
          {current < slides.length - 1 ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {current > 0 && (
                <button className="btn btn-secondary" onClick={() => setCurrent(current - 1)}>
                  <ArrowLeft size={18} />
                </button>
              )}
              <button className="btn btn-primary btn-full" onClick={() => setCurrent(current + 1)}>
                Next <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-primary btn-full" onClick={() => navigate('/login')} style={{ fontSize: 16, padding: 16 }}>
                Continue with your .edu email
              </button>
              <p style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: 13, marginTop: 4 }}>
                No password needed — we'll email you a code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
