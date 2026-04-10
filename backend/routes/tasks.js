const express = require('express');
const supabase = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = ['moving', 'tutoring', 'errands', 'tech_help', 'cleaning', 'delivery', 'other'];

// GET /api/tasks - list tasks with optional filters and sorting
router.get('/', auth, async (req, res) => {
  try {
    const { category, status = 'open', search, min_fee, max_fee, sort } = req.query;

    let query = supabase
      .from('tasks')
      .select('*, poster:users!poster_id!inner(name, university, rating)');

    if (status) query = query.eq('status', status);
    if (category && CATEGORIES.includes(category)) query = query.eq('category', category);
    if (min_fee) query = query.gte('fee', Number(min_fee));
    if (max_fee) query = query.lte('fee', Number(max_fee));

    // Only show tasks from the same university
    query = query.eq('poster.university', req.user.university);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Sorting
    switch (sort) {
      case 'fee_high':
        query = query.order('fee', { ascending: false });
        break;
      case 'fee_low':
        query = query.order('fee', { ascending: true });
        break;
      case 'deadline':
        query = query.order('due_date', { ascending: true, nullsFirst: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Tasks fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }

    // Flatten the poster object into the task for frontend compatibility
    const flat = (tasks || []).map(t => ({
      ...t,
      poster_name: t.poster?.name,
      poster_university: t.poster?.university,
      poster_rating: t.poster?.rating,
      poster: undefined
    }));

    res.json(flat);
  } catch (err) {
    console.error('Tasks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/:id - get task details
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*, poster:users!poster_id(name, email, university, rating, phone), acceptor:users!accepted_by(name, email, rating, phone)')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get reviews for this task
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, reviewer:users!reviewer_id(name)')
      .eq('task_id', req.params.id);

    // Flatten for frontend compatibility
    const flat = {
      ...task,
      poster_name: task.poster?.name,
      poster_email: task.poster?.email,
      poster_university: task.poster?.university,
      poster_rating: task.poster?.rating,
      poster_phone: task.poster?.phone,
      acceptor_name: task.acceptor?.name,
      acceptor_email: task.acceptor?.email,
      acceptor_rating: task.acceptor?.rating,
      acceptor_phone: task.acceptor?.phone,
      poster: undefined,
      acceptor: undefined,
      reviews: (reviews || []).map(r => ({
        ...r,
        reviewer_name: r.reviewer?.name,
        reviewer: undefined
      }))
    };

    res.json(flat);
  } catch (err) {
    console.error('Task detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks - create a task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, fee, location, due_date } = req.body;

    if (!title || !description || !category || fee == null) {
      return res.status(400).json({ error: 'Title, description, category, and fee are required' });
    }

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });
    }

    if (Number(fee) < 0) {
      return res.status(400).json({ error: 'Fee must be non-negative' });
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        poster_id: req.user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        fee: Number(fee),
        location: (location || '').trim(),
        due_date: due_date || null
      })
      .select()
      .single();

    if (error) {
      console.error('Task create error:', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }

    res.status(201).json(task);
  } catch (err) {
    console.error('Task create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id - update a task (only poster, only if open)
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

    const { title, description, category, fee, location, due_date } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (fee != null) updates.fee = fee;
    if (location !== undefined) updates.location = location;
    if (due_date !== undefined) updates.due_date = due_date;

    const { data: updated, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update task' });
    res.json(updated);
  } catch (err) {
    console.error('Task update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/accept - accept a task
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id === req.user.id) return res.status(400).json({ error: 'Cannot accept your own task' });
    if (task.status !== 'open') return res.status(400).json({ error: 'Task is no longer open' });

    const { data: updated, error } = await supabase
      .from('tasks')
      .update({
        status: 'accepted',
        accepted_by: req.user.id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to accept task' });
    res.json(updated);
  } catch (err) {
    console.error('Task accept error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/unaccept - release a task back to open
router.post('/:id/unaccept', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'accepted') return res.status(400).json({ error: 'Task is not in accepted state' });
    if (task.accepted_by !== req.user.id && task.poster_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the poster or acceptor can release this task' });
    }

    const { data: updated, error } = await supabase
      .from('tasks')
      .update({
        status: 'open',
        accepted_by: null,
        accepted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to release task' });
    res.json(updated);
  } catch (err) {
    console.error('Task unaccept error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/complete - mark task as completed (only poster)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Only the poster can mark as completed' });
    if (task.status !== 'accepted') return res.status(400).json({ error: 'Task must be accepted first' });

    const { data: updated, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to complete task' });
    res.json(updated);
  } catch (err) {
    console.error('Task complete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/cancel - cancel a task (only poster)
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.poster_id !== req.user.id) return res.status(403).json({ error: 'Only the poster can cancel' });
    if (task.status === 'completed') return res.status(400).json({ error: 'Cannot cancel a completed task' });

    const { data: updated, error } = await supabase
      .from('tasks')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to cancel task' });
    res.json(updated);
  } catch (err) {
    console.error('Task cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/review - leave a review after task completion
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'completed') return res.status(400).json({ error: 'Can only review completed tasks' });

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    let revieweeId;
    if (req.user.id === task.poster_id) {
      revieweeId = task.accepted_by;
    } else if (req.user.id === task.accepted_by) {
      revieweeId = task.poster_id;
    } else {
      return res.status(403).json({ error: 'Only task participants can leave reviews' });
    }

    // Check for existing review
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('task_id', req.params.id)
      .eq('reviewer_id', req.user.id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'You already reviewed this task' });
    }

    const { error: insertErr } = await supabase
      .from('reviews')
      .insert({
        task_id: Number(req.params.id),
        reviewer_id: req.user.id,
        reviewee_id: revieweeId,
        rating,
        comment: (comment || '').trim()
      });

    if (insertErr) {
      console.error('Review insert error:', insertErr);
      return res.status(500).json({ error: 'Failed to submit review' });
    }

    // Update user rating
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', revieweeId);

    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await supabase
      .from('users')
      .update({
        rating: Math.round(avg * 10) / 10,
        total_reviews: allReviews.length
      })
      .eq('id', revieweeId);

    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
