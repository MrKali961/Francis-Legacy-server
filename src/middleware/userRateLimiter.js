const pool = require('../config/database');

class UserRateLimiter {
  constructor() {
    // Store rate limit data: { userId: { attempts: number, windowStart: timestamp, blocked: boolean } }
    this.userAttempts = new Map();
    this.windowMs = 15 * 60 * 1000; // 15 minutes
    this.maxAttempts = 15; // Max attempts per window
    this.cleanupInterval = 5 * 60 * 1000; // Cleanup every 5 minutes
    
    // Start cleanup job
    this.startCleanup();
  }

  // Get user ID from username for rate limiting
  async getUserKey(username) {
    if (!username) return null;
    
    try {
      // First try to find as family member
      let result = await pool.query('SELECT id FROM family_members WHERE username = $1', [username]);
      if (result.rows.length > 0) {
        return `member_${result.rows[0].id}`;
      }
      
      // Then try as admin user (by username)
      result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (result.rows.length > 0) {
        return `admin_${result.rows[0].id}`;
      }
      
      // Finally try as admin user (by email)
      if (username.includes('@')) {
        result = await pool.query('SELECT id FROM users WHERE email = $1', [username]);
        if (result.rows.length > 0) {
          return `admin_${result.rows[0].id}`;
        }
      }
      
      // For non-existent users, use username-based key to prevent enumeration timing attacks
      return `unknown_${username}`;
    } catch (error) {
      console.error('Error getting user key for rate limiting:', error);
      return `error_${username}`;
    }
  }

  // Check if user is rate limited
  async isRateLimited(username) {
    const userKey = await this.getUserKey(username);
    if (!userKey) return false;

    const now = Date.now();
    const userData = this.userAttempts.get(userKey);

    if (!userData) {
      return false;
    }

    // Check if window has expired
    if (now - userData.windowStart > this.windowMs) {
      // Window expired, reset
      this.userAttempts.delete(userKey);
      return false;
    }

    // Check if user is blocked
    return userData.blocked;
  }

  // Record failed attempt
  async recordFailedAttempt(username) {
    const userKey = await this.getUserKey(username);
    if (!userKey) return;

    const now = Date.now();
    const userData = this.userAttempts.get(userKey) || {
      attempts: 0,
      windowStart: now,
      blocked: false
    };

    // Check if window has expired
    if (now - userData.windowStart > this.windowMs) {
      // Reset for new window
      userData.attempts = 1;
      userData.windowStart = now;
      userData.blocked = false;
    } else {
      // Increment attempts in current window
      userData.attempts++;
    }

    // Check if should block
    if (userData.attempts >= this.maxAttempts) {
      userData.blocked = true;
      console.log(`🚨 User rate limited: ${userKey} (${userData.attempts} attempts)`);
    }

    this.userAttempts.set(userKey, userData);
  }

  // Clear rate limit for user (on successful login or password change)
  async clearRateLimit(username) {
    const userKey = await this.getUserKey(username);
    if (!userKey) return;

    this.userAttempts.delete(userKey);
    console.log(`✅ Rate limit cleared for user: ${userKey}`);
  }

  // Clear rate limit by user ID (for password changes)
  async clearRateLimitByUserId(userId, userType) {
    const userKey = `${userType}_${userId}`;
    this.userAttempts.delete(userKey);
    console.log(`✅ Rate limit cleared for user ID: ${userKey}`);
  }

  // Get remaining attempts for user
  async getRemainingAttempts(username) {
    const userKey = await this.getUserKey(username);
    if (!userKey) return this.maxAttempts;

    const userData = this.userAttempts.get(userKey);
    if (!userData) return this.maxAttempts;

    const now = Date.now();
    if (now - userData.windowStart > this.windowMs) {
      return this.maxAttempts;
    }

    return Math.max(0, this.maxAttempts - userData.attempts);
  }

  // Express middleware
  middleware() {
    return async (req, res, next) => {
      try {
        const username = req.body?.username;
        if (!username) {
          return next();
        }

        const isLimited = await this.isRateLimited(username);
        if (isLimited) {
          const remaining = await this.getRemainingAttempts(username);
          return res.status(429).json({
            error: 'Too many authentication attempts, please try again later.',
            retryAfter: '15 minutes',
            remainingAttempts: remaining
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiter middleware error:', error);
        next(); // Continue on error to avoid blocking legitimate requests
      }
    };
  }

  // Cleanup expired entries
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete = [];

      for (const [userKey, userData] of this.userAttempts.entries()) {
        if (now - userData.windowStart > this.windowMs) {
          keysToDelete.push(userKey);
        }
      }

      keysToDelete.forEach(key => {
        this.userAttempts.delete(key);
      });

      if (keysToDelete.length > 0) {
        console.log(`🧹 Cleaned up ${keysToDelete.length} expired rate limit entries`);
      }
    }, this.cleanupInterval);
  }

  // Get stats for monitoring
  getStats() {
    const stats = {
      totalTrackedUsers: this.userAttempts.size,
      blockedUsers: 0,
      activeAttempts: 0
    };

    for (const userData of this.userAttempts.values()) {
      if (userData.blocked) {
        stats.blockedUsers++;
      }
      stats.activeAttempts += userData.attempts;
    }

    return stats;
  }
}

// Create singleton instance
const userRateLimiter = new UserRateLimiter();

module.exports = userRateLimiter;