const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const router = express.Router();

router.get('/dashboard/stats', authenticateToken, requireAdmin, adminController.getDashboardStats);

router.get('/users', authenticateToken, requireAdmin, adminController.getAllUsers);

router.post('/users', authenticateToken, requireAdmin, adminController.createUser);

router.put('/users/:id', authenticateToken, requireAdmin, adminController.updateUser);

router.delete('/users/:id', authenticateToken, requireAdmin, adminController.deleteUser);

router.get('/submissions', authenticateToken, requireAdmin, adminController.getSubmissions);

router.put('/submissions/:id', authenticateToken, requireAdmin, adminController.reviewSubmission);

router.get('/audit-log', authenticateToken, requireAdmin, adminController.getAuditLog);

router.post('/users/:id/reset-password', authenticateToken, requireAdmin, adminController.resetUserPassword);

module.exports = router;