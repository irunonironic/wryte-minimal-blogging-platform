const express = require('express');
const db = require('../db/db');
const router = express.Router();

// Middleware to require auth
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

// Create a new post
router.post('/', requireAuth, async (req, res) => {
  const { title, content, published } = req.body;
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  try {
    const result = await db.query(
      `INSERT INTO posts (user_id, title, slug, content, published) 
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.session.userId, title, slug, content, published || false]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'DB error' });
  }
});

// Read all published posts
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.username
       FROM posts p 
       JOIN users u ON p.user_id = u.id
       WHERE p.published=true 
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});


// Read a single post
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.username
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id=$1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Update a post
router.put('/:id', requireAuth, async (req, res) => {
  const { title, content, published } = req.body;
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  try {
    const result = await db.query(
      `UPDATE posts SET title=$1, slug=$2, content=$3, published=$4, updated_at=NOW()
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [title, slug, content, published, req.params.id, req.session.userId]
    );
    if (!result.rows[0]) return res.status(403).json({ error: 'Not allowed' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'DB error' });
  }
});

// Delete a post
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM posts WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.session.userId]
    );
    if (!result.rows[0]) return res.status(403).json({ error: 'Not allowed or post not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upvote a post (anonymous, using IP)
router.post('/:id/upvote', async (req, res) => {
  const postId = req.params.id;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // Insert vote or skip if already voted
    const result = await db.query(
      `INSERT INTO post_votes (post_id, ip_address)
       VALUES ($1, $2)
       ON CONFLICT (post_id, ip_address) DO NOTHING RETURNING id`,
      [postId, ip]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'You have already voted' });
    }

    // Count total votes
    const votesRes = await db.query(
      'SELECT COUNT(*) FROM post_votes WHERE post_id=$1',
      [postId]
    );
    const totalVotes = parseInt(votesRes.rows[0].count, 10);

    res.json({ success: true, votes: totalVotes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;
