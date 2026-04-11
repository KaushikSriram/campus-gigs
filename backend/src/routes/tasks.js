const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../database');
const { generateId, CATEGORIES, moderateContent, sanitize } = require('../utils/helpers');
const { formatUser } = require('./auth');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// GET /api/tasks — campus task feed
router.get('/', auth, async (req, res) => {
  try {
    const { category, minPay, maxPay, date, sort, search, status } = req.query;

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

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.eq('status', 'open');
    }

    if (category && CATEGORIES.includes(category)) {
      query = query.eq('category', category);
    }

    if (minPay) {
      query = query.gte('offered_pay', parseFloat(minPay));
    }

    if (maxPay) {
      query = query.lte('offered_pay', parseFloat(maxPay));
    }

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

    query = query.limit(50);

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Tasks fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }

    const posterIds = [...new Set((tasks || []).map((t) => t.poster_id))];
    const reviewMap = await buildReviewMap(posterIds);
    const formatted = (tasks || []).map((t) => formatTaskSync(t, req.user.id, reviewMap));
    res.json({ tasks: formatted });
  } catch (err) {
    console.error('Tasks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/mine — all tasks the user posted or was accepted for
router.get('/mine', auth, async (req, res) => {
  try {
    // Tasks I posted
    const { data: posted } = await supabase
      .from('tasks')
      .select('*, poster:users!poster_id(display_name, profile_photo)')
      .eq('poster_id', req.user.id)
      .in('status', ['open', 'in_progress', 'completed'])
      .order('created_at', { ascending: false });

    // Tasks I was accepted for
    const { data: myApps } = await supabase
      .from('task_applications')
      .select('task_id, status')
      .eq('tasker_id', req.user.id)
      .in('status', ['accepted', 'completed']);

    let accepted = [];
    const acceptedTaskIds = (myApps || []).map((a) => a.task_id);
    if (acceptedTaskIds.length > 0) {
      const { data } = await supabase
        .from('tasks')
        .select('*, poster:users!poster_id(display_name, profile_photo)')
        .in('id', acceptedTaskIds)
        .order('created_at', { ascending: false });
      accepted = data || [];
    }

    const allTasks = [...(posted || []), ...accepted];
    const posterIds = [...new Set(allTasks.map((t) => t.poster_id))];
    const reviewMap = await buildReviewMap(posterIds);

    res.json({
      posted: (posted || []).map((t) => formatTaskSync(t, req.user.id, reviewMap)),
      accepted: accepted.map((t) => {
        const formatted = formatTaskSync(t, req.user.id, reviewMap);
        const app = myApps.find((a) => a.task_id === t.id);
        formatted.myApplication = app ? { status: app.status } : null;
        return formatted;
      }),
    });
  } catch (err) {
    console.error('My tasks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/:id — single task detail
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

    if (task.poster_id === req.user.id) {
      const { data: applicants } = await supabase
        .from('task_applications')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      result.applicants = await Promise.all(
        (applicants || []).map(async (a) => {
          const { data: u } = await supabase
            .from('users')
            .select('*')
            .eq('id', a.tasker_id)
            .maybeSingle();
          return {
            applicationId: a.id,
            status: a.status,
            createdAt: a.created_at,
            user: await formatUser(u),
          };
        })
      );
    }

    const { data: myApplication } = await supabase
      .from('task_applications')
      .select('id, status')
      .eq('task_id', task.id)
      .eq('tasker_id', req.user.id)
      .maybeSingle();

    result.myApplication = myApplication || null;

    res.json({ task: result });
  } catch (err) {
    console.error('Task detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks — create a new task
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

// PUT /api/tasks/:id — update a task
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

// DELETE /api/tasks/:id — cancel a task
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });

    const { data: accepted } = await supabase
      .from('task_applications')
      .select('tasker_id')
      .eq('task_id', task.id)
      .eq('status', 'accepted');

    for (const app of accepted || []) {
      await createNotification(
        app.tasker_id,
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

// POST /api/tasks/:id/apply
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'open') return res.status(400).json({ error: 'Task is no longer open' });
    if (task.poster_id === req.user.id)
      return res.status(400).json({ error: 'Cannot apply to your own task' });

    const { data: existing } = await supabase
      .from('task_applications')
      .select('id')
      .eq('task_id', task.id)
      .eq('tasker_id', req.user.id)
      .maybeSingle();

    if (existing) return res.status(409).json({ error: 'Already applied to this task' });

    const id = generateId();
    await supabase
      .from('task_applications')
      .insert({ id, task_id: task.id, tasker_id: req.user.id });

    await createNotification(
      task.poster_id,
      'new_applicant',
      'New Applicant',
      `${req.user.display_name} wants to do your task "${task.title}"`,
      { taskId: task.id, applicationId: id, applicantId: req.user.id }
    );

    res.status(201).json({ message: 'Application submitted', applicationId: id });
  } catch (err) {
    console.error('Task apply error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/accept/:applicationId
router.post('/:id/accept/:applicationId', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });

    const { data: application } = await supabase
      .from('task_applications')
      .select('*')
      .eq('id', req.params.applicationId)
      .eq('task_id', task.id)
      .maybeSingle();

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'pending')
      return res.status(400).json({ error: 'Application already processed' });

    if (task.helpers_accepted >= task.helpers_needed) {
      return res.status(400).json({ error: 'All helper slots are filled' });
    }

    await supabase
      .from('task_applications')
      .update({ status: 'accepted' })
      .eq('id', application.id);

    const newAccepted = (task.helpers_accepted || 0) + 1;
    const taskUpdates = { helpers_accepted: newAccepted };
    if (newAccepted >= task.helpers_needed) {
      taskUpdates.status = 'in_progress';
      taskUpdates.updated_at = new Date().toISOString();
    }
    await supabase.from('tasks').update(taskUpdates).eq('id', task.id);

    await createNotification(
      application.tasker_id,
      'application_accepted',
      'Application Accepted!',
      `Your application for "${task.title}" was accepted! Message them to coordinate.`,
      { taskId: task.id }
    );

    res.json({ message: 'Applicant accepted' });
  } catch (err) {
    console.error('Task accept error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/decline/:applicationId
router.post('/:id/decline/:applicationId', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });

    const { data: application } = await supabase
      .from('task_applications')
      .select('*')
      .eq('id', req.params.applicationId)
      .eq('task_id', task.id)
      .maybeSingle();

    if (!application) return res.status(404).json({ error: 'Application not found' });

    await supabase
      .from('task_applications')
      .update({ status: 'declined' })
      .eq('id', application.id);

    await createNotification(
      application.tasker_id,
      'application_declined',
      'Application Update',
      `Your application for "${task.title}" was not selected.`,
      { taskId: task.id }
    );

    res.json({ message: 'Applicant declined' });
  } catch (err) {
    console.error('Task decline error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/complete
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

    await supabase
      .from('tasks')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', task.id);

    await supabase
      .from('task_applications')
      .update({ status: 'completed' })
      .eq('task_id', task.id)
      .eq('status', 'accepted');

    const { data: accepted } = await supabase
      .from('task_applications')
      .select('tasker_id')
      .eq('task_id', task.id)
      .eq('status', 'completed');

    for (const app of accepted || []) {
      await createNotification(
        app.tasker_id,
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

// POST /api/tasks/:id/cancel-application
router.post('/:id/cancel-application', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { data: application } = await supabase
      .from('task_applications')
      .select('*')
      .eq('task_id', task.id)
      .eq('tasker_id', req.user.id)
      .maybeSingle();

    if (!application) return res.status(404).json({ error: 'No application found' });

    if (application.status === 'accepted') {
      const newAccepted = Math.max(0, (task.helpers_accepted || 0) - 1);
      const taskUpdates = { helpers_accepted: newAccepted };
      if (task.status === 'in_progress') {
        taskUpdates.status = 'open';
      }
      await supabase.from('tasks').update(taskUpdates).eq('id', task.id);

      await supabase
        .from('users')
        .update({ cancellation_count: (req.user.cancellation_count || 0) + 1 })
        .eq('id', req.user.id);

      await createNotification(
        task.poster_id,
        'tasker_cancelled',
        'Tasker Cancelled',
        `${req.user.display_name} cancelled on "${task.title}". The slot is open again.`,
        { taskId: task.id }
      );
    }

    await supabase.from('task_applications').delete().eq('id', application.id);
    res.json({ message: 'Application cancelled' });
  } catch (err) {
    console.error('Task cancel-application error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Batch-fetch review stats for a set of poster IDs in ONE query
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

function formatTaskSync(t, viewerId, reviewMap) {
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
    helpersAccepted: t.helpers_accepted,
    photos: typeof t.photos === 'string' ? JSON.parse(t.photos || '[]') : t.photos || [],
    status: t.status,
    university: t.university,
    createdAt: t.created_at,
    isOwner: t.poster_id === viewerId,
  };
}

// Single-task async version (used by detail/create/update endpoints)
async function formatTask(t, viewerId) {
  const reviewMap = await buildReviewMap([t.poster_id]);
  return formatTaskSync(t, viewerId, reviewMap);
}

module.exports = router;
