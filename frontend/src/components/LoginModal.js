import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { showLoginModal, closeLoginModal, sendCode, verifyCode, onLoginSuccess } = useAuth();
  const [step, setStep] = useState('email'); // email, code, name
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [codeResult, setCodeResult] = useState(null);

  useEffect(() => {
    if (!showLoginModal) {
      setStep('email');
      setEmail('');
      setCode('');
      setDisplayName('');
      setError('');
      setCodeResult(null);
    }
  }, [showLoginModal]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('.edu')) {
      setError('Please use a valid .edu email address');
      return;
    }

    setLoading(true);
    try {
      await sendCode(email);
      setStep('code');
      setResendTimer(60);
    } catch (err) {
      setError(err.message || 'Failed to send code');
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verifyCode(email, code, null);
      setCodeResult(result);
      if (result.isNewUser) {
        setStep('name');
      } else {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Invalid code');
    }
    setLoading(false);
  };

  const handleSetName = async (e) => {
    e.preventDefault();
    setError('');

    if (displayName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      await verifyCode(email, code, displayName.trim());
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Failed to complete signup');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await sendCode(email);
      setResendTimer(60);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (!showLoginModal) return null;

  return (
    <div className="modal-overlay" onClick={closeLoginModal}>
      <div className="modal-content login-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {step === 'email' && 'Sign in'}
            {step === 'code' && 'Enter Code'}
            {step === 'name' && 'Almost Done'}
          </h2>
          <button onClick={closeLoginModal} className="modal-close">
            <X size={20} />
          </button>
        </div>

        {step === 'email' && (
          <>
            <p className="login-modal-subtitle">
              Enter your .edu email to sign in or create an account.
            </p>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSendCode}>
              <div className="input-group">
                <label>School Email</label>
                <input
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading || !email}
              >
                {loading ? 'Sending...' : 'Continue'}
              </button>
            </form>

            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 16 }}>
              We'll send a 6-digit code to verify your email.
            </p>
          </>
        )}

        {step === 'code' && (
          <>
            <p className="login-modal-subtitle">
              We sent a code to <strong>{email}</strong>
            </p>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleVerifyCode}>
              <div className="input-group">
                <label>Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  className="code-input"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>

            <div className="login-modal-footer">
              <button
                onClick={handleResend}
                disabled={resendTimer > 0 || loading}
                className="resend-btn"
              >
                <Mail size={14} />
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
              </button>
              <button onClick={() => setStep('email')} className="back-btn">
                <ArrowLeft size={14} /> Change email
              </button>
            </div>
          </>
        )}

        {step === 'name' && (
          <>
            <p className="login-modal-subtitle">
              <CheckCircle size={16} style={{ color: 'var(--success)', verticalAlign: -3 }} /> Email verified! Choose a display name.
            </p>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSetName}>
              <div className="input-group">
                <label>Display Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                  maxLength={50}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading || !displayName.trim()}
              >
                {loading ? 'Creating...' : 'Complete Signup'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
