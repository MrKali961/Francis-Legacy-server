const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const timelineController = require('../controllers/timelineController');
const router = express.Router();

// Public routes
router.get('/', timelineController.getAllEvents);
router.get('/range', timelineController.getEventsByDateRange);
router.get('/type/:type', timelineController.getEventsByType);
router.get('/:id', timelineController.getEventById);

// Admin-only routes
router.post('/', authenticateToken, requireAdmin, timelineController.createEvent);
router.put('/:id', authenticateToken, requireAdmin, timelineController.updateEvent);
router.delete('/:id', authenticateToken, requireAdmin, timelineController.deleteEvent);

module.exports = router;