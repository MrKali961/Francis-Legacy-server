const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const newsController = require('../controllers/newsController');
const router = express.Router();

router.get('/', newsController.getAllArticles);
router.get('/:slug', newsController.getArticleBySlug);
router.post('/', authenticateToken, requireAdmin, newsController.createArticle);
router.put('/:id', authenticateToken, requireAdmin, newsController.updateArticle);
router.delete('/:id', authenticateToken, requireAdmin, newsController.deleteArticle);

module.exports = router;