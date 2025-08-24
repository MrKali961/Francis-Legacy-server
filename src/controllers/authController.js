const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');
const familyRepository = require('../repositories/familyRepository');
const userRepository = require('../repositories/userRepository');
const userRateLimiter = require('../middleware/userRateLimiter');

class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username/email and password are required' });
      }

      // Determine if input is email or username
      const isEmail = username.includes('@');
      let user = null;
      let userType = null;

      if (isEmail) {
        // Try to find by email (only in users table for admin accounts)
        user = await userRepository.findByEmail(username);
        if (user) {
          userType = 'admin';
        }
      } else {
        // Try to find by username (check both family_members and users tables)
        user = await familyRepository.findByUsername(username);
        if (user) {
          userType = 'family_member';
        } else {
          user = await userRepository.findByUsername(username);
          if (user) {
            userType = 'admin';
          }
        }
      }

      if (!user || !user.password_hash) {
        console.log(`🚫 Login attempt failed - user not found: ${username}`);
        await userRateLimiter.recordFailedAttempt(username);
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }

      // Check if account is active
      if (user.is_active === false) {
        console.log(`🚫 Login attempt failed - account disabled: ${username}`);
        await userRateLimiter.recordFailedAttempt(username);
        return res.status(401).json({ error: 'Account is disabled' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        console.log(`🚫 Login attempt failed - invalid password: ${username} (${userType})`);
        await userRateLimiter.recordFailedAttempt(username);
        return res.status(401).json({ 
          error: 'Invalid username/email or password',
          debug: process.env.NODE_ENV === 'development' ? 'Password verification failed' : undefined
        });
      }

      console.log(`✅ Login successful: ${username} as ${userType} (ID: ${user.id})`);
      
      // Clear rate limit for successful authentication
      await userRateLimiter.clearRateLimit(username);

      // Generate session token with prefix to prevent collisions
      const tokenBase = crypto.randomBytes(32).toString('hex');
      const sessionToken = userType === 'admin' ? `admin_${tokenBase}` : `member_${tokenBase}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store session in appropriate table based on user type
      if (userType === 'family_member') {
        await pool.query(`
          INSERT INTO family_member_sessions (family_member_id, token_hash, expires_at, ip_address, user_agent, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
        `, [user.id, sessionToken, expiresAt, req.ip, req.get('User-Agent')]);
        console.log(`🔐 Family member session created: ${user.id} (token: ${sessionToken.substring(0, 12)}...)`);
      } else {
        await pool.query(`
          INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
        `, [user.id, sessionToken, expiresAt, req.ip, req.get('User-Agent')]);
        console.log(`🔐 Admin session created: ${user.id} (token: ${sessionToken.substring(0, 12)}...)`);
      }

      // Update last login
      if (userType === 'family_member') {
        await familyRepository.updateLastLogin(user.id);
      } else {
        await userRepository.updateLastLogin(user.id);
      }

      // Set session cookie (expires when browser closes)
      res.cookie('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours as fallback
      });

      // Return user info without password
      const { password_hash, ...userInfo } = user;
      res.json({
        user: {
          ...userInfo,
          userType,
          role: userType === 'admin' ? user.role : 'member',
          mustChangePassword: !user.password_changed
        },
        message: 'Login successful'
      });

    } catch (error) {
      console.error('🚨 Login error:', error);
      
      // Provide more specific error messages in development
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({ 
          error: 'Internal server error',
          debug: error.message,
          stack: error.stack
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(req, res) {
    try {
      const sessionToken = req.cookies.session_token;

      if (sessionToken) {
        console.log(`🚪 Logout attempt with token: ${sessionToken.substring(0, 12)}...`);
        
        // Deactivate session based on token prefix
        if (sessionToken.startsWith('admin_')) {
          const result = await pool.query(`
            UPDATE user_sessions 
            SET is_active = false 
            WHERE token_hash = $1 AND is_active = true
            RETURNING user_id
          `, [sessionToken]);
          
          if (result.rows.length > 0) {
            console.log(`✅ Admin session deactivated for user: ${result.rows[0].user_id}`);
          }
        } else if (sessionToken.startsWith('member_')) {
          const result = await pool.query(`
            UPDATE family_member_sessions 
            SET is_active = false 
            WHERE token_hash = $1 AND is_active = true
            RETURNING family_member_id
          `, [sessionToken]);
          
          if (result.rows.length > 0) {
            console.log(`✅ Family member session deactivated for user: ${result.rows[0].family_member_id}`);
          }
        } else {
          // Legacy token - deactivate in both tables
          await pool.query(`
            UPDATE user_sessions 
            SET is_active = false 
            WHERE token_hash = $1
          `, [sessionToken]);
          
          await pool.query(`
            UPDATE family_member_sessions 
            SET is_active = false 
            WHERE token_hash = $1
          `, [sessionToken]);
          
          console.log(`✅ Legacy session deactivated`);
        }
      }

      // Clear session cookie
      res.clearCookie('session_token');
      res.json({ message: 'Logout successful' });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      const userType = req.user.userType;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
      }

      // Get current user
      let user;
      if (userType === 'family_member') {
        user = await pool.query('SELECT * FROM family_members WHERE id = $1', [userId]);
      } else {
        user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      }
      user = user.rows[0];

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      if (userType === 'family_member') {
        await familyRepository.updatePassword(userId, newPasswordHash);
        // Invalidate all sessions for this family member
        await pool.query(`
          UPDATE family_member_sessions 
          SET is_active = false 
          WHERE family_member_id = $1
        `, [userId]);
      } else {
        await userRepository.updatePassword(userId, newPasswordHash);
        // Invalidate all sessions for this admin user
        await pool.query(`
          UPDATE user_sessions 
          SET is_active = false 
          WHERE user_id = $1
        `, [userId]);
      }

      // Clear rate limit for password change
      await userRateLimiter.clearRateLimitByUserId(userId, userType);
      
      console.log(`🔐 Password changed for ${userType} ${userId} - all sessions invalidated, rate limit cleared`);
      res.json({ 
        message: 'Password changed successfully',
        sessionInvalidated: true,
        rateLimitCleared: true
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getCurrentUser(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { password_hash, ...userInfo } = req.user;
      res.json({
        user: {
          ...userInfo,
          mustChangePassword: !req.user.password_changed
        }
      });

    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();