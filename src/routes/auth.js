const express = require('express');
const authController = require('../controllers/authController');
const { sessionAuth } = require('../middleware/sessionAuth');
const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/change-password', sessionAuth, authController.changePassword);
router.get('/me', sessionAuth, authController.getCurrentUser);

module.exports = router;