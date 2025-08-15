-- Add gender column to family_members table
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS gender CHAR(1) 
CHECK (gender IN ('M', 'F'));