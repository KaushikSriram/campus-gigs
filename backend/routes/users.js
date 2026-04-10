const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:id - get public profile
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, university, bio, rating, total_reviews, created_at')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!user) return res.status(404).json({ error: 'User not found' });

    const { count: posted } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('poster_id', req.params.id);

    const { count: completed } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .or(`poster_id.eq.${req.params.id},accepted_by.eq.${req.params.id}`)
      .eq('status', 'completed');

    const { count: helped } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('accepted_by', req.params.id)
      .eq('status', 'completed');

    res.json({
      ...user,
      tasks_posted: posted || 0,
      tasks_completed: completed || 0,
      tasks_helped: helped || 0
    });
  } catch (err) {
    console.error('User profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/profile - update own profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio, phone, password, university } = req.body;

    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (university) updates.university = university.trim();
    if (password) updates.password = bcrypt.hashSync(password, 10);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id);

    if (error) return res.status(500).json({ error: 'Failed to update profile' });

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, university, bio, phone, rating, total_reviews, created_at')
      .eq('id', req.user.id)
      .single();

    res.json(user);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/reviews - get reviews for a user
router.get('/:id/reviews', auth, async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*, reviewer:users!reviewer_id(name), task:tasks!task_id(title)')
      .eq('reviewee_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch reviews' });

    // Flatten for frontend compatibility
    const flat = (reviews || []).map(r => ({
      ...r,
      reviewer_name: r.reviewer?.name,
      task_title: r.task?.title,
      reviewer: undefined,
      task: undefined
    }));

    res.json(flat);
  } catch (err) {
    console.error('Reviews error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
