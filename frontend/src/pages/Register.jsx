import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', university: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.endsWith('.edu')) {
      setError('You must use a valid .edu email address');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h1>Join CampusGigs</h1>
      <p className="subtitle">Sign up with your university email to get started</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            className="form-control"
            placeholder="John Doe"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>University Email</label>
          <input
            type="email"
            name="email"
            className="form-control"
            placeholder="you@university.edu"
            value={form.email}
            onChange={handleChange}
            required
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Must be a .edu email</small>
        </div>
        <div className="form-group">
          <label>University Name</label>
          <input
            type="text"
            name="university"
            className="form-control"
            placeholder="State University"
            value={form.university}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            className="form-control"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
