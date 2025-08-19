const express = require('express');
const { sessionAuth } = require('../middleware/sessionAuth');
const familyController = require('../controllers/familyController');
const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/', sessionAuth, familyController.getAllMembers);
router.get('/with-auth', sessionAuth, requireAdmin, familyController.getAllMembersWithAuth);
router.put('/profile', sessionAuth, familyController.updateOwnProfile);
router.get('/:id', sessionAuth, familyController.getMemberById);
router.post('/', sessionAuth, requireAdmin, familyController.createMember);
router.put('/:id', sessionAuth, requireAdmin, familyController.updateMember);
router.post('/:id/reset-password', sessionAuth, requireAdmin, familyController.resetMemberPassword);
router.delete('/:id', sessionAuth, requireAdmin, familyController.deleteMember);

module.exports = router;