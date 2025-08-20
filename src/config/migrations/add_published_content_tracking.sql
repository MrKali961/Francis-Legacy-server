-- Migration: Add published content ID tracking to content_submissions table
-- This fixes the critical bug where rejected submissions still show published content

-- Add columns to track published content IDs
ALTER TABLE content_submissions 
ADD COLUMN published_news_id UUID REFERENCES news_articles(id) ON DELETE SET NULL,
ADD COLUMN published_blog_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
ADD COLUMN published_archive_id UUID REFERENCES archive_items(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_content_submissions_published_news ON content_submissions(published_news_id);
CREATE INDEX idx_content_submissions_published_blog ON content_submissions(published_blog_id);
CREATE INDEX idx_content_submissions_published_archive ON content_submissions(published_archive_id);

-- Add check constraint to ensure only one published content ID is set per submission
ALTER TABLE content_submissions 
ADD CONSTRAINT check_single_published_content 
CHECK (
    (published_news_id IS NOT NULL AND published_blog_id IS NULL AND published_archive_id IS NULL AND type = 'news') OR
    (published_news_id IS NULL AND published_blog_id IS NOT NULL AND published_archive_id IS NULL AND type = 'blog') OR
    (published_news_id IS NULL AND published_blog_id IS NULL AND published_archive_id IS NOT NULL AND type = 'archive') OR
    (published_news_id IS NULL AND published_blog_id IS NULL AND published_archive_id IS NULL)
);

-- Create a view to easily find orphaned content
CREATE OR REPLACE VIEW orphaned_content AS
SELECT 
    'news' as content_type,
    na.id as content_id,
    na.title,
    na.created_at,
    cs.id as submission_id,
    cs.status as submission_status
FROM news_articles na
LEFT JOIN content_submissions cs ON cs.content::json->>'title' = na.title AND cs.type = 'news'
WHERE cs.status = 'rejected' OR cs.id IS NULL

UNION ALL

SELECT 
    'blog' as content_type,
    bp.id as content_id,
    bp.title,
    bp.created_at,
    cs.id as submission_id,
    cs.status as submission_status
FROM blog_posts bp
LEFT JOIN content_submissions cs ON cs.content::json->>'title' = bp.title AND cs.type = 'blog'
WHERE cs.status = 'rejected' OR cs.id IS NULL

UNION ALL

SELECT 
    'archive' as content_type,
    ai.id as content_id,
    ai.title,
    ai.created_at,
    cs.id as submission_id,
    cs.status as submission_status
FROM archive_items ai
LEFT JOIN content_submissions cs ON cs.content::json->>'title' = ai.title AND cs.type = 'archive'
WHERE cs.status = 'rejected' OR cs.id IS NULL;

-- Comments
COMMENT ON COLUMN content_submissions.published_news_id IS 'References the news article created when this submission was approved';
COMMENT ON COLUMN content_submissions.published_blog_id IS 'References the blog post created when this submission was approved';
COMMENT ON COLUMN content_submissions.published_archive_id IS 'References the archive item created when this submission was approved';
COMMENT ON VIEW orphaned_content IS 'Shows published content that has rejected submissions or no submissions at all';