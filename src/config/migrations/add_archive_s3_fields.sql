-- Migration: Add S3 integration fields to archive_items table
-- Date: 2025-01-14
-- Purpose: Enable S3 file storage integration for archives

-- Add missing fields to archive_items table
ALTER TABLE archive_items 
ADD COLUMN IF NOT EXISTS s3_key TEXT,
ADD COLUMN IF NOT EXISTS person_related VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status values to match our needs
ALTER TABLE archive_items 
DROP CONSTRAINT IF EXISTS archive_items_status_check;

ALTER TABLE archive_items 
ADD CONSTRAINT archive_items_status_check 
CHECK (status IN ('draft', 'published', 'archived', 'pending', 'approved', 'rejected'));

-- Create index on s3_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_archive_items_s3_key ON archive_items(s3_key);

-- Create index on person_related for searches
CREATE INDEX IF NOT EXISTS idx_archive_items_person_related ON archive_items(person_related);

-- Add updated_at trigger if not exists
DROP TRIGGER IF EXISTS update_archive_items_updated_at ON archive_items;
CREATE TRIGGER update_archive_items_updated_at
    BEFORE UPDATE ON archive_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data removed for production use
-- Archive items will be created through the application interface