const express = require('express');
const auth = require('../middleware/auth');
const { get } = require('../database');
const { formatUser } = require('./auth');

const router = express.Router();

// GET /api/users/:id — view a user's public profile
router.get('/:id', auth, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ user: formatUser(user) });
});

module.exports = router;
