const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if decoded token has required fields
    if (!decoded.userId && !decoded.id) {
      return res.status(403).json({ error: 'Invalid token payload' });
    }
    
    const userId = decoded.userId || decoded.id;
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Check if user is active
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    } else {
      return res.status(403).json({ error: 'Token verification failed' });
    }
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    console.error('RequireAdmin: No user found in request');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    console.error(`RequireAdmin: User ${req.user.id} (${req.user.email}) with role '${req.user.role}' attempted admin action`);
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

module.exports = { authenticateToken, requireAdmin };