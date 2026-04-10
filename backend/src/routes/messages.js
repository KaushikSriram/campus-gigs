const express = require('express');
const auth = require('../middleware/auth');
const { all, get, run } = require('../database');
const { generateId, sanitize } = require('../utils/helpers');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// GET /api/messages/threads — list all chat threads for the current user
router.get('/threads', auth, (req, res) => {
  // A thread exists when there's an accepted application
  // Threads are scoped to a task between poster and tasker
  const threads = all(
    `SELECT DISTINCT
       t.id as task_id,
       t.title as task_title,
       t.status as task_status,
       t.poster_id,
       ta.tasker_id,
       CASE WHEN t.poster_id = ? THEN ta.tasker_id ELSE t.poster_id END as other_user_id
     FROM task_applications ta
     JOIN tasks t ON ta.task_id = t.id
     WHERE ta.status IN ('accepted', 'completed')
       AND (t.poster_id = ? OR ta.tasker_id = ?)
     ORDER BY ta.created_at DESC`,
    [req.user.id, req.user.id, req.user.id]
  );

  const result = threads.map((thread) => {
    const otherUser = get('SELECT id, display_name, profile_photo FROM users WHERE id = ?', [thread.other_user_id]);
    const lastMessage = get(
      `SELECT * FROM messages
       WHERE task_id = ?
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       ORDER BY created_at DESC LIMIT 1`,
      [thread.task_id, req.user.id, thread.other_user_id, thread.other_user_id, req.user.id]
    );
    const unreadCount = get(
      `SELECT COUNT(*) as count FROM messages
       WHERE task_id = ? AND sender_id = ? AND receiver_id = ? AND is_read = 0`,
      [thread.task_id, thread.other_user_id, req.user.id]
    );

    return {
      taskId: thread.task_id,
      taskTitle: thread.task_title,
      taskStatus: thread.task_status,
      otherUser: otherUser ? {
        id: otherUser.id,
        displayName: otherUser.display_name,
        profilePhoto: otherUser.profile_photo,
      } : null,
      lastMessage: lastMessage ? {
        content: lastMessage.content,
        senderId: lastMessage.sender_id,
        createdAt: lastMessage.created_at,
      } : null,
      unreadCount: unreadCount?.count || 0,
    };
  });

  res.json({ threads: result });
});

// GET /api/messages/:taskId/:userId — get messages for a specific thread
router.get('/:taskId/:userId', auth, (req, res) => {
  const { taskId, userId } = req.params;

  // Verify the user is part of this conversation
  const task = get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const application = get(
    "SELECT * FROM task_applications WHERE task_id = ? AND status IN ('accepted', 'completed') AND (tasker_id = ? OR tasker_id = ?)",
    [taskId, req.user.id, userId]
  );
  if (!application && task.poster_id !== req.user.id && task.poster_id !== userId) {
    return res.status(403).json({ error: 'Not authorized for this conversation' });
  }

  const messages = all(
    `SELECT * FROM messages
     WHERE task_id = ?
       AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
     ORDER BY created_at ASC`,
    [taskId, req.user.id, userId, userId, req.user.id]
  );

  // Mark as read
  run(
    `UPDATE messages SET is_read = 1
     WHERE task_id = ? AND sender_id = ? AND receiver_id = ? AND is_read = 0`,
    [taskId, userId, req.user.id]
  );

  res.json({
    messages: messages.map((m) => ({
      id: m.id,
      taskId: m.task_id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      content: m.content,
      isRead: !!m.is_read,
      createdAt: m.created_at,
    })),
  });
});

// POST /api/messages/:taskId/:userId — send a message
router.post('/:taskId/:userId', auth, (req, res) => {
  const { taskId, userId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  // Verify the user is part of this conversation
  const task = get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Check blocked
  const blocked = get(
    'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [req.user.id, userId, userId, req.user.id]
  );
  if (blocked) return res.status(403).json({ error: 'Cannot message this user' });

  const id = generateId();
  run(
    'INSERT INTO messages (id, task_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?, ?)',
    [id, taskId, req.user.id, userId, sanitize(content)]
  );

  createNotification(
    userId,
    'new_message',
    'New Message',
    `${req.user.display_name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
    { taskId, senderId: req.user.id }
  );

  const message = get('SELECT * FROM messages WHERE id = ?', [id]);
  res.status(201).json({
    message: {
      id: message.id,
      taskId: message.task_id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      content: message.content,
      isRead: false,
      createdAt: message.created_at,
    },
  });
});

module.exports = router;
