const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/db');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, email, password} = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash) 
       VALUES ($1,$2,$3) RETURNING id, username`,
      [username, email, hash, blog_title]
    );
    req.session.userId = result.rows[0].id;
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: 'User exists or DB error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await db.query('SELECT * FROM users WHERE username=$1', [username]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  res.json({ success: true, user: { id: user.id, username: user.username } });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// Current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const result = await db.query('SELECT id, username,  bio FROM users WHERE id=$1', [req.session.userId]);
  res.json(result.rows[0]);
});

module.exports = router;
