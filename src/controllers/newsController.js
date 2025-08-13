const newsRepository = require('../repositories/newsRepository');

class NewsController {
  async getAllArticles(req, res) {
    try {
      const articles = await newsRepository.getAll();
      res.json(articles);
    } catch (error) {
      console.error('Error fetching news articles:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getArticleBySlug(req, res) {
    try {
      const { slug } = req.params;
      const article = await newsRepository.findBySlug(slug);

      if (!article) {
        return res.status(404).json({ error: 'News article not found' });
      }

      res.json(article);
    } catch (error) {
      console.error('Error fetching news article:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createArticle(req, res) {
    try {
      const { title, slug, excerpt, content, featuredImageUrl, status = 'draft' } = req.body;
      const authorId = req.user.id;

      const article = await newsRepository.create({
        title,
        slug,
        excerpt,
        content,
        featuredImageUrl,
        authorId,
        status
      });

      res.status(201).json(article);
    } catch (error) {
      console.error('Error creating news article:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateArticle(req, res) {
    try {
      const { id } = req.params;
      const { title, slug, excerpt, content, featuredImageUrl, status } = req.body;

      const article = await newsRepository.update(id, {
        title,
        slug,
        excerpt,
        content,
        featuredImageUrl,
        status
      });

      if (!article) {
        return res.status(404).json({ error: 'News article not found' });
      }

      res.json(article);
    } catch (error) {
      console.error('Error updating news article:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteArticle(req, res) {
    try {
      const { id } = req.params;
      const article = await newsRepository.delete(id);

      if (!article) {
        return res.status(404).json({ error: 'News article not found' });
      }

      res.json({ message: 'News article deleted successfully' });
    } catch (error) {
      console.error('Error deleting news article:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new NewsController();