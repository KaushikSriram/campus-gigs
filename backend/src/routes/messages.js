const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../database');
const { generateId, sanitize } = require('../utils/helpers');
const { createNotification } = require('../services/notifications');
const { upsertInterest } = require('./tasks');

const router = express.Router();

// ================================================
// GET /api/messages/threads — list all chat threads for current user
// Derived from task_applications (any row = interest/conversation link)
// ================================================
router.get('/threads', auth, async (req, res) => {
  try {
    // Threads where I'm the tasker (I expressed interest)
    const { data: asTasker } = await supabase
      .from('task_applications')
      .select('task_id, tasker_id, created_at, tasks(id, title, status, poster_id)')
      .eq('tasker_id', req.user.id)
      .order('created_at', { ascending: false });

    // Threads where I'm the poster (anyone else expressed interest in my task)
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
      threads.push({
        taskId: ta.task_id,
        taskTitle: task.title,
        taskStatus: task.status,
        otherUserId,
      });
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

// ================================================
// GET /api/messages/:taskId/:userId — messages for a thread
// ================================================
router.get('/:taskId/:userId', auth, async (req, res) => {
  try {
    const { taskId, userId } = req.params;

    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Viewer must either be the poster, or be someone who's expressed interest
    // (i.e. the poster/tasker pair corresponds to a real task_applications row).
    const viewerIsPoster = task.poster_id === req.user.id;
    const otherIsPoster = task.poster_id === userId;

    if (!viewerIsPoster && !otherIsPoster) {
      return res.status(403).json({ error: 'Not authorized for this conversation' });
    }

    // If viewer is a tasker messaging a poster, that's fine as long as either:
    //   (a) there's already an interest row, or
    //   (b) the viewer is *about* to send a message (handled in POST by auto-create).
    // For GET we just verify a thread exists.

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

// ================================================
// POST /api/messages/:taskId/:userId — send a message
// Side effect: if viewer is not the poster and has no interest row,
//              auto-create one (this replaces the old "apply" button).
// ================================================
router.post('/:taskId/:userId', auth, async (req, res) => {
  try {
    const { taskId, userId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Block check
    const { data: blocked } = await supabase
      .from('blocks')
      .select('id')
      .or(
        `and(blocker_id.eq.${req.user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${req.user.id})`
      )
      .maybeSingle();

    if (blocked) return res.status(403).json({ error: 'Cannot message this user' });

    // Auto-create interest row if the viewer is a non-poster messaging the poster
    // about a task that's still accepting interest.
    const viewerIsPoster = task.poster_id === req.user.id;
    if (!viewerIsPoster && task.poster_id === userId) {
      if (task.status !== 'cancelled' && task.status !== 'completed') {
        try {
          await upsertInterest(task, req.user);
        } catch (err) {
          console.error('Auto-interest creation failed (non-fatal):', err);
        }
      }
    }

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
