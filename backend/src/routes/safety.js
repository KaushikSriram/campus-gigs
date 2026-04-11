const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../database');
const { generateId, sanitize } = require('../utils/helpers');

const router = express.Router();

// POST /api/safety/report — report a user
router.post('/report', auth, async (req, res) => {
  try {
    const { reportedId, taskId, reason, details } = req.body;

    if (!reportedId || !reason) {
      return res.status(400).json({ error: 'reportedId and reason are required' });
    }

    if (reportedId === req.user.id) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    const { data: reported } = await supabase
      .from('users')
      .select('id')
      .eq('id', reportedId)
      .maybeSingle();

    if (!reported) return res.status(404).json({ error: 'User not found' });

    const id = generateId();
    await supabase.from('reports').insert({
      id,
      reporter_id: req.user.id,
      reported_id: reportedId,
      task_id: taskId || null,
      reason: sanitize(reason),
      details: sanitize(details || ''),
    });

    res.status(201).json({ message: 'Report submitted. Our team will review it.' });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/safety/block — block a user
router.post('/block', auth, async (req, res) => {
  try {
    const { blockedId } = req.body;

    if (!blockedId) return res.status(400).json({ error: 'blockedId is required' });
    if (blockedId === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });

    const { data: existing } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', req.user.id)
      .eq('blocked_id', blockedId)
      .maybeSingle();

    if (existing) return res.status(409).json({ error: 'User already blocked' });

    const id = generateId();
    await supabase.from('blocks').insert({
      id,
      blocker_id: req.user.id,
      blocked_id: blockedId,
    });

    res.status(201).json({ message: 'User blocked' });
  } catch (err) {
    console.error('Block error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/safety/block/:blockedId — unblock a user
router.delete('/block/:blockedId', auth, async (req, res) => {
  try {
    await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', req.user.id)
      .eq('blocked_id', req.params.blockedId);

    res.json({ message: 'User unblocked' });
  } catch (err) {
    console.error('Unblock error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/safety/blocked — list blocked users
router.get('/blocked', auth, async (req, res) => {
  try {
    const { data: blocked } = await supabase
      .from('blocks')
      .select('blocked_id, users!blocked_id(display_name, profile_photo)')
      .eq('blocker_id', req.user.id);

    res.json({
      blocked: (blocked || []).map((b) => ({
        id: b.blocked_id,
        displayName: b.users?.display_name,
        profilePhoto: b.users?.profile_photo,
      })),
    });
  } catch (err) {
    console.error('Blocked list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
