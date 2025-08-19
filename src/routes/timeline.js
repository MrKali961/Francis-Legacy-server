const express = require('express');
const { sessionAuth } = require('../middleware/sessionAuth');
const timelineController = require('../controllers/timelineController');
const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Public routes
router.get('/', timelineController.getAllEvents);
router.get('/range', timelineController.getEventsByDateRange);
router.get('/type/:type', timelineController.getEventsByType);
router.get('/:id', timelineController.getEventById);

// Admin-only routes
router.post('/', sessionAuth, requireAdmin, timelineController.createEvent);
router.put('/:id', sessionAuth, requireAdmin, timelineController.updateEvent);
router.delete('/:id', sessionAuth, requireAdmin, timelineController.deleteEvent);

module.exports = router;