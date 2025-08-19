const blogRepository = require('../repositories/blogRepository');
const adminRepository = require('../repositories/adminRepository');

class BlogController {
  async getAllPosts(req, res) {
    try {
      const posts = await blogRepository.getAll();
      res.json(posts);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPostBySlug(req, res) {
    try {
      const { slug } = req.params;
      const post = await blogRepository.findBySlug(slug);

      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      res.json(post);
    } catch (error) {
      console.error('Error fetching blog post:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createPost(req, res) {
    try {
      const { title, slug, excerpt, content, featuredImageUrl, status = 'draft' } = req.body;
      const authorId = req.user.id;

      // Input validation
      const errors = [];
      
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        errors.push('Title is required');
      }
      
      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        errors.push('Slug is required');
      }
      
      if (!excerpt || typeof excerpt !== 'string' || excerpt.trim().length === 0) {
        errors.push('Excerpt is required');
      }
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        errors.push('Content is required');
      }
      
      if (title && title.length > 200) {
        errors.push('Title must be 200 characters or less');
      }
      
      if (slug && !/^[a-z0-9-]+$/.test(slug.trim())) {
        errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
      }
      
      if (excerpt && excerpt.length > 500) {
        errors.push('Excerpt must be 500 characters or less');
      }
      
      if (status && !['draft', 'published'].includes(status)) {
        errors.push('Status must be either "draft" or "published"');
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors 
        });
      }

      const post = await blogRepository.create({
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        featuredImageUrl: featuredImageUrl?.trim(),
        authorId,
        status
      });

      // Log admin action if user is admin
      if (req.user && req.user.role === 'admin') {
        await adminRepository.logAdminAction(
          req.user.id,
          'CREATE_BLOG_POST',
          'blog_post',
          post.id,
          { title: title.trim(), status },
          req.ip,
          req.get('User-Agent')
        );
      }

      res.status(201).json(post);
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePost(req, res) {
    try {
      const { id } = req.params;
      const { title, slug, excerpt, content, featuredImageUrl, status } = req.body;

      const post = await blogRepository.update(id, {
        title,
        slug,
        excerpt,
        content,
        featuredImageUrl,
        status
      });

      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      // Log admin action if user is admin
      if (req.user && req.user.role === 'admin') {
        await adminRepository.logAdminAction(
          req.user.id,
          'UPDATE_BLOG_POST',
          'blog_post',
          id,
          { title, status },
          req.ip,
          req.get('User-Agent')
        );
      }

      res.json(post);
    } catch (error) {
      console.error('Error updating blog post:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deletePost(req, res) {
    try {
      const { id } = req.params;
      const post = await blogRepository.delete(id);

      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      // Log admin action if user is admin
      if (req.user && req.user.role === 'admin') {
        await adminRepository.logAdminAction(
          req.user.id,
          'DELETE_BLOG_POST',
          'blog_post',
          id,
          { title: post.title },
          req.ip,
          req.get('User-Agent')
        );
      }

      res.json({ message: 'Blog post deleted successfully' });
    } catch (error) {
      console.error('Error deleting blog post:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new BlogController();