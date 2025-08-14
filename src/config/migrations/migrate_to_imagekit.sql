-- Migration: Migrate from S3 to ImageKit for archive storage
-- Date: 2025-01-14
-- Purpose: Replace S3 integration with ImageKit for better image processing and CDN

-- Add ImageKit file ID field to archive_items table
ALTER TABLE archive_items 
ADD COLUMN IF NOT EXISTS imagekit_file_id VARCHAR(255);

-- Create index on imagekit_file_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_archive_items_imagekit_file_id ON archive_items(imagekit_file_id);

-- Note: We keep the s3_key column temporarily for data migration purposes
-- After all data is migrated to ImageKit, the s3_key column can be dropped
-- DROP COLUMN s3_key; -- Uncomment after migration is complete

-- No sample data to migrate - all archive items will be created fresh through the application