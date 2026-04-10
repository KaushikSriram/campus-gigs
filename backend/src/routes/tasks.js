const express = require('express');
const auth = require('../middleware/auth');
const { all, get, run } = require('../database');
const { generateId, CATEGORIES, moderateContent, sanitize } = require('../utils/helpers');
const { formatUser } = require('./auth');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// GET /api/tasks — campus task feed
router.get('/', auth, (req, res) => {
  const { category, minPay, maxPay, date, sort, search, status } = req.query;

  let sql = `
    SELECT t.*, u.display_name as poster_name, u.profile_photo as poster_photo
    FROM tasks t
    JOIN users u ON t.poster_id = u.id
    WHERE t.university = ?
  `;
  const params = [req.user.university];

  // Filter out tasks from blocked users
  sql += ` AND t.poster_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`;
  params.push(req.user.id);

  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  } else {
    sql += " AND t.status = 'open'";
  }

  if (category && CATEGORIES.includes(category)) {
    sql += ' AND t.category = ?';
    params.push(category);
  }

  if (minPay) {
    sql += ' AND t.offered_pay >= ?';
    params.push(parseFloat(minPay));
  }

  if (maxPay) {
    sql += ' AND t.offered_pay <= ?';
    params.push(parseFloat(maxPay));
  }

  if (date) {
    sql += ' AND date(t.date_time) = date(?)';
    params.push(date);
  }

  if (search) {
    sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term);
  }

  // Sort
  switch (sort) {
    case 'pay_high':
      sql += ' ORDER BY t.offered_pay DESC';
      break;
    case 'pay_low':
      sql += ' ORDER BY t.offered_pay ASC';
      break;
    case 'soonest':
      sql += ' ORDER BY t.date_time ASC';
      break;
    default:
      sql += ' ORDER BY t.created_at DESC';
  }

  sql += ' LIMIT 50';

  const tasks = all(sql, params);

  const formatted = tasks.map((t) => formatTask(t, req.user.id));
  res.json({ tasks: formatted });
});

// GET /api/tasks/:id — single task detail
router.get('/:id', auth, (req, res) => {
  const task = get(
    `SELECT t.*, u.display_name as poster_name, u.profile_photo as poster_photo
     FROM tasks t JOIN users u ON t.poster_id = u.id
     WHERE t.id = ?`,
    [req.params.id]
  );

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const result = formatTask(task, req.user.id);

  // If the viewer is the poster, include applicants
  if (task.poster_id === req.user.id) {
    const applicants = all(
      `SELECT ta.*, u.display_name, u.profile_photo, u.bio
       FROM task_applications ta
       JOIN users u ON ta.tasker_id = u.id
       WHERE ta.task_id = ?
       ORDER BY ta.created_at ASC`,
      [task.id]
    );
    result.applicants = applicants.map((a) => ({
      applicationId: a.id,
      status: a.status,
      createdAt: a.created_at,
      user: formatUser(get('SELECT * FROM users WHERE id = ?', [a.tasker_id])),
    }));
  }

  // Check if current user has applied
  const myApplication = get(
    'SELECT * FROM task_applications WHERE task_id = ? AND tasker_id = ?',
    [task.id, req.user.id]
  );
  result.myApplication = myApplication
    ? { id: myApplication.id, status: myApplication.status }
    : null;

  res.json({ task: result });
});

