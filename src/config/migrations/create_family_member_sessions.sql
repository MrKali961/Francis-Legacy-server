-- Create family_member_sessions table for handling family member authentication sessions
-- This is separate from user_sessions to avoid foreign key constraint issues

CREATE TABLE IF NOT EXISTS family_member_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_member_sessions_token ON family_member_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_family_member_sessions_member_id ON family_member_sessions(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_member_sessions_active ON family_member_sessions(is_active);

-- Add comment to explain the purpose
COMMENT ON TABLE family_member_sessions IS 'Stores authentication sessions for family members (separate from admin user sessions)';