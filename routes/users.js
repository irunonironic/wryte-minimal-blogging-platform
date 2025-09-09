const express = require('express');
const db = require('../db/db');
const router = express.Router();

// Get user profile and their published posts
router.get('/:username', async (req, res) => {
  const result = await db.query('SELECT id, username,  bio FROM users WHERE username=$1', [req.params.username]);
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

  const posts = await db.query(
    'SELECT * FROM posts WHERE user_id=$1 AND published=true ORDER BY created_at DESC',
    [result.rows[0].id]
  );

  res.json({ user: result.rows[0], posts: posts.rows });
});

// Update logged-in user profile
router.put('/me', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { bio } = req.body;

  try {
    const result = await db.query(
      `UPDATE users 
       SET bio = $1 
       WHERE id = $2 
       RETURNING id, username, bio`,
      [bio, userId]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'DB error' });
  }
});





module.exports = router;