// POST /api/tasks — create a new task
router.post('/', auth, (req, res) => {
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

  // Content moderation
  const titleCheck = moderateContent(title);
  if (!titleCheck.ok) return res.status(400).json({ error: titleCheck.reason });
  const descCheck = moderateContent(description);
  if (!descCheck.ok) return res.status(400).json({ error: descCheck.reason });

  const id = generateId();
  run(
    `INSERT INTO tasks (id, poster_id, title, category, description, location, date_time, date_type, estimated_duration, offered_pay, helpers_needed, photos, university)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      req.user.id,
      sanitize(title),
      category,
      sanitize(description),
      sanitize(location),
      dateTime,
      dateType || 'specific',
      estimatedDuration || '',
      parseFloat(offeredPay),
      parseInt(helpersNeeded) || 1,
      JSON.stringify(photos || []),
      req.user.university,
    ]
  );

  const task = get(
    `SELECT t.*, u.display_name as poster_name, u.profile_photo as poster_photo
     FROM tasks t JOIN users u ON t.poster_id = u.id WHERE t.id = ?`,
    [id]
  );

  res.status(201).json({ task: formatTask(task, req.user.id) });
});

// PUT /api/tasks/:id — update a task
router.put('/:id', auth, (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });
  if (task.status !== 'open') return res.status(400).json({ error: 'Can only edit open tasks' });

  const { title, category, description, location, dateTime, estimatedDuration, offeredPay, helpersNeeded, photos } = req.body;

  const updates = [];
  const params = [];

  if (title !== undefined) {
    const check = moderateContent(title);
    if (!check.ok) return res.status(400).json({ error: check.reason });
    updates.push('title = ?');
    params.push(sanitize(title));
  }
  if (category !== undefined) {
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
    updates.push('category = ?');
    params.push(category);
  }
  if (description !== undefined) {
    const check = moderateContent(description);
    if (!check.ok) return res.status(400).json({ error: check.reason });
    updates.push('description = ?');
    params.push(sanitize(description));
  }
  if (location !== undefined) { updates.push('location = ?'); params.push(sanitize(location)); }
  if (dateTime !== undefined) { updates.push('date_time = ?'); params.push(dateTime); }
  if (estimatedDuration !== undefined) { updates.push('estimated_duration = ?'); params.push(estimatedDuration); }
  if (offeredPay !== undefined) { updates.push('offered_pay = ?'); params.push(parseFloat(offeredPay)); }
  if (helpersNeeded !== undefined) { updates.push('helpers_needed = ?'); params.push(parseInt(helpersNeeded)); }
  if (photos !== undefined) { updates.push('photos = ?'); params.push(JSON.stringify(photos)); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);

  const updated = get(
    `SELECT t.*, u.display_name as poster_name, u.profile_photo as poster_photo
     FROM tasks t JOIN users u ON t.poster_id = u.id WHERE t.id = ?`,
    [req.params.id]
  );
  res.json({ task: formatTask(updated, req.user.id) });
});

// DELETE /api/tasks/:id — delete (cancel) a task
router.delete('/:id', auth, (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });

  // Notify accepted taskers
  const accepted = all(
    "SELECT tasker_id FROM task_applications WHERE task_id = ? AND status = 'accepted'",
    [task.id]
  );
  for (const app of accepted) {
    createNotification(app.tasker_id, 'task_cancelled', 'Task Cancelled', `The task "${task.title}" has been cancelled by the poster.`, { taskId: task.id });
  }

  run("UPDATE tasks SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [task.id]);
  run("UPDATE users SET cancellation_count = cancellation_count + 1 WHERE id = ?", [req.user.id]);

  res.json({ message: 'Task cancelled' });
});

// POST /api/tasks/:id/apply — apply to do a task
router.post('/:id/apply', auth, (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.status !== 'open') return res.status(400).json({ error: 'Task is no longer open' });
  if (task.poster_id === req.user.id) return res.status(400).json({ error: 'Cannot apply to your own task' });

  const existing = get(
    'SELECT * FROM task_applications WHERE task_id = ? AND tasker_id = ?',
    [task.id, req.user.id]
  );
  if (existing) return res.status(409).json({ error: 'Already applied to this task' });

  const id = generateId();
  run(
    'INSERT INTO task_applications (id, task_id, tasker_id) VALUES (?, ?, ?)',
    [id, task.id, req.user.id]
  );

  createNotification(
    task.poster_id,
    'new_applicant',
    'New Applicant',
    `${req.user.display_name} wants to do your task "${task.title}"`,
    { taskId: task.id, applicationId: id, applicantId: req.user.id }
  );

  res.status(201).json({ message: 'Application submitted', applicationId: id });
});

// POST /api/tasks/:id/accept/:applicationId — accept an applicant
router.post('/:id/accept/:applicationId', auth, (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });

  const application = get('SELECT * FROM task_applications WHERE id = ? AND task_id = ?', [req.params.applicationId, task.id]);
  if (!application) return res.status(404).json({ error: 'Application not found' });
  if (application.status !== 'pending') return res.status(400).json({ error: 'Application already processed' });

  if (task.helpers_accepted >= task.helpers_needed) {
    return res.status(400).json({ error: 'All helper slots are filled' });
  }

  run("UPDATE task_applications SET status = 'accepted' WHERE id = ?", [application.id]);
  run('UPDATE tasks SET helpers_accepted = helpers_accepted + 1 WHERE id = ?', [task.id]);

  // Check if all slots filled
  const updated = get('SELECT * FROM tasks WHERE id = ?', [task.id]);
  if (updated.helpers_accepted >= updated.helpers_needed) {
    run("UPDATE tasks SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?", [task.id]);
  }

  createNotification(
    application.tasker_id,
    'application_accepted',
    'Application Accepted!',
    `Your application for "${task.title}" was accepted! Message them to coordinate.`,
    { taskId: task.id }
  );

  res.json({ message: 'Applicant accepted' });
});

// POST /api/tasks/:id/decline/:applicationId — decline an applicant
router.post('/:id/decline/:applicationId', auth, (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });

  const application = get('SELECT * FROM task_applications WHERE id = ? AND task_id = ?', [req.params.applicationId, task.id]);
  if (!application) return res.status(404).json({ error: 'Application not found' });

  run("UPDATE task_applications SET status = 'declined' WHERE id = ?", [application.id]);

  createNotification(
    application.tasker_id,
    'application_declined',
    'Application Update',
    `Your application for "${task.title}" was not selected.`,
    { taskId: task.id }
  );

  res.json({ message: 'Applicant declined' });
});

// POST /api/tasks/:id/complete — mark task as complete
router.post('/:id/complete', auth, (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Only the poster can mark as complete' });
  if (task.status === 'completed') return res.status(400).json({ error: 'Task already completed' });

  run("UPDATE tasks SET status = 'completed', updated_at = datetime('now') WHERE id = ?", [task.id]);
  run("UPDATE task_applications SET status = 'completed' WHERE task_id = ? AND status = 'accepted'", [task.id]);

  // Notify taskers
  const accepted = all(
    "SELECT tasker_id FROM task_applications WHERE task_id = ? AND status = 'completed'",
    [task.id]
  );
  for (const app of accepted) {
    createNotification(
      app.tasker_id,
      'task_completed',
      'Task Completed!',
      `"${task.title}" has been marked as complete. Rate your experience!`,
      { taskId: task.id }
    );
  }

  res.json({ message: 'Task marked as complete' });
});

// POST /api/tasks/:id/cancel-application — tasker cancels their application
router.post('/:id/cancel-application', auth, (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const application = get(
    'SELECT * FROM task_applications WHERE task_id = ? AND tasker_id = ?',
    [task.id, req.user.id]
  );
  if (!application) return res.status(404).json({ error: 'No application found' });

  if (application.status === 'accepted') {
    run('UPDATE tasks SET helpers_accepted = MAX(0, helpers_accepted - 1) WHERE id = ?', [task.id]);
    // If task was in_progress, revert to open
    const updated = get('SELECT * FROM tasks WHERE id = ?', [task.id]);
    if (updated.status === 'in_progress') {
      run("UPDATE tasks SET status = 'open' WHERE id = ?", [task.id]);
    }
    run("UPDATE users SET cancellation_count = cancellation_count + 1 WHERE id = ?", [req.user.id]);

    createNotification(
      task.poster_id,
      'tasker_cancelled',
      'Tasker Cancelled',
      `${req.user.display_name} cancelled on "${task.title}". The slot is open again.`,
      { taskId: task.id }
    );
  }

  run('DELETE FROM task_applications WHERE id = ?', [application.id]);
  res.json({ message: 'Application cancelled' });
});

function formatTask(t, viewerId) {
  // Get poster rating
  const posterRating = get(
    'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE reviewee_id = ?',
    [t.poster_id]
  );

  return {
    id: t.id,
    posterId: t.poster_id,
    posterName: t.poster_name || t.display_name,
    posterPhoto: t.poster_photo || t.profile_photo,
    posterRating: posterRating?.avg ? Math.round(posterRating.avg * 10) / 10 : null,
    posterReviewCount: posterRating?.count || 0,
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
    photos: JSON.parse(t.photos || '[]'),
    status: t.status,
    university: t.university,
    createdAt: t.created_at,
    isOwner: t.poster_id === viewerId,
  };
}

module.exports = router;
