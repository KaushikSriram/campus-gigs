const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../database');

const router = express.Router();

// GET /api/notifications — list notifications
router.get('/', auth, async (req, res) => {
  try {
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({
      notifications: (notifications || []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: typeof n.data === 'string' ? JSON.parse(n.data || '{}') : n.data || {},
        isRead: !!n.is_read,
        createdAt: n.created_at,
      })),
      unreadCount: (notifications || []).filter((n) => !n.is_read).length,
    });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notifications/:id/read — mark as read
router.put('/:id/read', auth, async (req, res) => {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  res.json({ message: 'Marked as read' });
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', auth, async (req, res) => {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', req.user.id);
  res.json({ message: 'All marked as read' });
});

module.exports = router;
