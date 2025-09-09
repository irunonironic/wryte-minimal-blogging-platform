require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const pool = require('./db/db');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const pgSession = require('connect-pg-simple')(session);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1); 

// SESSION CONFIGURATION FOR PRODUCTION
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    secure: process.env.NODE_ENV === "production", // true in production with HTTPS
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "none" for production if cross-origin needed
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// SIMPLIFIED HOME ROUTE (no subdomain logic)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback routes
app.get('*', (req, res) => {
  // API routes that don't exist
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Post routes (like /post-slug)
  if (req.path.match(/^\/[a-zA-Z0-9-]+$/)) {
    res.sendFile(path.join(__dirname, 'public', 'post.html'));
  } else {
    // All other routes go to index
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(` wryte server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});