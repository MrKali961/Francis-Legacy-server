const express = require('express');
const archiveController = require('../controllers/archiveController');
const { sessionAuth } = require('../middleware/sessionAuth');
const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Public routes (no authentication required for viewing)
router.get('/', archiveController.getArchives);
router.get('/stats', archiveController.getArchiveStats);
router.get('/:id', archiveController.getArchiveById);
router.get('/:id/download', archiveController.getDownloadUrl);

// Protected routes (authentication required)
router.use(sessionAuth); // All routes below require authentication

router.post('/', archiveController.createArchive);
router.put('/:id', archiveController.updateArchive);
router.delete('/:id', archiveController.deleteArchive);
router.get('/user/my-archives', archiveController.getUserArchives);

module.exports = router;