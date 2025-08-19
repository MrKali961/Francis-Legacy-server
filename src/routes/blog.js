const express = require('express');
const { sessionAuth } = require('../middleware/sessionAuth');
const blogController = require('../controllers/blogController');
const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/', blogController.getAllPosts);
router.get('/:slug', blogController.getPostBySlug);
router.post('/', sessionAuth, requireAdmin, blogController.createPost);
router.put('/:id', sessionAuth, requireAdmin, blogController.updatePost);
router.delete('/:id', sessionAuth, requireAdmin, blogController.deletePost);

module.exports = router;