const express = require('express');
const supabase = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/conversations - list all conversations for the current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const { data: conversations, error } = await supabase
      .rpc('get_conversations', { p_user_id: req.user.id });

    if (error) {
      console.error('Conversations error:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    res.json(conversations || []);
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/task/:taskId/user/:userId - get messages between users for a task
router.get('/task/:taskId/user/:userId', auth, async (req, res) => {
  try {
    const { taskId, userId } = req.params;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, sender:users!sender_id(name)')
      .eq('task_id', taskId)
      .or(
        `and(sender_id.eq.${req.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${req.user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Messages fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Flatten sender name
    const flat = (messages || []).map(m => ({
      ...m,
      sender_name: m.sender?.name,
      sender: undefined
    }));

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('task_id', taskId)
      .eq('sender_id', userId)
      .eq('receiver_id', req.user.id)
      .eq('is_read', false);

    res.json(flat);
  } catch (err) {
    console.error('Messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages - send a message
router.post('/', auth, async (req, res) => {
  try {
    const { task_id, receiver_id, content } = req.body;

    if (!task_id || !receiver_id || !content) {
      return res.status(400).json({ error: 'task_id, receiver_id, and content are required' });
    }

    if (receiver_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Verify task exists
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', task_id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Verify receiver exists
    const { data: receiver } = await supabase
      .from('users')
      .select('id')
      .eq('id', receiver_id)
      .maybeSingle();

    if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        task_id,
        sender_id: req.user.id,
        receiver_id,
        content: content.trim()
      })
      .select('*, sender:users!sender_id(name)')
      .single();

    if (error) {
      console.error('Message send error:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    res.status(201).json({
      ...message,
      sender_name: message.sender?.name,
      sender: undefined
    });
  } catch (err) {
    console.error('Message send error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/unread-count - get total unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', req.user.id)
      .eq('is_read', false);

    if (error) return res.status(500).json({ error: 'Failed to get unread count' });

    res.json({ count: count || 0 });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
