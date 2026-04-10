const express = require('express');
const auth = require('../middleware/auth');
const { all, get, run } = require('../database');
const { generateId, sanitize } = require('../utils/helpers');

const router = express.Router();

// POST /api/safety/report — report a user
router.post('/report', auth, (req, res) => {
  const { reportedId, taskId, reason, details } = req.body;

  if (!reportedId || !reason) {
    return res.status(400).json({ error: 'reportedId and reason are required' });
  }

  if (reportedId === req.user.id) {
    return res.status(400).json({ error: 'Cannot report yourself' });
  }

  const reported = get('SELECT id FROM users WHERE id = ?', [reportedId]);
  if (!reported) return res.status(404).json({ error: 'User not found' });

  const id = generateId();
  run(
    'INSERT INTO reports (id, reporter_id, reported_id, task_id, reason, details) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user.id, reportedId, taskId || null, sanitize(reason), sanitize(details || '')]
  );

  res.status(201).json({ message: 'Report submitted. Our team will review it.' });
});

// POST /api/safety/block — block a user
router.post('/block', auth, (req, res) => {
  const { blockedId } = req.body;

  if (!blockedId) return res.status(400).json({ error: 'blockedId is required' });
  if (blockedId === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });

  const existing = get(
    'SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
    [req.user.id, blockedId]
  );
  if (existing) return res.status(409).json({ error: 'User already blocked' });

  const id = generateId();
  run(
    'INSERT INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)',
    [id, req.user.id, blockedId]
  );

  res.status(201).json({ message: 'User blocked' });
});

// DELETE /api/safety/block/:blockedId — unblock a user
router.delete('/block/:blockedId', auth, (req, res) => {
  run(
    'DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
    [req.user.id, req.params.blockedId]
  );
  res.json({ message: 'User unblocked' });
});

// GET /api/safety/blocked — list blocked users
router.get('/blocked', auth, (req, res) => {
  const blocked = all(
    `SELECT b.blocked_id, u.display_name, u.profile_photo
     FROM blocks b JOIN users u ON b.blocked_id = u.id
     WHERE b.blocker_id = ?`,
    [req.user.id]
  );

  res.json({
    blocked: blocked.map((b) => ({
      id: b.blocked_id,
      displayName: b.display_name,
      profilePhoto: b.profile_photo,
    })),
  });
});

module.exports = router;
