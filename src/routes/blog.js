const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const blogController = require('../controllers/blogController');
const router = express.Router();

router.get('/', blogController.getAllPosts);
router.get('/:slug', blogController.getPostBySlug);
router.post('/', authenticateToken, requireAdmin, blogController.createPost);
router.put('/:id', authenticateToken, requireAdmin, blogController.updatePost);
router.delete('/:id', authenticateToken, requireAdmin, blogController.deletePost);

module.exports = router;