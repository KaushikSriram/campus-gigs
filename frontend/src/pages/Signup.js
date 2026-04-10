import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [paymentHandle, setPaymentHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('.edu')) {
      setError('Please use a valid .edu email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, displayName);
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { api } = require('../utils/api');
      await api.updateProfile({ bio, paymentHandle });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (step === 2) {
    return (
      <div style={{ minHeight: '100vh', background: 'white', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ padding: '24px 24px 48px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>You're in!</h1>
            <p style={{ color: 'var(--gray-500)' }}>Set up your profile to get started</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleProfile}>
            <div className="input-group">
              <label>Short Bio (optional)</label>
              <textarea
                placeholder="e.g., Junior, Mechanical Engineering. Got a truck if you need stuff moved."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </div>
            <div className="input-group">
              <label>Payment Handle (Venmo/Zelle/CashApp)</label>
              <input
                type="text"
                placeholder="e.g., @yourname-venmo"
                value={paymentHandle}
                onChange={(e) => setPaymentHandle(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Start Browsing Tasks'}
            </button>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => navigate('/')} style={{ marginTop: 8 }}>
              Skip for now
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'white', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ padding: '16px 20px' }}>
        <button onClick={() => navigate('/onboarding')} style={{ background: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gray-500)', fontSize: 14 }}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      <div style={{ padding: '24px 24px 48px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Create your account</h1>
        <p style={{ color: 'var(--gray-500)', marginBottom: 32 }}>Use your .edu email to join your campus</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSignup}>
          <div className="input-group">
            <label>University Email</label>
            <input
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {email && !email.endsWith('.edu') && (
              <span className="error-text">Must be a .edu email</span>
            )}
          </div>
          <div className="input-group">
            <label>Display Name</label>
            <input
              type="text"
              placeholder='e.g., "Jake S."'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Creating account...' : <><UserPlus size={18} /> Sign Up</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--gray-500)', fontSize: 14 }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Log In</Link>
        </p>
      </div>
    </div>
  );
}
