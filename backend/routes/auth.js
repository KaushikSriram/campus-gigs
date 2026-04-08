const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, name, university } = req.body;

  if (!email || !password || !name || !university) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!email.endsWith('.edu')) {
    return res.status(400).json({ error: 'Must use a valid .edu email address' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password, name, university) VALUES (?, ?, ?, ?)'
  ).run(email, hash, name.trim(), university.trim());

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, university },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, email, name: name.trim(), university: university.trim() }
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, university: user.university },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      university: user.university,
      bio: user.bio,
      phone: user.phone,
      rating: user.rating,
      total_reviews: user.total_reviews
    }
  });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, university, bio, phone, rating, total_reviews, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

module.exports = router;
