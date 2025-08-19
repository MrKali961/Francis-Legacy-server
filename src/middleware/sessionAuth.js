const pool = require('../config/database');

const sessionAuth = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token provided' });
    }

    // Debug logging - check what token we're working with
    console.log(`🔍 SessionAuth Debug - Token: ${sessionToken.substring(0, 8)}...`);

    // Find active session - check both admin and family member sessions
    let session = null;
    let sessionType = null;

    // Check admin user sessions first
    const adminSessionResult = await pool.query(`
      SELECT s.*, s.user_id, s.expires_at, s.is_active, 'admin' as session_type
      FROM user_sessions s
      WHERE s.token_hash = $1 AND s.is_active = true
    `, [sessionToken]);

    // Check family member sessions REGARDLESS of admin result to detect collisions
    const familySessionResult = await pool.query(`
      SELECT s.*, s.family_member_id as user_id, s.expires_at, s.is_active, 'family_member' as session_type
      FROM family_member_sessions s
      WHERE s.token_hash = $1 AND s.is_active = true
    `, [sessionToken]);

    // Debug logging - show what sessions were found
    console.log(`🔍 SessionAuth Debug - Admin sessions found: ${adminSessionResult.rows.length}`);
    console.log(`🔍 SessionAuth Debug - Family sessions found: ${familySessionResult.rows.length}`);

    // Check for dangerous collision case
    if (adminSessionResult.rows.length > 0 && familySessionResult.rows.length > 0) {
      console.error(`🚨 CRITICAL: Session token collision detected! Token ${sessionToken.substring(0, 8)}... found in both session tables!`);
      return res.status(500).json({ error: 'Session authentication error' });
    }

    if (adminSessionResult.rows.length > 0) {
      session = adminSessionResult.rows[0];
      sessionType = 'admin';
      console.log(`🔍 SessionAuth Debug - Selected admin session for user: ${session.user_id}`);
    } else if (familySessionResult.rows.length > 0) {
      session = familySessionResult.rows[0];
      sessionType = 'family_member';
      console.log(`🔍 SessionAuth Debug - Selected family member session for user: ${session.user_id}`);
    }

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      // Deactivate expired session in the appropriate table
      if (sessionType === 'admin') {
        await pool.query(`
          UPDATE user_sessions 
          SET is_active = false 
          WHERE token_hash = $1
        `, [sessionToken]);
      } else {
        await pool.query(`
          UPDATE family_member_sessions 
          SET is_active = false 
          WHERE token_hash = $1
        `, [sessionToken]);
      }
      
      return res.status(401).json({ error: 'Session expired' });
    }

    // Find user based on session type
    let user = null;
    let userType = sessionType;

    if (sessionType === 'family_member') {
      const familyMemberResult = await pool.query(`
        SELECT *, 'family_member' as user_type
        FROM family_members 
        WHERE id = $1 AND is_active = true
      `, [session.user_id]);

      if (familyMemberResult.rows.length > 0) {
        user = familyMemberResult.rows[0];
      }
    } else {
      const userResult = await pool.query(`
        SELECT *, 'admin' as user_type
        FROM users 
        WHERE id = $1 AND is_active = true
      `, [session.user_id]);

      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Add user info to request
    req.user = {
      ...user,
      userType,
      role: userType === 'admin' ? user.role : 'member'
    };

    // Debug logging - show final user context
    console.log(`🔍 SessionAuth Debug - Final user context: ${req.user.userType} user ${req.user.id} (${req.user.first_name} ${req.user.last_name})`);

    next();
  } catch (error) {
    console.error('Session authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const optionalSessionAuth = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.session_token;

    if (!sessionToken) {
      req.user = null;
      return next();
    }

    // Find active session - check both admin and family member sessions
    let session = null;
    let sessionType = null;

    // Check admin user sessions first
    const adminSessionResult = await pool.query(`
      SELECT s.*, s.user_id, s.expires_at, s.is_active, 'admin' as session_type
      FROM user_sessions s
      WHERE s.token_hash = $1 AND s.is_active = true
    `, [sessionToken]);

    if (adminSessionResult.rows.length > 0) {
      session = adminSessionResult.rows[0];
      sessionType = 'admin';
    } else {
      // Check family member sessions
      const familySessionResult = await pool.query(`
        SELECT s.*, s.family_member_id as user_id, s.expires_at, s.is_active, 'family_member' as session_type
        FROM family_member_sessions s
        WHERE s.token_hash = $1 AND s.is_active = true
      `, [sessionToken]);

      if (familySessionResult.rows.length > 0) {
        session = familySessionResult.rows[0];
        sessionType = 'family_member';
      }
    }

    if (!session) {
      req.user = null;
      return next();
    }

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      req.user = null;
      return next();
    }

    // Find user based on session type
    let user = null;
    let userType = sessionType;

    if (sessionType === 'family_member') {
      const familyMemberResult = await pool.query(`
        SELECT *, 'family_member' as user_type
        FROM family_members 
        WHERE id = $1 AND is_active = true
      `, [session.user_id]);

      if (familyMemberResult.rows.length > 0) {
        user = familyMemberResult.rows[0];
      }
    } else {
      const userResult = await pool.query(`
        SELECT *, 'admin' as user_type
        FROM users 
        WHERE id = $1 AND is_active = true
      `, [session.user_id]);

      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      }
    }

    if (user) {
      req.user = {
        ...user,
        userType,
        role: userType === 'admin' ? user.role : 'member'
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional session authentication error:', error);
    req.user = null;
    next();
  }
};

module.exports = { sessionAuth, optionalSessionAuth };