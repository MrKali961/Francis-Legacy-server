-- Migration: Add username and authentication fields to family_members table
-- Date: 2025-08-17
-- Description: Transform family_members into authenticated users with auto-generated usernames

-- Add authentication fields to family_members
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Add username field to users table for consistency
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;

-- Create session storage for browser-close expiry
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_members_username ON family_members(username);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Add constraint to ensure either email or username exists for users
ALTER TABLE users 
ADD CONSTRAINT users_email_or_username_check 
CHECK (email IS NOT NULL OR username IS NOT NULL);

-- Function to generate unique username from name
CREATE OR REPLACE FUNCTION generate_username(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 1;
BEGIN
    -- Create base username from first and last name
    base_username := lower(trim(first_name)) || '.' || lower(trim(last_name));
    
    -- Remove any special characters and spaces
    base_username := regexp_replace(base_username, '[^a-z0-9.]', '', 'g');
    
    -- Start with base username
    final_username := base_username;
    
    -- Check if username exists and increment if needed
    WHILE EXISTS (
        SELECT 1 FROM family_members WHERE username = final_username
        UNION
        SELECT 1 FROM users WHERE username = final_username
    ) LOOP
        counter := counter + 1;
        final_username := base_username || counter::TEXT;
    END LOOP;
    
    RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Function to generate temporary password
CREATE OR REPLACE FUNCTION generate_temp_password()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    password TEXT := '';
    i INTEGER;
BEGIN
    -- Generate 8 character password
    FOR i IN 1..8 LOOP
        password := password || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    
    -- Add a number at the end for complexity
    password := password || floor(random() * 90 + 10)::TEXT;
    
    RETURN password;
END;
$$ LANGUAGE plpgsql;

-- Update existing family members to have usernames (if any exist)
UPDATE family_members 
SET username = generate_username(first_name, last_name)
WHERE username IS NULL AND first_name IS NOT NULL AND last_name IS NOT NULL;

-- Create a view to easily see family members with their auth status
CREATE OR REPLACE VIEW family_members_auth_view AS
SELECT 
    fm.id,
    fm.first_name,
    fm.last_name,
    fm.username,
    fm.password_changed,
    fm.is_active,
    fm.last_login,
    fm.created_at,
    CASE 
        WHEN fm.password_hash IS NOT NULL THEN 'Has Password'
        ELSE 'No Password'
    END as password_status,
    u.role as user_role
FROM family_members fm
LEFT JOIN users u ON fm.user_id = u.id
ORDER BY fm.first_name, fm.last_name;