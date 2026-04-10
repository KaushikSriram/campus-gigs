const express = require('express');
const auth = require('../middleware/auth');
const { all, get, run } = require('../database');

const router = express.Router();

// GET /api/notifications — list notifications
router.get('/', auth, (req, res) => {
  const notifications = all(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );

  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: JSON.parse(n.data || '{}'),
      isRead: !!n.is_read,
      createdAt: n.created_at,
    })),
    unreadCount: notifications.filter((n) => !n.is_read).length,
  });
});

// PUT /api/notifications/:id/read — mark as read
router.put('/:id/read', auth, (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Marked as read' });
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', auth, (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'All marked as read' });
});

module.exports = router;
