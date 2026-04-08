const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = ['moving', 'tutoring', 'errands', 'tech_help', 'cleaning', 'delivery', 'other'];

// GET /api/tasks - list tasks with optional filters
router.get('/', auth, (req, res) => {
  const { category, status = 'open', search, min_fee, max_fee } = req.query;

  let query = `
    SELECT t.*, u.name AS poster_name, u.university AS poster_university, u.rating AS poster_rating
    FROM tasks t
    JOIN users u ON t.poster_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (category && CATEGORIES.includes(category)) {
    query += ' AND t.category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (min_fee) {
    query += ' AND t.fee >= ?';
    params.push(Number(min_fee));
  }

  if (max_fee) {
    query += ' AND t.fee <= ?';
    params.push(Number(max_fee));
  }

  // Only show tasks from the same university
  query += ' AND u.university = ?';
  params.push(req.user.university);

  query += ' ORDER BY t.created_at DESC';

  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});

// GET /api/tasks/:id - get task details
router.get('/:id', auth, (req, res) => {
  const task = db.prepare(`
    SELECT t.*,
      poster.name AS poster_name, poster.email AS poster_email,
      poster.university AS poster_university, poster.rating AS poster_rating,
      poster.phone AS poster_phone,
      acceptor.name AS acceptor_name, acceptor.email AS acceptor_email,
      acceptor.rating AS acceptor_rating, acceptor.phone AS acceptor_phone
    FROM tasks t
    JOIN users poster ON t.poster_id = poster.id
    LEFT JOIN users acceptor ON t.accepted_by = acceptor.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Get reviews for this task
  const reviews = db.prepare(`
    SELECT r.*, u.name AS reviewer_name
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.task_id = ?
  `).all(req.params.id);

  res.json({ ...task, reviews });
});

// POST /api/tasks - create a task
router.post('/', auth, (req, res) => {
  const { title, description, category, fee, location } = req.body;

  if (!title || !description || !category || fee == null) {
    return res.status(400).json({ error: 'Title, description, category, and fee are required' });
  }

  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });
  }

  if (Number(fee) < 0) {
    return res.status(400).json({ error: 'Fee must be non-negative' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (poster_id, title, description, category, fee, location)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, title.trim(), description.trim(), category, Number(fee), (location || '').trim());

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/tasks/:id - update a task (only poster, only if open)
router.put('/:id', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });
  if (task.status !== 'open') return res.status(400).json({ error: 'Can only edit open tasks' });

  const { title, description, category, fee, location } = req.body;

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      category = COALESCE(?, category),
      fee = COALESCE(?, fee),
      location = COALESCE(?, location),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, category, fee, location, req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/tasks/:id/accept - accept a task
router.post('/:id/accept', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.poster_id === req.user.id) return res.status(400).json({ error: 'Cannot accept your own task' });
  if (task.status !== 'open') return res.status(400).json({ error: 'Task is no longer open' });

  db.prepare(`
    UPDATE tasks SET status = 'accepted', accepted_by = ?, accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user.id, req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/tasks/:id/complete - mark task as completed (only poster)
router.post('/:id/complete', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Only the poster can mark as completed' });
  if (task.status !== 'accepted') return res.status(400).json({ error: 'Task must be accepted first' });

  db.prepare(`
    UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/tasks/:id/cancel - cancel a task (only poster)
router.post('/:id/cancel', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Only the poster can cancel' });
  if (task.status === 'completed') return res.status(400).json({ error: 'Cannot cancel a completed task' });

  db.prepare(`
    UPDATE tasks SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/tasks/:id/review - leave a review after task completion
router.post('/:id/review', auth, (req, res) => {
  const { rating, comment } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.status !== 'completed') return res.status(400).json({ error: 'Can only review completed tasks' });

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  // Determine who is being reviewed
  let revieweeId;
  if (req.user.id === task.poster_id) {
    revieweeId = task.accepted_by; // poster reviews the helper
  } else if (req.user.id === task.accepted_by) {
    revieweeId = task.poster_id; // helper reviews the poster
  } else {
    return res.status(403).json({ error: 'Only task participants can leave reviews' });
  }

  const existing = db.prepare(
    'SELECT id FROM reviews WHERE task_id = ? AND reviewer_id = ?'
  ).get(req.params.id, req.user.id);

  if (existing) {
    return res.status(409).json({ error: 'You already reviewed this task' });
  }

  db.prepare(
    'INSERT INTO reviews (task_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.id, req.user.id, revieweeId, rating, (comment || '').trim());

  // Update reviewee's average rating
  const stats = db.prepare(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE reviewee_id = ?'
  ).get(revieweeId);

  db.prepare(
    'UPDATE users SET rating = ?, total_reviews = ? WHERE id = ?'
  ).run(Math.round(stats.avg_rating * 10) / 10, stats.count, revieweeId);

  res.status(201).json({ message: 'Review submitted' });
});

module.exports = router;
