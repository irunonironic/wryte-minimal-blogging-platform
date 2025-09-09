require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const pgSession = require('connect-pg-simple')(session);
const app = express();
const PORT = process.env.PORT ;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1); 

app.use(
  session({
    store: new pgSession({
      pool: pool,               
      tableName: 'session'      
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', 
      httpOnly: true,
      sameSite: 'none', 
      maxAge: 24 * 60 * 60 * 1000 
    }
  })
);


// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);


app.get('/', (req, res) => {
  const host = req.get('host');
  const subdomain = host.split('.')[0];
  

  if (subdomain !== 'my-main-domain.com' && subdomain !== host) {
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
  
  
  if (req.path.match(/^\/[a-zA-Z0-9-]+$/)) {
    res.sendFile(path.join(__dirname, 'public', 'post.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, () => console.log(` Blog running at http://localhost:${PORT}`));