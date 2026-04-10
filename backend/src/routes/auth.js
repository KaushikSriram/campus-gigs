const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../database');
const { generateId, isEduEmail, getUniversityFromEmail, sanitize } = require('../utils/helpers');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    if (!isEduEmail(email)) {
      return res.status(400).json({ error: 'A valid .edu email address is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const id = generateId();
    const passwordHash = await bcrypt.hash(password, 10);
    const university = getUniversityFromEmail(email);
    const verificationToken = generateId();

    run(
      `INSERT INTO users (id, email, password_hash, display_name, university, verification_token)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, email.toLowerCase(), passwordHash, sanitize(displayName), university, verificationToken]
    );

    // In production, send an actual verification email.
    // For dev, we auto-verify.
    run('UPDATE users SET email_verified = 1 WHERE id = ?', [id]);

    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const user = get('SELECT * FROM users WHERE id = ?', [id]);

    res.status(201).json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: formatUser(user) });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req, res) => {
  const { displayName, bio, paymentHandle, profilePhoto } = req.body;

  const updates = [];
  const params = [];

  if (displayName !== undefined) {
    updates.push('display_name = ?');
    params.push(sanitize(displayName));
  }
  if (bio !== undefined) {
    updates.push('bio = ?');
    params.push(sanitize(bio));
  }
  if (paymentHandle !== undefined) {
    updates.push('payment_handle = ?');
    params.push(sanitize(paymentHandle));
  }
  if (profilePhoto !== undefined) {
    updates.push('profile_photo = ?');
    params.push(profilePhoto);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.user.id);

  run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: formatUser(user) });
});

// GET /api/auth/verify/:token
router.get('/verify/:token', (req, res) => {
  const user = get('SELECT * FROM users WHERE verification_token = ?', [req.params.token]);
  if (!user) {
    return res.status(400).json({ error: 'Invalid verification token' });
  }

  run('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);
  res.json({ message: 'Email verified successfully' });
});

function formatUser(user) {
  if (!user) return null;

  // Get stats
  const tasksCompleted = get(
    `SELECT COUNT(*) as count FROM task_applications
     WHERE tasker_id = ? AND status = 'completed'`,
    [user.id]
  );
  const tasksPosted = get(
    `SELECT COUNT(*) as count FROM tasks WHERE poster_id = ?`,
    [user.id]
  );
  const avgRating = get(
    `SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE reviewee_id = ?`,
    [user.id]
  );
  const totalEarnings = get(
    `SELECT COALESCE(SUM(t.offered_pay), 0) as total FROM task_applications ta
     JOIN tasks t ON ta.task_id = t.id
     WHERE ta.tasker_id = ? AND ta.status = 'completed'`,
    [user.id]
  );

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    profilePhoto: user.profile_photo,
    bio: user.bio,
    paymentHandle: user.payment_handle,
    university: user.university,
    emailVerified: !!user.email_verified,
    createdAt: user.created_at,
    tasksCompleted: tasksCompleted?.count || 0,
    tasksPosted: tasksPosted?.count || 0,
    avgRating: avgRating?.avg ? Math.round(avgRating.avg * 10) / 10 : null,
    reviewCount: avgRating?.count || 0,
    totalEarnings: totalEarnings?.total || 0,
    cancellationCount: user.cancellation_count,
  };
}

module.exports = router;
module.exports.formatUser = formatUser;
