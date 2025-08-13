// Simple in-memory database simulation for testing
class TestDatabase {
  constructor() {
    this.users = [
      {
        id: '1',
        email: 'admin@francislegacy.com',
        password_hash: '$2a$10$q5/vrPXYPTpFWsER6uv3xujojwYjW2IHnDPDiiJRmeQ4JhMISLaqK', // 'admin123' - verified bcrypt hash
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '2',
        email: 'test@example.com',
        password_hash: '$2a$10$q5/vrPXYPTpFWsER6uv3xujojwYjW2IHnDPDiiJRmeQ4JhMISLaqK', // 'testpass' 
        first_name: 'Test',
        last_name: 'User',
        role: 'member',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    this.family_members = [];
    this.blog_posts = [];
    this.news_articles = [];
    this.archive_items = [];
    this.content_submissions = [];
    this.admin_audit_log = [];
    this.timeline_events = [];
  }

  async query(sql, params = []) {
    // Simulate common queries for testing
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.includes('from blog_posts') || sqlLower.includes('blog_posts bp')) {
      if (sqlLower.includes('count(*)')) {
        const count = this.blog_posts.filter(p => p.status === 'published').length;
        return { rows: [{ total: count.toString() }] };
      }
      // Handle slug-based queries
      if (sqlLower.includes('where bp.slug = $1') || sqlLower.includes('where slug = $1')) {
        const post = this.blog_posts.find(p => p.slug === params[0] && p.status === 'published');
        return { rows: post ? [post] : [] };
      }
      // Handle JOIN queries and WHERE clauses properly - return published posts
      if (sqlLower.includes('bp.status = \'published\'') || sqlLower.includes('where bp.status')) {
        const publishedPosts = this.blog_posts.filter(p => p.status === 'published');
        return { rows: publishedPosts };
      }
      return { rows: this.blog_posts.filter(p => p.status === 'published') };
    }
    
    if (sqlLower.includes('from news_articles') || sqlLower.includes('news_articles na')) {
      if (sqlLower.includes('count(*)')) {
        const count = this.news_articles.filter(a => a.status === 'published').length;
        return { rows: [{ total: count.toString() }] };
      }
      // Handle slug-based queries
      if (sqlLower.includes('where na.slug = $1') || (sqlLower.includes('where') && sqlLower.includes('slug = $1'))) {
        const article = this.news_articles.find(a => a.slug === params[0] && a.status === 'published');
        return { rows: article ? [article] : [] };
      }
      // Handle JOIN queries and WHERE clauses properly - return published articles
      if (sqlLower.includes('na.status = \'published\'') || sqlLower.includes('where na.status')) {
        const publishedArticles = this.news_articles.filter(a => a.status === 'published');
        return { rows: publishedArticles };
      }
      return { rows: this.news_articles.filter(a => a.status === 'published') };
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('users') && !sqlLower.includes('blog_posts') && !sqlLower.includes('news_articles')) {
      if (sqlLower.includes('where email = $1')) {
        const user = this.users.find(u => u.email === params[0]);
        return { rows: user ? [user] : [] };
      }
      if (sqlLower.includes('where id = $1')) {
        const user = this.users.find(u => u.id === params[0]);
        return { rows: user ? [user] : [] };
      }
      if (sqlLower.includes('count(*)') && sqlLower.includes('role = $1')) {
        const count = this.users.filter(u => u.role === params[0]).length;
        return { rows: [{ total: count.toString() }] };
      }
      return { rows: this.users };
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('family_members')) {
      if (sqlLower.includes('count(*)')) {
        return { rows: [{ total: this.family_members.length.toString() }] };
      }
      // Handle single family member query with JOIN
      if (sqlLower.includes('where fm.id = $1') || sqlLower.includes('where id = $1')) {
        const member = this.family_members.find(m => m.id === params[0]);
        return { rows: member ? [member] : [] };
      }
      // Handle order by queries
      if (sqlLower.includes('order by')) {
        return { rows: [...this.family_members].sort((a, b) => 
          a.first_name.localeCompare(b.first_name) || a.last_name.localeCompare(b.last_name)
        ) };
      }
      return { rows: this.family_members };
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('archive_items')) {
      if (sqlLower.includes('count(*)')) {
        const count = this.archive_items.filter(i => i.status === 'approved').length;
        return { rows: [{ total: count.toString() }] };
      }
      return { rows: this.archive_items };
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('content_submissions')) {
      if (sqlLower.includes('count(*)')) {
        const count = this.content_submissions.filter(s => s.status === 'pending').length;
        return { rows: [{ total: count.toString() }] };
      }
      return { rows: this.content_submissions };
    }
    
    if (sqlLower.includes('insert into users')) {
      const newUser = {
        id: (this.users.length + 1).toString(),
        email: params[0],
        password_hash: params[1],
        first_name: params[2],
        last_name: params[3],
        phone: params[4],
        birth_date: params[5],
        role: 'member',
        created_by: params[6],
        is_active: true,
        created_at: new Date()
      };
      this.users.push(newUser);
      return { rows: [newUser] };
    }
    
    if (sqlLower.includes('insert into blog_posts')) {
      const newPost = {
        id: (this.blog_posts.length + 1).toString(),
        title: params[0],
        slug: params[1],
        excerpt: params[2],
        content: params[3],
        featured_image_url: params[4],
        author_id: params[5],
        status: params[6],
        created_at: new Date(),
        updated_at: new Date(),
        published_at: params[6] === 'published' ? new Date() : null,
        author_first_name: 'Admin',
        author_last_name: 'User'
      };
      this.blog_posts.push(newPost);
      return { rows: [newPost] };
    }
    
    if (sqlLower.includes('insert into news_articles')) {
      const newArticle = {
        id: (this.news_articles.length + 1).toString(),
        title: params[0],
        slug: params[1],
        excerpt: params[2],
        content: params[3],
        featured_image_url: params[4],
        author_id: params[5],
        status: params[6],
        created_at: new Date(),
        updated_at: new Date(),
        published_at: params[6] === 'published' ? new Date() : null,
        author_first_name: 'Admin',
        author_last_name: 'User'
      };
      this.news_articles.push(newArticle);
      return { rows: [newArticle] };
    }
    
    if (sqlLower.includes('insert into family_members')) {
      const newMember = {
        id: (this.family_members.length + 1).toString(),
        first_name: params[0],
        last_name: params[1],
        maiden_name: params[2],
        birth_date: params[3],
        death_date: params[4],
        birth_place: params[5],
        occupation: params[6],
        biography: params[7],
        profile_photo_url: params[8],
        father_id: params[9],
        mother_id: params[10],
        spouse_id: params[11],
        created_at: new Date(),
        updated_at: new Date()
      };
      this.family_members.push(newMember);
      return { rows: [newMember] };
    }
    
    if (sqlLower.includes('insert into admin_audit_log')) {
      const logEntry = {
        id: (this.admin_audit_log.length + 1).toString(),
        admin_id: params[0],
        action: params[1],
        target_type: params[2],
        target_id: params[3],
        details: params[4],
        ip_address: params[5],
        user_agent: params[6],
        created_at: new Date()
      };
      this.admin_audit_log.push(logEntry);
      return { rows: [logEntry] };
    }
    
    if (sqlLower.includes('update family_members')) {
      const id = params[params.length - 1]; // ID is the last parameter
      const memberIndex = this.family_members.findIndex(m => m.id === id);
      if (memberIndex !== -1) {
        const updatedMember = {
          ...this.family_members[memberIndex],
          first_name: params[0],
          last_name: params[1],
          maiden_name: params[2],
          birth_date: params[3],
          death_date: params[4],
          birth_place: params[5],
          occupation: params[6],
          biography: params[7],
          profile_photo_url: params[8],
          father_id: params[9],
          mother_id: params[10],
          spouse_id: params[11],
          updated_at: new Date()
        };
        this.family_members[memberIndex] = updatedMember;
        return { rows: [updatedMember] };
      }
      return { rows: [] };
    }
    
    if (sqlLower.includes('delete from family_members')) {
      const id = params[0];
      const memberIndex = this.family_members.findIndex(m => m.id === id);
      if (memberIndex !== -1) {
        const deletedMember = this.family_members[memberIndex];
        this.family_members.splice(memberIndex, 1);
        return { rows: [deletedMember] };
      }
      return { rows: [] };
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('timeline_events')) {
      return { rows: this.timeline_events };
    }
    
    if (sqlLower.includes('insert into timeline_events')) {
      const newEvent = {
        id: (this.timeline_events.length + 1).toString(),
        title: params[0],
        description: params[1],
        event_date: params[2],
        event_type: params[3],
        location: params[4],
        associated_member_id: params[5],
        image_url: params[6],
        created_at: new Date(),
        updated_at: new Date()
      };
      this.timeline_events.push(newEvent);
      return { rows: [newEvent] };
    }
    
    // Handle blog post UPDATE operations - more flexible matching
    if (sqlLower.includes('update blog_posts') && sqlLower.includes('$7') && params.length >= 7) {
      const id = params[6]; // WHERE id = $7 means params[6] (0-indexed)
      const postIndex = this.blog_posts.findIndex(p => p.id === id);
      console.log(`UPDATE: Looking for blog post ${id}, found index: ${postIndex}`);
      if (postIndex !== -1) {
        const updatedPost = {
          ...this.blog_posts[postIndex],
          title: params[0],
          slug: params[1], 
          excerpt: params[2],
          content: params[3],
          featured_image_url: params[4] === undefined ? this.blog_posts[postIndex].featured_image_url : params[4],
          status: params[5],
          updated_at: new Date(),
          published_at: params[5] === 'published' && !this.blog_posts[postIndex].published_at ? new Date() : this.blog_posts[postIndex].published_at
        };
        this.blog_posts[postIndex] = updatedPost;
        console.log(`Successfully updated blog post ${id}`);
        return { rows: [updatedPost] };
      }
      return { rows: [] };
    }
    
    // Handle blog post DELETE operations - more flexible matching
    if (sqlLower.includes('delete from blog_posts') && sqlLower.includes('$1') && params.length >= 1) {
      const id = params[0];
      const postIndex = this.blog_posts.findIndex(p => p.id === id);
      console.log(`DELETE: Looking for blog post ${id}, found index: ${postIndex}, total posts: ${this.blog_posts.length}`);
      console.log('Current blog posts:', this.blog_posts.map(p => `${p.id}: ${p.title}`));
      if (postIndex !== -1) {
        const deletedPost = {...this.blog_posts[postIndex]};
        this.blog_posts.splice(postIndex, 1);
        console.log(`Successfully deleted blog post ${id}, remaining posts: ${this.blog_posts.length}`);
        return { rows: [deletedPost] };
      }
      console.log(`Blog post ${id} not found for deletion`);
      return { rows: [] };
    }
    
    // Handle news article UPDATE operations
    if (sqlLower.includes('update news_articles')) {
      const id = params[params.length - 1];
      const articleIndex = this.news_articles.findIndex(a => a.id === id);
      if (articleIndex !== -1) {
        const updatedArticle = {
          ...this.news_articles[articleIndex],
          title: params[0],
          slug: params[1],
          excerpt: params[2], 
          content: params[3],
          featured_image_url: params[4],
          status: params[5],
          updated_at: new Date()
        };
        this.news_articles[articleIndex] = updatedArticle;
        return { rows: [updatedArticle] };
      }
      return { rows: [] };
    }
    
    // Handle news article DELETE operations
    if (sqlLower.includes('delete from news_articles')) {
      const id = params[0];
      const articleIndex = this.news_articles.findIndex(a => a.id === id);
      if (articleIndex !== -1) {
        const deletedArticle = this.news_articles[articleIndex];
        this.news_articles.splice(articleIndex, 1);
        return { rows: [deletedArticle] };
      }
      return { rows: [] };
    }
    
    // Debug logging for unhandled queries
    console.log('Unhandled SQL query:', sql, 'params:', params);
    
    // Default empty response
    return { rows: [] };
  }
  
  on() {
    // Mock event handlers
  }
}

// Export test database instance
const testPool = new TestDatabase();
module.exports = testPool;