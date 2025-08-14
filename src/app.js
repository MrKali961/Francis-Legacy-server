const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const blogRoutes = require('./routes/blog');
const newsRoutes = require('./routes/news');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const timelineRoutes = require('./routes/timeline');
const archiveRoutes = require('./routes/archives');

const app = express();

// Security middleware - enhanced for production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - more restrictive for production
const isProduction = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 50 : 1000, // much higher limit for development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip rate limiting for preflight requests
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 100, // more permissive for development
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  }
});

// CORS configuration - environment specific
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:3000', 'https://francislegacy.org', 'https://francis-legacy.vercel.app/'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Logging - environment specific
if (isProduction) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/archives', archiveRoutes);

// Public stats endpoint for homepage
app.get('/api/stats', async (req, res) => {
  try {
    const pool = require('./config/database');
    
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM family_members'),
      pool.query('SELECT COUNT(*) as total FROM archive_items WHERE status IN ($1, $2)', ['published', 'approved']),
      pool.query('SELECT COUNT(*) as total FROM blog_posts WHERE status = $1', ['published']),
      pool.query('SELECT COUNT(*) as total FROM news_articles WHERE status = $1', ['published']),
      pool.query(`
        SELECT 
          EXTRACT(YEAR FROM MIN(event_date)) as oldest_year,
          EXTRACT(YEAR FROM MAX(event_date)) as newest_year,
          COUNT(*) as total_events
        FROM timeline_events
      `),
    ]);

    const familyMembers = parseInt(stats[0].rows[0].total);
    const archiveItems = parseInt(stats[1].rows[0].total);
    const blogPosts = parseInt(stats[2].rows[0].total);
    const newsArticles = parseInt(stats[3].rows[0].total);
    
    // Calculate years of history from timeline
    const timelineData = stats[4].rows[0];
    const totalEvents = parseInt(timelineData.total_events);
    let yearsOfHistory = '150+'; // fallback
    
    if (totalEvents > 0 && timelineData.oldest_year && timelineData.newest_year) {
      const yearDiff = parseInt(timelineData.newest_year) - parseInt(timelineData.oldest_year);
      yearsOfHistory = yearDiff > 0 ? `${yearDiff}+` : '1';
    }

    res.json({
      familyMembers: familyMembers || 0,
      yearsOfHistory: yearsOfHistory,
      photosAndMedia: archiveItems || 0,
      storiesAndDocuments: (blogPosts + newsArticles) || 0,
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    // Return fallback stats in case of database error
    res.json({
      familyMembers: 0,
      yearsOfHistory: '150+',
      photosAndMedia: 0,
      storiesAndDocuments: 0,
    });
  }
});

// Public family history stats endpoint
app.get('/api/family-history/stats', async (req, res) => {
  try {
    const pool = require('./config/database');
    
    const stats = await Promise.all([
      // Years of documented history from timeline
      pool.query(`
        SELECT 
          EXTRACT(YEAR FROM MIN(event_date)) as oldest_year,
          EXTRACT(YEAR FROM MAX(event_date)) as newest_year,
          COUNT(*) as total_events
        FROM timeline_events
      `),
      // Count distinct generations
      pool.query(`
        SELECT COUNT(DISTINCT generation) as generations
        FROM family_members 
        WHERE generation IS NOT NULL
      `),
      // Count distinct countries/locations
      pool.query(`
        SELECT COUNT(DISTINCT location) as locations
        FROM timeline_events 
        WHERE location IS NOT NULL AND location != ''
        UNION ALL
        SELECT COUNT(DISTINCT birth_place) as locations
        FROM family_members 
        WHERE birth_place IS NOT NULL AND birth_place != ''
      `),
    ]);

    // Calculate years of history
    const timelineData = stats[0].rows[0];
    const totalEvents = parseInt(timelineData.total_events);
    let yearsOfHistory = '150+';
    
    if (totalEvents > 0 && timelineData.oldest_year && timelineData.newest_year) {
      const yearDiff = parseInt(timelineData.newest_year) - parseInt(timelineData.oldest_year);
      yearsOfHistory = yearDiff > 0 ? `${yearDiff}+` : '1';
    }

    // Count generations
    const generations = parseInt(stats[1].rows[0].generations) || 5;

    // Count unique locations (combining timeline and family member locations)
    let uniqueLocations = 0;
    const locationResults = stats[2].rows;
    locationResults.forEach(row => {
      uniqueLocations += parseInt(row.locations) || 0;
    });
    uniqueLocations = Math.max(uniqueLocations, 1); // At least 1

    res.json({
      yearsOfHistory: yearsOfHistory,
      generations: generations,
      locations: uniqueLocations,
    });
  } catch (error) {
    console.error('Error fetching family history stats:', error);
    // Return fallback stats in case of database error
    res.json({
      yearsOfHistory: '150+',
      generations: 5,
      locations: 12,
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler - enhanced for production
app.use((error, req, res, next) => {
  // Log error details
  const errorDetails = {
    message: error.message,
    stack: isProduction ? undefined : error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };

  if (isProduction) {
    // In production, log to proper logging service
    console.error('Production error:', JSON.stringify(errorDetails));
  } else {
    console.error('Development error:', error);
  }

  // Handle specific error types
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File size too large',
      maxSize: '10MB'
    });
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Please try again later'
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details || error.message
    });
  }

  if (error.name === 'UnauthorizedError' || error.code === 'UNAUTHORIZED') {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Francis Legacy API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
