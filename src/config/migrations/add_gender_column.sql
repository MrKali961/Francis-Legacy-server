-- Add gender column to family_members table
-- This column will store gender information for family members

ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS gender VARCHAR(1) CHECK (gender IN ('M', 'F', NULL));

-- Add an index for better performance when querying by gender
CREATE INDEX IF NOT EXISTS idx_family_members_gender ON family_members(gender);

-- Optional: Add comments to explain the column
COMMENT ON COLUMN family_members.gender IS 'Gender of family member: M (Male), F (Female), or NULL (unknown/not specified)';