const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../database');
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

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const id = generateId();
    const passwordHash = await bcrypt.hash(password, 10);
    const university = getUniversityFromEmail(email);
    const verificationToken = generateId();

    const { error: insertErr } = await supabase
      .from('users')
      .insert({
        id,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        display_name: sanitize(displayName),
        university,
        verification_token: verificationToken,
        email_verified: true,
      });

    if (insertErr) {
      console.error('Signup insert error:', insertErr);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    res.status(201).json({
      token,
      user: await formatUser(user),
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

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

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
      user: await formatUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle();
  res.json({ user: await formatUser(user) });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  const { displayName, bio, paymentHandle, profilePhoto } = req.body;

  const updates = {};

  if (displayName !== undefined) updates.display_name = sanitize(displayName);
  if (bio !== undefined) updates.bio = sanitize(bio);
  if (paymentHandle !== undefined) updates.payment_handle = sanitize(paymentHandle);
  if (profilePhoto !== undefined) updates.profile_photo = profilePhoto;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.updated_at = new Date().toISOString();

  await supabase.from('users').update(updates).eq('id', req.user.id);

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle();

  res.json({ user: await formatUser(user) });
});

// GET /api/auth/verify/:token
router.get('/verify/:token', async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('verification_token', req.params.token)
    .maybeSingle();

  if (!user) {
    return res.status(400).json({ error: 'Invalid verification token' });
  }

  await supabase
    .from('users')
    .update({ email_verified: true, verification_token: null })
    .eq('id', user.id);

  res.json({ message: 'Email verified successfully' });
});

async function formatUser(user) {
  if (!user) return null;

  const { count: tasksCompleted } = await supabase
    .from('task_applications')
    .select('*', { count: 'exact', head: true })
    .eq('tasker_id', user.id)
    .eq('status', 'completed');

  const { count: tasksPosted } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('poster_id', user.id);

  const { data: reviewData } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewee_id', user.id);

  let avgRating = null;
  let reviewCount = 0;
  if (reviewData && reviewData.length > 0) {
    reviewCount = reviewData.length;
    const sum = reviewData.reduce((acc, r) => acc + r.rating, 0);
    avgRating = Math.round((sum / reviewCount) * 10) / 10;
  }

  const { data: earningsData } = await supabase
    .from('task_applications')
    .select('tasks(offered_pay)')
    .eq('tasker_id', user.id)
    .eq('status', 'completed');

  const totalEarnings = (earningsData || []).reduce(
    (sum, ta) => sum + (ta.tasks?.offered_pay || 0),
    0
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
    tasksCompleted: tasksCompleted || 0,
    tasksPosted: tasksPosted || 0,
    avgRating,
    reviewCount,
    totalEarnings,
    cancellationCount: user.cancellation_count,
  };
}

module.exports = router;
module.exports.formatUser = formatUser;
