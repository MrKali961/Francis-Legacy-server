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
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://francislegacy.org', 'https://francis-legacy.vercel.app/'],
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
