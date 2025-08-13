const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const adminRepository = require('../repositories/adminRepository');
const userRepository = require('../repositories/userRepository');

const emailService = process.env.NODE_ENV === 'production' 
  ? require('../utils/email') 
  : require('../utils/email-test');

class AdminController {
  async getDashboardStats(req, res) {
    try {
      const stats = await adminRepository.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAllUsers(req, res) {
    try {
      const users = await userRepository.getAll();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createUser(req, res) {
    try {
      const { email, firstName, lastName, phone, birthDate } = req.body;

      if (await userRepository.exists(email)) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const newUser = await userRepository.create({
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        phone,
        birthDate,
        role: 'member',
        createdBy: req.user.id
      });

      try {
        await emailService.sendWelcomeEmail(email, firstName, tempPassword);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      await adminRepository.logAdminAction(
        req.user.id,
        'CREATE_USER',
        'user',
        newUser.id,
        { email, firstName, lastName },
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        message: 'Family member account created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          createdAt: newUser.created_at
        },
        tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone, birthDate, isActive, role } = req.body;

      const user = await userRepository.update(id, {
        firstName,
        lastName,
        email,
        phone,
        birthDate,
        isActive,
        role
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await adminRepository.logAdminAction(
        req.user.id,
        'UPDATE_USER',
        'user',
        id,
        { firstName, lastName, email, isActive, role },
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const user = await userRepository.deactivate(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await adminRepository.logAdminAction(
        req.user.id,
        'DELETE_USER',
        'user',
        id,
        user,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ message: 'User deactivated successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSubmissions(req, res) {
    try {
      const submissions = await adminRepository.getContentSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async reviewSubmission(req, res) {
    try {
      const { id } = req.params;
      const { status, reviewNotes } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const submission = await adminRepository.updateSubmissionStatus(id, status, req.user.id, reviewNotes);

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (status === 'approved') {
        const content = submission.content;
        
        try {
          if (submission.type === 'news') {
            await adminRepository.createNewsFromSubmission(content, submission.submitted_by);
          } else if (submission.type === 'blog') {
            await adminRepository.createBlogFromSubmission(content, submission.submitted_by);
          } else if (submission.type === 'archive') {
            await adminRepository.createArchiveFromSubmission(content, submission.submitted_by, req.user.id);
          }
        } catch (contentError) {
          console.error('Error creating approved content:', contentError);
          await adminRepository.revertSubmissionStatus(id);
          return res.status(500).json({ error: 'Failed to create approved content' });
        }
      }

      await adminRepository.logAdminAction(
        req.user.id,
        'REVIEW_SUBMISSION',
        'content_submission',
        id,
        { status, reviewNotes, type: submission.type },
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        message: `Submission ${status} successfully`,
        submission
      });
    } catch (error) {
      console.error('Error reviewing submission:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAuditLog(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await adminRepository.getAuditLog(page, limit);
      res.json(result);
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const user = await userRepository.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent admin from resetting their own password through this endpoint
      if (user.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot reset your own password through this method' });
      }

      const newPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const passwordUpdated = await userRepository.updatePassword(id, hashedPassword);
      if (!passwordUpdated) {
        return res.status(500).json({ error: 'Failed to update password' });
      }

      // Try to send email but don't fail the operation if it fails
      let emailSent = false;
      try {
        await emailService.sendWelcomeEmail(user.email, user.first_name, newPassword);
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }

      await adminRepository.logAdminAction(
        req.user.id,
        'RESET_PASSWORD',
        'user',
        id,
        { email: user.email, emailSent },
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        message: 'Password reset successfully',
        emailSent,
        newPassword: process.env.NODE_ENV === 'development' ? newPassword : undefined
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      
      // Provide more specific error messages
      if (error.code === '22P02') {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AdminController();