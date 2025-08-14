-- Remove all sample/hardcoded data from the database
-- Date: 2025-01-14
-- Purpose: Clean up all test/sample data for production use

-- Remove all existing archive items (these are all sample data)
DELETE FROM archive_items;

-- Reset the sequence for archive_items if needed (PostgreSQL specific)
-- This ensures new IDs start from 1
ALTER SEQUENCE IF EXISTS archive_items_id_seq RESTART WITH 1;

-- Remove sample blog posts if any exist with hardcoded content
DELETE FROM blog_posts WHERE content LIKE '%sample%' OR content LIKE '%test%' OR content LIKE '%lorem%';

-- Remove sample news articles if any exist with hardcoded content  
DELETE FROM news_articles WHERE content LIKE '%sample%' OR content LIKE '%test%' OR content LIKE '%lorem%';

-- Remove sample timeline events if any exist with hardcoded content
DELETE FROM timeline_events WHERE description LIKE '%sample%' OR description LIKE '%test%' OR description LIKE '%lorem%';

-- Remove sample family members if any exist with test data
DELETE FROM family_members WHERE biography LIKE '%sample%' OR biography LIKE '%test%' OR biography LIKE '%lorem%';

-- Clean up any content submissions that are samples
DELETE FROM content_submissions WHERE title LIKE '%sample%' OR title LIKE '%test%';

-- Note: We keep the admin user as it's needed for the system to function