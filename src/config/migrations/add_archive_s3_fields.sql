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

-- Sample data for testing (optional - remove for production)
-- This creates some test archive items that match the frontend mock data
INSERT INTO archive_items (
    title, description, file_url, file_type, file_size, category, tags, 
    date_taken, location, person_related, s3_key, uploaded_by, status
) VALUES 
(
    'Wedding Certificate - John & Mary O''Sullivan',
    'Original marriage certificate from 1974',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'application/pdf',
    2400000,
    'Legal Documents',
    ARRAY['Marriage', 'Legal', '1970s'],
    '1974-06-12',
    'St. Patrick''s Church, Brooklyn',
    'John & Mary O''Sullivan',
    null, -- Will be updated when actual S3 files are uploaded
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'published'
),
(
    'Family Reunion Photos 1985',
    'Collection of 47 photos from the first official family reunion',
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'image/jpeg',
    130000000,
    'Family Events',
    ARRAY['Reunion', 'Photos', '1980s'],
    '1985-07-15',
    'Central Park, New York',
    'O''Sullivan Family',
    null,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'published'
),
(
    'Great-Grandfather''s Immigration Papers',
    'Ellis Island records and ship manifest from 1874',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'application/pdf',
    9100000,
    'Immigration Records',
    ARRAY['Immigration', 'Historical', '1870s'],
    '1874-09-03',
    'Ellis Island, New York',
    'Patrick O''Sullivan',
    null,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'published'
)
ON CONFLICT (id) DO NOTHING;