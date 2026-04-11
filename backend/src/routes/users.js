const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../database');
const { formatUser } = require('./auth');

const router = express.Router();

// GET /api/users/:id — view a user's public profile
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user: await formatUser(user) });
  } catch (err) {
    console.error('User profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
