-- Add generation column to family_members table
-- This column will help track generational relationships in the family tree

ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS generation INTEGER;

-- Add an index for better performance when querying by generation
CREATE INDEX IF NOT EXISTS idx_family_members_generation ON family_members(generation);

-- Optional: Add some sample generation data based on relationships
-- Generation 1 = oldest generation (great-grandparents)
-- Generation 2 = grandparents
-- Generation 3 = parents
-- Generation 4 = current generation
-- Generation 5 = children, etc.

-- You can manually update generation values based on your family tree structure
-- Example:
-- UPDATE family_members SET generation = 1 WHERE birth_date < '1930-01-01';
-- UPDATE family_members SET generation = 2 WHERE birth_date BETWEEN '1930-01-01' AND '1950-01-01';
-- UPDATE family_members SET generation = 3 WHERE birth_date BETWEEN '1950-01-01' AND '1970-01-01';
-- UPDATE family_members SET generation = 4 WHERE birth_date BETWEEN '1970-01-01' AND '1990-01-01';
-- UPDATE family_members SET generation = 5 WHERE birth_date > '1990-01-01';