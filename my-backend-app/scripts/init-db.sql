-- Initialize database for GitHub API
-- This script runs during container initialization

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better text search performance
-- These will be created by migrations, but good to have for initial setup

-- Set timezone to UTC
SET timezone = 'UTC';

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'GitHub API database initialized successfully';
END $$;