const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Middleware that supports both admin (JWT) and family member (session) authentication
const authenticateUser = async (req, res, next) => {
  try {
    // Try JWT authentication first (for admin users)
    const authHeader = req.headers['authorization'];
    const jwtToken = authHeader && authHeader.split(' ')[1];
    
    if (jwtToken) {
      try {
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
        
        if (decoded.userId || decoded.id) {
          const userId = decoded.userId || decoded.id;
          const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
          
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            
            if (user.is_active !== false) {
              req.user = user;
              req.userType = 'admin';
              return next();
            }
          }
        }
      } catch (jwtError) {
        // JWT verification failed, try session authentication
        console.log('JWT verification failed, trying session authentication');
      }
    }

    // Try session-based authentication (for family members and admin users)
    const sessionToken = req.cookies?.session_token;
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check family member sessions first
    const familySessionResult = await pool.query(`
      SELECT fm.*, fms.expires_at
      FROM family_member_sessions fms
      JOIN family_members fm ON fms.family_member_id = fm.id
      WHERE fms.token_hash = $1 AND fms.is_active = true
    `, [sessionToken]);

    if (familySessionResult.rows.length > 0) {
      const session = familySessionResult.rows[0];
      
      // Check if session is expired
      if (new Date() > new Date(session.expires_at)) {
        return res.status(401).json({ error: 'Session expired' });
      }

      req.user = session;
      req.userType = 'family_member';
      return next();
    }

    // Check admin user sessions
    const adminSessionResult = await pool.query(`
      SELECT u.*, us.expires_at
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.token_hash = $1 AND us.is_active = true
    `, [sessionToken]);

    if (adminSessionResult.rows.length > 0) {
      const session = adminSessionResult.rows[0];
      
      // Check if session is expired
      if (new Date() > new Date(session.expires_at)) {
        return res.status(401).json({ error: 'Session expired' });
      }

      if (session.is_active === false) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      req.user = session;
      req.userType = 'admin';
      return next();
    }

    return res.status(401).json({ error: 'Invalid authentication' });
    
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware that requires admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.userType !== 'admin' || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Middleware that allows both admin and family member access
const requireMember = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Allow access for both admin users and family members
  if (req.userType === 'admin' || req.userType === 'family_member') {
    return next();
  }
  
  return res.status(403).json({ error: 'Member access required' });
};

module.exports = { authenticateUser, requireAdmin, requireMember };