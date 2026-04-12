import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, KeyRound, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0); // cooldown seconds
  const { sendCode, verifyCode } = useAuth();
  const navigate = useNavigate();
  const codeInputRef = useRef(null);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Autofocus the code input when we move to step 2
  useEffect(() => {
    if (step === 2 && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith('.edu')) {
      setError('Please use a valid .edu email address');
      return;
    }

    setLoading(true);
    try {
      const result = await sendCode(normalized);
      setIsNew(!!result.isNew);
      setStep(2);
      setResendIn(30);
      if (result.fallback) {
        setInfo('Dev mode: no email sent — check the backend console for the code.');
      } else {
        setInfo(`We sent a 6-digit code to ${normalized}. Check your inbox (and spam folder).`);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendIn > 0 || loading) return;
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const result = await sendCode(email.trim().toLowerCase());
      setIsNew(!!result.isNew);
      setResendIn(30);
      setInfo('New code sent. Check your inbox.');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    if (isNew && !displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      await verifyCode(email.trim().toLowerCase(), code, displayName.trim());
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      setCode('');
      setDisplayName('');
      setError('');
      setInfo('');
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'white', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ padding: '16px 20px' }}>
        <button
          onClick={goBack}
          style={{
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--gray-500)',
            fontSize: 14,
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      <div style={{ padding: '24px 24px 48px' }}>
        {step === 1 ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              Sign in to CampusGig
            </h1>
            <p style={{ color: 'var(--gray-500)', marginBottom: 32 }}>
              Enter your university email — we'll send you a code. No passwords needed.
            </p>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSendCode}>
              <div className="input-group">
                <label>University Email</label>
                <input
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                {email && !email.toLowerCase().endsWith('.edu') && (
                  <span className="error-text">Must be a .edu email</span>
                )}
              </div>
              <button
                className="btn btn-primary btn-full"
                type="submit"
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading ? (
                  'Sending code...'
                ) : (
                  <>
                    <Mail size={18} /> Send me a code
                  </>
                )}
              </button>
            </form>

            <p
              style={{
                textAlign: 'center',
                marginTop: 24,
                color: 'var(--gray-500)',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              By continuing, you agree to CampusGig's terms. We'll only use your email to verify
              you're a student.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Enter your code</h1>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>{info}</p>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleVerify}>
              <div className="input-group">
                <label>6-digit code</label>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  style={{
                    fontSize: 24,
                    letterSpacing: 6,
                    textAlign: 'center',
                    fontFamily: 'SF Mono, Monaco, monospace',
                  }}
                />
              </div>

              {isNew && (
                <div className="input-group">
                  <label>Your name</label>
                  <input
                    type="text"
                    placeholder='e.g., "Jake S."'
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                  <span
                    style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, display: 'block' }}
                  >
                    New here — what should other students call you?
                  </span>
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                type="submit"
                disabled={loading || code.length !== 6}
                style={{ marginTop: 8 }}
              >
                {loading ? (
                  'Verifying...'
                ) : (
                  <>
                    <LogIn size={18} /> {isNew ? 'Create account' : 'Sign in'}
                  </>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0 || loading}
                style={{
                  background: 'none',
                  color: resendIn > 0 ? 'var(--gray-400)' : 'var(--primary)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: resendIn > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <KeyRound size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
