const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/conversations - list all conversations for the current user
router.get('/conversations', auth, (req, res) => {
  const conversations = db.prepare(`
    SELECT
      m.task_id,
      t.title AS task_title,
      t.status AS task_status,
      CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
      u.name AS other_user_name,
      m.content AS last_message,
      m.created_at AS last_message_at,
      (SELECT COUNT(*) FROM messages m2
       WHERE m2.task_id = m.task_id
       AND m2.receiver_id = ?
       AND m2.sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
       AND m2.is_read = 0) AS unread_count
    FROM messages m
    JOIN tasks t ON m.task_id = t.id
    JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
    WHERE m.id IN (
      SELECT MAX(id) FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY task_id, CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
    )
    ORDER BY m.created_at DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);

  res.json(conversations);
});

// GET /api/messages/task/:taskId/user/:userId - get messages between current user and another user for a task
router.get('/task/:taskId/user/:userId', auth, (req, res) => {
  const { taskId, userId } = req.params;

  const messages = db.prepare(`
    SELECT m.*, sender.name AS sender_name
    FROM messages m
    JOIN users sender ON m.sender_id = sender.id
    WHERE m.task_id = ?
    AND (
      (m.sender_id = ? AND m.receiver_id = ?)
      OR (m.sender_id = ? AND m.receiver_id = ?)
    )
    ORDER BY m.created_at ASC
  `).all(taskId, req.user.id, userId, userId, req.user.id);

  // Mark messages as read
  db.prepare(`
    UPDATE messages SET is_read = 1
    WHERE task_id = ? AND sender_id = ? AND receiver_id = ? AND is_read = 0
  `).run(taskId, userId, req.user.id);

  res.json(messages);
});

// POST /api/messages - send a message
router.post('/', auth, (req, res) => {
  const { task_id, receiver_id, content } = req.body;

  if (!task_id || !receiver_id || !content) {
    return res.status(400).json({ error: 'task_id, receiver_id, and content are required' });
  }

  if (receiver_id === req.user.id) {
    return res.status(400).json({ error: 'Cannot message yourself' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Only the poster and acceptor (or someone interested) can message about a task
  const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(receiver_id);
  if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

  const result = db.prepare(
    'INSERT INTO messages (task_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)'
  ).run(task_id, req.user.id, receiver_id, content.trim());

  const message = db.prepare(`
    SELECT m.*, u.name AS sender_name
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(message);
});

// GET /api/messages/unread-count - get total unread message count
router.get('/unread-count', auth, (req, res) => {
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0'
  ).get(req.user.id);

  res.json({ count: result.count });
});

module.exports = router;
