const express = require('express');
const archiveController = require('../controllers/archiveController');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Public routes (no authentication required for viewing)
router.get('/', archiveController.getArchives);
router.get('/stats', archiveController.getArchiveStats);
router.get('/:id', archiveController.getArchiveById);
router.get('/:id/download', archiveController.getDownloadUrl);

// Protected routes (authentication required)
router.use(authenticateToken); // All routes below require authentication

router.post('/', archiveController.createArchive);
router.put('/:id', archiveController.updateArchive);
router.delete('/:id', archiveController.deleteArchive);
router.get('/user/my-archives', archiveController.getUserArchives);

module.exports = router;