const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../database');
const { generateId, isEduEmail, getUniversityFromEmail, sanitize } = require('../utils/helpers');
const { sendVerificationCode } = require('../services/email');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ================================================
// Passwordless OTP auth
// ================================================
//
// Flow:
//   1. POST /api/auth/send-code   { email }
//        -> generates 6-digit code, stores in email_codes, emails it
//        -> response: { sent: true, isNew: boolean }
//
//   2. POST /api/auth/verify-code { email, code, displayName? }
//        -> verifies code, creates user if new, returns { token, user }
//
// No passwords anywhere. The .edu inbox IS the credential.
// ================================================

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const EMAIL_CODES_MISSING_MESSAGE =
  'OTP login is not set up yet. Run backend/email-otp-migration.sql in Supabase SQL Editor.';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isMissingEmailCodesTable(error) {
  return (
    error &&
    typeof error.message === 'string' &&
    error.message.includes("Could not find the table 'public.email_codes'")
  );
}

// POST /api/auth/send-code
router.post('/send-code', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!isEduEmail(email)) {
      return res.status(400).json({ error: 'A valid .edu email address is required' });
    }

    // Rate limit: block if a code was sent in the last RESEND_COOLDOWN_SECONDS
    const since = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
    const { data: recent, error: recentError } = await supabase
      .from('email_codes')
      .select('id, created_at')
      .eq('email', email)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);

    if (isMissingEmailCodesTable(recentError)) {
      return res.status(503).json({ error: EMAIL_CODES_MISSING_MESSAGE });
    }
    if (recentError) {
      console.error('email_codes recent lookup error:', recentError);
      return res.status(500).json({ error: 'Failed to generate code' });
    }

    if (recent && recent.length > 0) {
      return res.status(429).json({
        error: `Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting a new code`,
      });
    }

    // Check if user exists (so the frontend knows whether to ask for displayName)
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    // Generate and store code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase
      .from('email_codes')
      .insert({
        email,
        code,
        expires_at: expiresAt,
      });

    if (insertErr) {
      if (isMissingEmailCodesTable(insertErr)) {
        return res.status(503).json({ error: EMAIL_CODES_MISSING_MESSAGE });
      }
      console.error('email_codes insert error:', insertErr);
      return res.status(500).json({ error: 'Failed to generate code' });
    }

    // Send email
    const sendResult = await sendVerificationCode(email, code);
    if (!sendResult.ok) {
      return res.status(500).json({ error: sendResult.error || 'Failed to send email' });
    }

    res.json({
      sent: true,
      isNew: !existing,
      fallback: sendResult.fallback || false, // if true, code is in server console (dev only)
    });
  } catch (err) {
    console.error('send-code error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify-code
router.post('/verify-code', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const code = (req.body.code || '').trim();
    const displayName = (req.body.displayName || '').trim();

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    // Find the most recent unconsumed code for this email
    const { data: codeRow, error: codeLookupError } = await supabase
      .from('email_codes')
      .select('*')
      .eq('email', email)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isMissingEmailCodesTable(codeLookupError)) {
      return res.status(503).json({ error: EMAIL_CODES_MISSING_MESSAGE });
    }
    if (codeLookupError) {
      console.error('email_codes lookup error:', codeLookupError);
      return res.status(500).json({ error: 'Failed to verify code' });
    }

    if (!codeRow) {
      return res.status(400).json({ error: 'No active code. Please request a new one.' });
    }

    // Expired?
    if (new Date(codeRow.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    // Too many attempts?
    if ((codeRow.attempts || 0) >= MAX_ATTEMPTS) {
      await supabase.from('email_codes').update({ consumed: true }).eq('id', codeRow.id);
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
    }

    // Wrong code?
    if (codeRow.code !== code) {
      await supabase
        .from('email_codes')
        .update({ attempts: (codeRow.attempts || 0) + 1 })
        .eq('id', codeRow.id);
      return res.status(400).json({ error: 'Incorrect code' });
    }

    // Find or create user
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      // New user - require display name
      if (!displayName) {
        return res.status(400).json({ error: 'Display name is required for new accounts' });
      }
    }

    // Mark code as consumed only after we know verification can continue.
    const { error: consumeError } = await supabase
      .from('email_codes')
      .update({ consumed: true })
      .eq('id', codeRow.id);

    if (consumeError) {
      if (isMissingEmailCodesTable(consumeError)) {
        return res.status(503).json({ error: EMAIL_CODES_MISSING_MESSAGE });
      }
      console.error('email_codes consume error:', consumeError);
      return res.status(500).json({ error: 'Failed to verify code' });
    }

    if (!user) {
      const newId = generateId();
      const university = getUniversityFromEmail(email);

      const { error: createErr } = await supabase.from('users').insert({
        id: newId,
        email,
        display_name: sanitize(displayName),
        university,
        email_verified: true,
      });

      if (createErr) {
        console.error('User create error:', createErr);
        return res.status(500).json({ error: 'Failed to create account' });
      }

      const { data: created } = await supabase
        .from('users')
        .select('*')
        .eq('id', newId)
        .maybeSingle();
      user = created;
    } else {
      // Existing user - make sure email_verified is true and clear any old verification token
      if (!user.email_verified) {
        await supabase
          .from('users')
          .update({ email_verified: true, verification_token: null })
          .eq('id', user.id);
        user.email_verified = true;
      }

      if (user.is_suspended) {
        return res.status(403).json({ error: 'Account suspended' });
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: await formatUser(user),
    });
  } catch (err) {
    console.error('verify-code error:', err);
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
