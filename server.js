require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// Handle blog subdomain routing (like bearblog)
app.get('/', (req, res) => {
  const host = req.get('host');
  const subdomain = host.split('.')[0];
  
  // If it's a subdomain (not main site), show that user's blog
  if (subdomain !== 'localhost' && subdomain !== host) {
    res.sendFile(path.join(__dirname, 'public', 'blog.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Fallback routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Check if it's a post slug
  if (req.path.match(/^\/[a-zA-Z0-9-]+$/)) {
    res.sendFile(path.join(__dirname, 'public', 'post.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, () => console.log(` Blog running at http://localhost:${PORT}`));