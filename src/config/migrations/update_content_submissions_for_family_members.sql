-- Migration: Update content_submissions table to support family member submissions
-- This allows both admin users and family members to submit content

-- Add columns to support family member submissions
ALTER TABLE content_submissions 
    ADD COLUMN IF NOT EXISTS submitted_by_family_member UUID REFERENCES family_members(id),
    ADD COLUMN IF NOT EXISTS submitter_type VARCHAR(20) DEFAULT 'user' CHECK (submitter_type IN ('user', 'family_member'));

-- Update the constraint to allow either user or family member submissions
ALTER TABLE content_submissions 
    DROP CONSTRAINT IF EXISTS content_submissions_submitted_by_fkey;

-- Add a constraint to ensure either submitted_by or submitted_by_family_member is set, but not both
ALTER TABLE content_submissions 
    ADD CONSTRAINT check_submitter_reference 
    CHECK (
        (submitted_by IS NOT NULL AND submitted_by_family_member IS NULL AND submitter_type = 'user') OR
        (submitted_by IS NULL AND submitted_by_family_member IS NOT NULL AND submitter_type = 'family_member')
    );

-- Re-add the foreign key constraint for users (but make it optional)
ALTER TABLE content_submissions 
    ADD CONSTRAINT content_submissions_submitted_by_fkey 
    FOREIGN KEY (submitted_by) REFERENCES users(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_submissions_family_member ON content_submissions(submitted_by_family_member);
CREATE INDEX IF NOT EXISTS idx_content_submissions_submitter_type ON content_submissions(submitter_type);

-- Add a view to easily get submission details with submitter information
CREATE OR REPLACE VIEW content_submissions_with_submitter AS
SELECT 
    cs.*,
    CASE 
        WHEN cs.submitter_type = 'user' THEN u.first_name
        WHEN cs.submitter_type = 'family_member' THEN fm.first_name
    END as submitter_first_name,
    CASE 
        WHEN cs.submitter_type = 'user' THEN u.last_name
        WHEN cs.submitter_type = 'family_member' THEN fm.last_name
    END as submitter_last_name,
    CASE 
        WHEN cs.submitter_type = 'user' THEN u.email
        WHEN cs.submitter_type = 'family_member' THEN fm.username
    END as submitter_identifier
FROM content_submissions cs
LEFT JOIN users u ON cs.submitted_by = u.id AND cs.submitter_type = 'user'
LEFT JOIN family_members fm ON cs.submitted_by_family_member = fm.id AND cs.submitter_type = 'family_member';