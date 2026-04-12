const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../database');
const { generateId, CATEGORIES, moderateContent, sanitize } = require('../utils/helpers');
const { formatUser } = require('./auth');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// ================================================
// Helpers
// ================================================

// Count distinct interested users per task_id.
// Returns an object { [taskId]: number }.
async function buildInterestCountMap(taskIds) {
  if (!taskIds.length) return {};
  const { data: apps } = await supabase
    .from('task_applications')
    .select('task_id, tasker_id')
    .in('task_id', taskIds);

  const map = {};
  const seen = new Set();
  for (const a of apps || []) {
    const key = `${a.task_id}:${a.tasker_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    map[a.task_id] = (map[a.task_id] || 0) + 1;
  }
  return map;
}

function isExpired(task) {
  if (!task?.date_time) return false;
  if (task.date_type === 'asap') return false;
  const t = new Date(task.date_time).getTime();
  if (isNaN(t)) return false;
  return t < Date.now();
}

// ================================================
// GET /api/tasks — campus task feed
// ================================================
router.get('/', auth, async (req, res) => {
  try {
    const { category, minPay, maxPay, date, sort, search, status, includeExpired } = req.query;

    const { data: blockedData } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', req.user.id);
    const blockedIds = (blockedData || []).map((b) => b.blocked_id);

    let query = supabase
      .from('tasks')
      .select('*, poster:users!poster_id(display_name, profile_photo)')
      .eq('university', req.user.university);

    if (blockedIds.length > 0) {
      query = query.not('poster_id', 'in', `(${blockedIds.join(',')})`);
    }

    // Status filter: default to "open" only for the public feed.
    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.eq('status', 'open');
    }

    if (category && CATEGORIES.includes(category)) {
      query = query.eq('category', category);
    }
    if (minPay) query = query.gte('offered_pay', parseFloat(minPay));
    if (maxPay) query = query.lte('offered_pay', parseFloat(maxPay));
    if (date) {
      query = query.gte('date_time', `${date}T00:00:00`).lte('date_time', `${date}T23:59:59`);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    switch (sort) {
      case 'pay_high':
        query = query.order('offered_pay', { ascending: false });
        break;
      case 'pay_low':
        query = query.order('offered_pay', { ascending: true });
        break;
      case 'soonest':
        query = query.order('date_time', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.limit(80);

    let { data: tasks, error } = await query;
    if (error) {
      console.error('Tasks fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }

    // Filter out expired tasks from the public feed unless explicitly requested.
    if (!includeExpired) {
      tasks = (tasks || []).filter((t) => !isExpired(t));
    }

    const posterIds = [...new Set((tasks || []).map((t) => t.poster_id))];
    const taskIds = (tasks || []).map((t) => t.id);
    const [reviewMap, interestMap] = await Promise.all([
      buildReviewMap(posterIds),
      buildInterestCountMap(taskIds),
    ]);
    const formatted = (tasks || []).map((t) =>
      formatTaskSync(t, req.user.id, reviewMap, interestMap)
    );
    res.json({ tasks: formatted });
  } catch (err) {
    console.error('Tasks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// GET /api/tasks/mine — all tasks the user posted or showed interest in
// ================================================
router.get('/mine', auth, async (req, res) => {
  try {
    // Tasks I posted (any status)
    const { data: posted } = await supabase
      .from('tasks')
      .select('*, poster:users!poster_id(display_name, profile_photo)')
      .eq('poster_id', req.user.id)
      .order('created_at', { ascending: false });

    // Tasks I've expressed interest in (any status)
    const { data: myInterests } = await supabase
      .from('task_applications')
      .select('task_id')
      .eq('tasker_id', req.user.id);

    let interested = [];
    const interestedTaskIds = [...new Set((myInterests || []).map((a) => a.task_id))];
    if (interestedTaskIds.length > 0) {
      const { data } = await supabase
        .from('tasks')
        .select('*, poster:users!poster_id(display_name, profile_photo)')
        .in('id', interestedTaskIds)
        .order('created_at', { ascending: false });
      interested = data || [];
    }

    const allTasks = [...(posted || []), ...interested];
    const posterIds = [...new Set(allTasks.map((t) => t.poster_id))];
    const taskIds = allTasks.map((t) => t.id);
    const [reviewMap, interestMap] = await Promise.all([
      buildReviewMap(posterIds),
      buildInterestCountMap(taskIds),
    ]);

    res.json({
      posted: (posted || []).map((t) =>
        formatTaskSync(t, req.user.id, reviewMap, interestMap)
      ),
      interested: interested.map((t) =>
        formatTaskSync(t, req.user.id, reviewMap, interestMap)
      ),
    });
  } catch (err) {
    console.error('My tasks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// GET /api/tasks/:id — single task detail
// ================================================
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*, poster:users!poster_id(display_name, profile_photo)')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await formatTask(task, req.user.id);

    // If the viewer is the poster, list all interested users.
    if (task.poster_id === req.user.id) {
      const { data: interests } = await supabase
        .from('task_applications')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      // Dedupe by tasker_id (in case of legacy duplicates)
      const seen = new Set();
      const uniq = [];
      for (const row of interests || []) {
        if (seen.has(row.tasker_id)) continue;
        seen.add(row.tasker_id);
        uniq.push(row);
      }

      result.interestedUsers = await Promise.all(
        uniq.map(async (a) => {
          const { data: u } = await supabase
            .from('users')
            .select('*')
            .eq('id', a.tasker_id)
            .maybeSingle();
          return {
            interestId: a.id,
            createdAt: a.created_at,
            user: await formatUser(u),
          };
        })
      );
    }

    // Has the viewer expressed interest?
    const { data: myInterest } = await supabase
      .from('task_applications')
      .select('id')
      .eq('task_id', task.id)
      .eq('tasker_id', req.user.id)
      .maybeSingle();

    result.viewerIsInterested = !!myInterest;

    // Populate assigned tasker info if set
    if (task.assigned_tasker_id) {
      const { data: assigned } = await supabase
        .from('users')
        .select('id, display_name, profile_photo')
        .eq('id', task.assigned_tasker_id)
        .maybeSingle();
      if (assigned) {
        result.assignedTasker = {
          id: assigned.id,
          displayName: assigned.display_name,
          profilePhoto: assigned.profile_photo,
        };
      }
    }

    res.json({ task: result });
  } catch (err) {
    console.error('Task detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// POST /api/tasks — create a new task
// ================================================
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      location,
      dateTime,
      dateType,
      estimatedDuration,
      offeredPay,
      helpersNeeded,
      photos,
    } = req.body;

    if (!title || !category || !description || !location || !dateTime || !offeredPay) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (parseFloat(offeredPay) < 1) {
      return res.status(400).json({ error: 'Pay must be at least $1' });
    }

    const titleCheck = moderateContent(title);
    if (!titleCheck.ok) return res.status(400).json({ error: titleCheck.reason });
    const descCheck = moderateContent(description);
    if (!descCheck.ok) return res.status(400).json({ error: descCheck.reason });

    const id = generateId();

    const { error: insertErr } = await supabase.from('tasks').insert({
      id,
      poster_id: req.user.id,
      title: sanitize(title),
      category,
      description: sanitize(description),
      location: sanitize(location),
      date_time: dateTime,
      date_type: dateType || 'specific',
      estimated_duration: estimatedDuration || '',
      offered_pay: parseFloat(offeredPay),
      helpers_needed: parseInt(helpersNeeded) || 1,
      photos: JSON.stringify(photos || []),
      university: req.user.university,
    });

    if (insertErr) {
      console.error('Task create error:', insertErr);
      return res.status(500).json({ error: 'Failed to create task' });
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('*, poster:users!poster_id(display_name, profile_photo)')
      .eq('id', id)
      .maybeSingle();

    res.status(201).json({ task: await formatTask(task, req.user.id) });
  } catch (err) {
    console.error('Task create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// PUT /api/tasks/:id — update a task (poster, while still open)
// ================================================
router.put('/:id', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });
    if (task.status !== 'open') return res.status(400).json({ error: 'Can only edit open tasks' });

    const {
      title,
      category,
      description,
      location,
      dateTime,
      estimatedDuration,
      offeredPay,
      helpersNeeded,
      photos,
    } = req.body;

    const updates = {};
    if (title !== undefined) {
      const check = moderateContent(title);
      if (!check.ok) return res.status(400).json({ error: check.reason });
      updates.title = sanitize(title);
    }
    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
      updates.category = category;
    }
    if (description !== undefined) {
      const check = moderateContent(description);
      if (!check.ok) return res.status(400).json({ error: check.reason });
      updates.description = sanitize(description);
    }
    if (location !== undefined) updates.location = sanitize(location);
    if (dateTime !== undefined) updates.date_time = dateTime;
    if (estimatedDuration !== undefined) updates.estimated_duration = estimatedDuration;
    if (offeredPay !== undefined) updates.offered_pay = parseFloat(offeredPay);
    if (helpersNeeded !== undefined) updates.helpers_needed = parseInt(helpersNeeded);
    if (photos !== undefined) updates.photos = JSON.stringify(photos);

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'No fields to update' });

    updates.updated_at = new Date().toISOString();

    await supabase.from('tasks').update(updates).eq('id', req.params.id);

    const { data: updated } = await supabase
      .from('tasks')
      .select('*, poster:users!poster_id(display_name, profile_photo)')
      .eq('id', req.params.id)
      .maybeSingle();

    res.json({ task: await formatTask(updated, req.user.id) });
  } catch (err) {
    console.error('Task update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// DELETE /api/tasks/:id — cancel a task
// ================================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });

    // Notify anyone who had expressed interest
    const { data: interested } = await supabase
      .from('task_applications')
      .select('tasker_id')
      .eq('task_id', task.id);

    for (const row of interested || []) {
      await createNotification(
        row.tasker_id,
        'task_cancelled',
        'Task Cancelled',
        `The task "${task.title}" has been cancelled by the poster.`,
        { taskId: task.id }
      );
    }

    await supabase
      .from('tasks')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', task.id);

    await supabase
      .from('users')
      .update({ cancellation_count: (req.user.cancellation_count || 0) + 1 })
      .eq('id', req.user.id);

    res.json({ message: 'Task cancelled' });
  } catch (err) {
    console.error('Task delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// POST /api/tasks/:id/interest — express interest in a task
// (called automatically when a non-poster first messages the poster,
//  but also callable directly for an explicit "I'm interested" click)
// ================================================
router.post('/:id/interest', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id === req.user.id)
      return res.status(400).json({ error: 'You posted this task' });
    if (task.status === 'cancelled' || task.status === 'completed')
      return res.status(400).json({ error: 'This task is no longer accepting interest' });

    const result = await upsertInterest(task, req.user);
    res.status(201).json(result);
  } catch (err) {
    console.error('Task interest error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// POST /api/tasks/:id/withdraw — withdraw interest
// ================================================
router.post('/:id/withdraw', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await supabase
      .from('task_applications')
      .delete()
      .eq('task_id', task.id)
      .eq('tasker_id', req.user.id);

    res.json({ message: 'Interest withdrawn' });
  } catch (err) {
    console.error('Task withdraw error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// POST /api/tasks/:id/fill — mark task as filled (poster only)
// ================================================
router.post('/:id/fill', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id)
      return res.status(403).json({ error: 'Only the poster can mark as filled' });
    if (task.status !== 'open')
      return res.status(400).json({ error: 'Task is not open' });

    await supabase
      .from('tasks')
      .update({ status: 'filled', updated_at: new Date().toISOString() })
      .eq('id', task.id);

    res.json({ message: 'Task marked as filled' });
  } catch (err) {
    console.error('Task fill error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// POST /api/tasks/:id/reopen — reopen a filled task
// ================================================
router.post('/:id/reopen', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id)
      return res.status(403).json({ error: 'Only the poster can reopen' });
    if (task.status !== 'filled')
      return res.status(400).json({ error: 'Only filled tasks can be reopened' });

    await supabase
      .from('tasks')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', task.id);

    res.json({ message: 'Task reopened' });
  } catch (err) {
    console.error('Task reopen error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// POST /api/tasks/:id/complete — mark complete with optional assignee
// Body: { assignedTaskerId?: string | null }
//   - assignedTaskerId = userId  -> credit that user
//   - assignedTaskerId = null    -> "I don't remember who did it"
// ================================================
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id)
      return res.status(403).json({ error: 'Only the poster can mark as complete' });
    if (task.status === 'completed')
      return res.status(400).json({ error: 'Task already completed' });
    if (task.status === 'cancelled')
      return res.status(400).json({ error: 'Task was cancelled' });

    let assignedTaskerId = req.body.assignedTaskerId ?? null;

    // If a tasker is assigned, validate they actually expressed interest
    if (assignedTaskerId) {
      const { data: interest } = await supabase
        .from('task_applications')
        .select('id')
        .eq('task_id', task.id)
        .eq('tasker_id', assignedTaskerId)
        .maybeSingle();
      if (!interest) {
        return res.status(400).json({
          error: 'That user never expressed interest in this task',
        });
      }
    }

    const updates = {
      status: 'completed',
      updated_at: new Date().toISOString(),
      assigned_tasker_id: assignedTaskerId,
    };

    await supabase.from('tasks').update(updates).eq('id', task.id);

    // Mark the assigned tasker's interest row as completed so profile stats work.
    if (assignedTaskerId) {
      await supabase
        .from('task_applications')
        .update({ status: 'completed' })
        .eq('task_id', task.id)
        .eq('tasker_id', assignedTaskerId);

      await createNotification(
        assignedTaskerId,
        'task_completed',
        'Task Completed!',
        `"${task.title}" has been marked as complete. Rate your experience!`,
        { taskId: task.id }
      );
    }

    res.json({ message: 'Task marked as complete' });
  } catch (err) {
    console.error('Task complete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================================================
// Shared interest upsert (used by routes and by messages.js)
// ================================================
async function upsertInterest(task, user) {
  const { data: existing } = await supabase
    .from('task_applications')
    .select('id')
    .eq('task_id', task.id)
    .eq('tasker_id', user.id)
    .maybeSingle();

  if (existing) {
    return { interestId: existing.id, created: false };
  }

  const id = generateId();
  const { error: insertErr } = await supabase
    .from('task_applications')
    .insert({ id, task_id: task.id, tasker_id: user.id, status: 'pending' });

  if (insertErr) {
    console.error('Interest insert error:', insertErr);
    throw insertErr;
  }

  await createNotification(
    task.poster_id,
    'new_interest',
    'Someone is interested',
    `${user.display_name} is interested in "${task.title}"`,
    { taskId: task.id, interestId: id, taskerId: user.id }
  );

  return { interestId: id, created: true };
}

// ================================================
// Review helpers
// ================================================
async function buildReviewMap(posterIds) {
  if (!posterIds.length) return {};
  const { data: allReviews } = await supabase
    .from('reviews')
    .select('reviewee_id, rating')
    .in('reviewee_id', posterIds);

  const map = {};
  for (const r of allReviews || []) {
    if (!map[r.reviewee_id]) map[r.reviewee_id] = { sum: 0, count: 0 };
    map[r.reviewee_id].sum += r.rating;
    map[r.reviewee_id].count++;
  }
  return map;
}

function formatTaskSync(t, viewerId, reviewMap, interestMap = {}) {
  const stats = reviewMap[t.poster_id];
  return {
    id: t.id,
    posterId: t.poster_id,
    posterName: t.poster?.display_name,
    posterPhoto: t.poster?.profile_photo,
    posterRating: stats ? Math.round((stats.sum / stats.count) * 10) / 10 : null,
    posterReviewCount: stats ? stats.count : 0,
    title: t.title,
    category: t.category,
    description: t.description,
    location: t.location,
    dateTime: t.date_time,
    dateType: t.date_type,
    estimatedDuration: t.estimated_duration,
    offeredPay: t.offered_pay,
    helpersNeeded: t.helpers_needed,
    photos: typeof t.photos === 'string' ? JSON.parse(t.photos || '[]') : t.photos || [],
    status: t.status,
    university: t.university,
    createdAt: t.created_at,
    isOwner: t.poster_id === viewerId,
    interestedCount: interestMap[t.id] || 0,
    assignedTaskerId: t.assigned_tasker_id || null,
  };
}

async function formatTask(t, viewerId) {
  const [reviewMap, interestMap] = await Promise.all([
    buildReviewMap([t.poster_id]),
    buildInterestCountMap([t.id]),
  ]);
  return formatTaskSync(t, viewerId, reviewMap, interestMap);
}

module.exports = router;
module.exports.upsertInterest = upsertInterest;
