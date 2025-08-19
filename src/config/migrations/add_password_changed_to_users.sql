-- Migration: Add password_changed column to users table
-- Date: 2025-08-18
-- Description: Add missing password_changed column to users table for password change tracking

-- Add password_changed field to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE;

-- Update existing users to require password change (admin should change default password)
UPDATE users 
SET password_changed = FALSE 
WHERE password_changed IS NULL;

-- Create index for better performance on password_changed queries
CREATE INDEX IF NOT EXISTS idx_users_password_changed ON users(password_changed);