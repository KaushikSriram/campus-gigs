const express = require('express');
const auth = require('../middleware/auth');
const { all, get, run } = require('../database');
const { generateId, sanitize } = require('../utils/helpers');

const router = express.Router();

// POST /api/reviews — leave a review
router.post('/', auth, (req, res) => {
  const { taskId, revieweeId, rating, comment } = req.body;

  if (!taskId || !revieweeId || !rating) {
    return res.status(400).json({ error: 'taskId, revieweeId, and rating are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  // Verify task exists and is completed
  const task = get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.status !== 'completed') return res.status(400).json({ error: 'Can only review completed tasks' });

  // Verify reviewer was involved in the task
  const isPoster = task.poster_id === req.user.id;
  const isTasker = get(
    "SELECT id FROM task_applications WHERE task_id = ? AND tasker_id = ? AND status = 'completed'",
    [taskId, req.user.id]
  );
  if (!isPoster && !isTasker) {
    return res.status(403).json({ error: 'You were not involved in this task' });
  }

  // Verify reviewee was involved
  const revieweeIsPoster = task.poster_id === revieweeId;
  const revieweeIsTasker = get(
    "SELECT id FROM task_applications WHERE task_id = ? AND tasker_id = ? AND status = 'completed'",
    [taskId, revieweeId]
  );
  if (!revieweeIsPoster && !revieweeIsTasker) {
    return res.status(400).json({ error: 'Reviewee was not involved in this task' });
  }

  // Check for existing review
  const existing = get(
    'SELECT id FROM reviews WHERE task_id = ? AND reviewer_id = ?',
    [taskId, req.user.id]
  );
  if (existing) return res.status(409).json({ error: 'You already reviewed this task' });

  const id = generateId();
  run(
    'INSERT INTO reviews (id, task_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, req.user.id, revieweeId, parseInt(rating), sanitize(comment || '')]
  );

  const review = get('SELECT * FROM reviews WHERE id = ?', [id]);
  res.status(201).json({
    review: {
      id: review.id,
      taskId: review.task_id,
      reviewerId: review.reviewer_id,
      revieweeId: review.reviewee_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    },
  });
});

// GET /api/reviews/user/:userId — get reviews for a user
router.get('/user/:userId', auth, (req, res) => {
  const reviews = all(
    `SELECT r.*, u.display_name as reviewer_name, u.profile_photo as reviewer_photo,
            t.title as task_title
     FROM reviews r
     JOIN users u ON r.reviewer_id = u.id
     JOIN tasks t ON r.task_id = t.id
     WHERE r.reviewee_id = ?
     ORDER BY r.created_at DESC`,
    [req.params.userId]
  );

  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    ratingBreakdown[r.rating] = (ratingBreakdown[r.rating] || 0) + 1;
  });

  res.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      taskTitle: r.task_title,
      reviewerName: r.reviewer_name,
      reviewerPhoto: r.reviewer_photo,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    })),
    ratingBreakdown,
  });
});

// GET /api/reviews/pending — get tasks I need to review
router.get('/pending', auth, (req, res) => {
  // Tasks I completed as tasker where I haven't reviewed the poster
  const asTasker = all(
    `SELECT t.id as task_id, t.title, t.poster_id as reviewee_id, u.display_name as reviewee_name
     FROM task_applications ta
     JOIN tasks t ON ta.task_id = t.id
     JOIN users u ON t.poster_id = u.id
     WHERE ta.tasker_id = ? AND ta.status = 'completed'
       AND t.id NOT IN (SELECT task_id FROM reviews WHERE reviewer_id = ?)`,
    [req.user.id, req.user.id]
  );

  // Tasks I posted that are completed where I haven't reviewed the tasker
  const asPoster = all(
    `SELECT t.id as task_id, t.title, ta.tasker_id as reviewee_id, u.display_name as reviewee_name
     FROM tasks t
     JOIN task_applications ta ON ta.task_id = t.id
     JOIN users u ON ta.tasker_id = u.id
     WHERE t.poster_id = ? AND t.status = 'completed' AND ta.status = 'completed'
       AND t.id NOT IN (SELECT task_id FROM reviews WHERE reviewer_id = ? AND reviewee_id = ta.tasker_id)`,
    [req.user.id, req.user.id]
  );

  res.json({ pending: [...asTasker, ...asPoster] });
});

module.exports = router;
