const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:id - get public profile
router.get('/:id', auth, (req, res) => {
  const user = db.prepare(
    'SELECT id, name, university, bio, rating, total_reviews, created_at FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const posted = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE poster_id = ?').get(req.params.id);
  const completed = db.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE (poster_id = ? OR accepted_by = ?) AND status = ?'
  ).get(req.params.id, req.params.id, 'completed');
  const helped = db.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE accepted_by = ? AND status = ?'
  ).get(req.params.id, 'completed');

  res.json({
    ...user,
    tasks_posted: posted.count,
    tasks_completed: completed.count,
    tasks_helped: helped.count
  });
});

// PUT /api/users/profile - update own profile
router.put('/profile', auth, (req, res) => {
  const { name, bio, phone, password, university } = req.body;

  if (password && password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const updates = [];
  const params = [];

  if (name) { updates.push('name = ?'); params.push(name.trim()); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio.trim()); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone.trim()); }
  if (university) { updates.push('university = ?'); params.push(university.trim()); }
  if (password) { updates.push('password = ?'); params.push(bcrypt.hashSync(password, 10)); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare(
    'SELECT id, email, name, university, bio, phone, rating, total_reviews, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json(user);
});

// GET /api/users/:id/reviews - get reviews for a user
router.get('/:id/reviews', auth, (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.name AS reviewer_name, t.title AS task_title
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    JOIN tasks t ON r.task_id = t.id
    WHERE r.reviewee_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);

  res.json(reviews);
});

module.exports = router;
