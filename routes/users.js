const express = require('express');
const db = require('../db/db');
const router = express.Router();

// Middleware 
const requireAuth = (req, res, next) => {
  // Check both possible session structures
  const userId = req.session?.userId || req.session?.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  // Attach userId to request for easy access
  req.userId = userId;
  next();
};

// Get current user info (for checking login status)
router.get('/me', (req, res) => {
  const userId = req.session?.userId || req.session?.user?.id;
  const user = req.session?.user;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  if (user) {
    return res.json({ user });
  }
  
  // Otherwise, fetch from database
  db.query('SELECT id, username, bio FROM users WHERE id=$1', [userId])
    .then(result => {
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user: result.rows[0] });
    })
    .catch(err => {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
    });
});

// Get user profile and their published posts
router.get('/:username', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, bio FROM users WHERE username=$1', 
      [req.params.username]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const posts = await db.query(
      'SELECT * FROM posts WHERE user_id=$1 AND published=true ORDER BY created_at DESC',
      [result.rows[0].id]
    );

    res.json({ user: result.rows[0], posts: posts.rows });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update logged-in user profile
router.put('/me', requireAuth, async (req, res) => {
  const { bio } = req.body;

  try {
    const result = await db.query(
      `UPDATE users 
       SET bio = $1 
       WHERE id = $2 
       RETURNING id, username, bio`,
      [bio, req.userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;