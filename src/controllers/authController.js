const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');
const familyRepository = require('../repositories/familyRepository');
const userRepository = require('../repositories/userRepository');

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
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }

      // Check if account is active
      if (user.is_active === false) {
        return res.status(401).json({ error: 'Account is disabled' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }

      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store session in appropriate table based on user type
      if (userType === 'family_member') {
        await pool.query(`
          INSERT INTO family_member_sessions (family_member_id, token_hash, expires_at, ip_address, user_agent, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
        `, [user.id, sessionToken, expiresAt, req.ip, req.get('User-Agent')]);
      } else {
        await pool.query(`
          INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
        `, [user.id, sessionToken, expiresAt, req.ip, req.get('User-Agent')]);
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
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(req, res) {
    try {
      const sessionToken = req.cookies.session_token;

      if (sessionToken) {
        // Deactivate session in both tables (one will succeed, one will do nothing)
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
      } else {
        await userRepository.updatePassword(userId, newPasswordHash);
      }

      res.json({ message: 'Password changed successfully' });

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