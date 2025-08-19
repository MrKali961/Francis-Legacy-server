const express = require('express');
const { sessionAuth } = require('../middleware/sessionAuth');
const newsController = require('../controllers/newsController');
const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/', newsController.getAllArticles);
router.get('/:slug', newsController.getArticleBySlug);
router.post('/', sessionAuth, requireAdmin, newsController.createArticle);
router.put('/:id', sessionAuth, requireAdmin, newsController.updateArticle);
router.delete('/:id', sessionAuth, requireAdmin, newsController.deleteArticle);

module.exports = router;