const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../database');
const { generateId, sanitize } = require('../utils/helpers');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// GET /api/messages/threads — list all chat threads for the current user
router.get('/threads', auth, async (req, res) => {
  try {
    // Get task_applications where user is tasker (accepted/completed)
    const { data: asTasker } = await supabase
      .from('task_applications')
      .select('task_id, tasker_id, created_at, tasks(id, title, status, poster_id)')
      .in('status', ['accepted', 'completed'])
      .eq('tasker_id', req.user.id)
      .order('created_at', { ascending: false });

    // Get task_applications where user is poster (accepted/completed)
    const { data: myTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('poster_id', req.user.id);
    const myTaskIds = (myTasks || []).map((t) => t.id);

    let asPoster = [];
    if (myTaskIds.length > 0) {
      const { data } = await supabase
        .from('task_applications')
        .select('task_id, tasker_id, created_at, tasks(id, title, status, poster_id)')
        .in('status', ['accepted', 'completed'])
        .in('task_id', myTaskIds)
        .order('created_at', { ascending: false });
      asPoster = data || [];
    }

    const seen = new Set();
    const threads = [];

    for (const ta of [...(asTasker || []), ...asPoster]) {
      const task = ta.tasks;
      if (!task) continue;
      const otherUserId = task.poster_id === req.user.id ? ta.tasker_id : task.poster_id;
      const key = `${ta.task_id}-${otherUserId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      threads.push({ taskId: ta.task_id, taskTitle: task.title, taskStatus: task.status, otherUserId });
    }

    const result = await Promise.all(
      threads.map(async (thread) => {
        const { data: otherUser } = await supabase
          .from('users')
          .select('id, display_name, profile_photo')
          .eq('id', thread.otherUserId)
          .maybeSingle();

        const { data: lastMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('task_id', thread.taskId)
          .or(
            `and(sender_id.eq.${req.user.id},receiver_id.eq.${thread.otherUserId}),and(sender_id.eq.${thread.otherUserId},receiver_id.eq.${req.user.id})`
          )
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null;

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('task_id', thread.taskId)
          .eq('sender_id', thread.otherUserId)
          .eq('receiver_id', req.user.id)
          .eq('is_read', false);

        return {
          taskId: thread.taskId,
          taskTitle: thread.taskTitle,
          taskStatus: thread.taskStatus,
          otherUser: otherUser
            ? {
                id: otherUser.id,
                displayName: otherUser.display_name,
                profilePhoto: otherUser.profile_photo,
              }
            : null,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                senderId: lastMessage.sender_id,
                createdAt: lastMessage.created_at,
              }
            : null,
          unreadCount: unreadCount || 0,
        };
      })
    );

    res.json({ threads: result });
  } catch (err) {
    console.error('Threads error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/:taskId/:userId — get messages for a specific thread
router.get('/:taskId/:userId', auth, async (req, res) => {
  try {
    const { taskId, userId } = req.params;

    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { data: application } = await supabase
      .from('task_applications')
      .select('id')
      .eq('task_id', taskId)
      .in('status', ['accepted', 'completed'])
      .or(`tasker_id.eq.${req.user.id},tasker_id.eq.${userId}`)
      .maybeSingle();

    if (!application && task.poster_id !== req.user.id && task.poster_id !== userId) {
      return res.status(403).json({ error: 'Not authorized for this conversation' });
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('task_id', taskId)
      .or(
        `and(sender_id.eq.${req.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${req.user.id})`
      )
      .order('created_at', { ascending: true });

    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('task_id', taskId)
      .eq('sender_id', userId)
      .eq('receiver_id', req.user.id)
      .eq('is_read', false);

    res.json({
      messages: (messages || []).map((m) => ({
        id: m.id,
        taskId: m.task_id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        content: m.content,
        isRead: !!m.is_read,
        createdAt: m.created_at,
      })),
    });
  } catch (err) {
    console.error('Messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages/:taskId/:userId — send a message
router.post('/:taskId/:userId', auth, async (req, res) => {
  try {
    const { taskId, userId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { data: blocked } = await supabase
      .from('blocks')
      .select('id')
      .or(
        `and(blocker_id.eq.${req.user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${req.user.id})`
      )
      .maybeSingle();

    if (blocked) return res.status(403).json({ error: 'Cannot message this user' });

    const id = generateId();
    await supabase.from('messages').insert({
      id,
      task_id: taskId,
      sender_id: req.user.id,
      receiver_id: userId,
      content: sanitize(content),
    });

    await createNotification(
      userId,
      'new_message',
      'New Message',
      `${req.user.display_name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      { taskId, senderId: req.user.id }
    );

    const { data: message } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .maybeSingle();

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
  } catch (err) {
    console.error('Message send error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
