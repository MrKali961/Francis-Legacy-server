const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const familyController = require('../controllers/familyController');
const router = express.Router();

router.get('/', familyController.getAllMembers);
router.get('/:id', familyController.getMemberById);
router.post('/', authenticateToken, requireAdmin, familyController.createMember);
router.put('/:id', authenticateToken, requireAdmin, familyController.updateMember);
router.delete('/:id', authenticateToken, requireAdmin, familyController.deleteMember);

module.exports = router;