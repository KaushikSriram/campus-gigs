const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../database');
const { generateId, sanitize } = require('../utils/helpers');

const router = express.Router();

// POST /api/reviews — leave a review
router.post('/', auth, async (req, res) => {
  try {
    const { taskId, revieweeId, rating, comment } = req.body;

    if (!taskId || !revieweeId || !rating) {
      return res.status(400).json({ error: 'taskId, revieweeId, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'completed')
      return res.status(400).json({ error: 'Can only review completed tasks' });

    const isPoster = task.poster_id === req.user.id;
    const { data: isTasker } = await supabase
      .from('task_applications')
      .select('id')
      .eq('task_id', taskId)
      .eq('tasker_id', req.user.id)
      .eq('status', 'completed')
      .maybeSingle();

    if (!isPoster && !isTasker) {
      return res.status(403).json({ error: 'You were not involved in this task' });
    }

    const revieweeIsPoster = task.poster_id === revieweeId;
    const { data: revieweeIsTasker } = await supabase
      .from('task_applications')
      .select('id')
      .eq('task_id', taskId)
      .eq('tasker_id', revieweeId)
      .eq('status', 'completed')
      .maybeSingle();

    if (!revieweeIsPoster && !revieweeIsTasker) {
      return res.status(400).json({ error: 'Reviewee was not involved in this task' });
    }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('task_id', taskId)
      .eq('reviewer_id', req.user.id)
      .maybeSingle();

    if (existing) return res.status(409).json({ error: 'You already reviewed this task' });

    const id = generateId();
    await supabase.from('reviews').insert({
      id,
      task_id: taskId,
      reviewer_id: req.user.id,
      reviewee_id: revieweeId,
      rating: parseInt(rating),
      comment: sanitize(comment || ''),
    });

    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .maybeSingle();

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
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reviews/user/:userId — get reviews for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { data: reviews } = await supabase
      .from('reviews')
      .select(
        '*, reviewer:users!reviewer_id(display_name, profile_photo), task:tasks!task_id(title)'
      )
      .eq('reviewee_id', req.params.userId)
      .order('created_at', { ascending: false });

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (reviews || []).forEach((r) => {
      ratingBreakdown[r.rating] = (ratingBreakdown[r.rating] || 0) + 1;
    });

    res.json({
      reviews: (reviews || []).map((r) => ({
        id: r.id,
        taskId: r.task_id,
        taskTitle: r.task?.title,
        reviewerName: r.reviewer?.display_name,
        reviewerPhoto: r.reviewer?.profile_photo,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
      })),
      ratingBreakdown,
    });
  } catch (err) {
    console.error('Reviews fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reviews/pending — get tasks I need to review
router.get('/pending', auth, async (req, res) => {
  try {
    // Tasks I completed as tasker where I haven't reviewed the poster
    const { data: myCompletedApps } = await supabase
      .from('task_applications')
      .select('task_id, tasks(id, title, poster_id, status)')
      .eq('tasker_id', req.user.id)
      .eq('status', 'completed');

    const { data: myReviews } = await supabase
      .from('reviews')
      .select('task_id, reviewee_id')
      .eq('reviewer_id', req.user.id);

    const reviewedSet = new Set((myReviews || []).map((r) => `${r.task_id}-${r.reviewee_id}`));

    const asTasker = [];
    for (const app of myCompletedApps || []) {
      const task = app.tasks;
      if (!task || task.status !== 'completed') continue;
      if (reviewedSet.has(`${task.id}-${task.poster_id}`)) continue;

      const { data: poster } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', task.poster_id)
        .maybeSingle();

      asTasker.push({
        task_id: task.id,
        title: task.title,
        reviewee_id: task.poster_id,
        reviewee_name: poster?.display_name,
      });
    }

    // Tasks I posted that are completed where I haven't reviewed the taskers
    const { data: myCompletedTasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('poster_id', req.user.id)
      .eq('status', 'completed');

    const asPoster = [];
    for (const task of myCompletedTasks || []) {
      const { data: completedApps } = await supabase
        .from('task_applications')
        .select('tasker_id')
        .eq('task_id', task.id)
        .eq('status', 'completed');

      for (const app of completedApps || []) {
        if (reviewedSet.has(`${task.id}-${app.tasker_id}`)) continue;

        const { data: tasker } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', app.tasker_id)
          .maybeSingle();

        asPoster.push({
          task_id: task.id,
          title: task.title,
          reviewee_id: app.tasker_id,
          reviewee_name: tasker?.display_name,
        });
      }
    }

    res.json({ pending: [...asTasker, ...asPoster] });
  } catch (err) {
    console.error('Pending reviews error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
