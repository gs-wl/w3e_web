-- Create news_cache table for caching news data
CREATE TABLE IF NOT EXISTS news_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    twitter_posts JSONB DEFAULT '[]'::jsonb,
    ai_news JSONB DEFAULT '[]'::jsonb,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add blog_posts column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'news_cache' 
        AND column_name = 'blog_posts'
    ) THEN
        ALTER TABLE news_cache ADD COLUMN blog_posts JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Create index on cache_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_news_cache_key ON news_cache(cache_key);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_news_cache_expires ON news_cache(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_news_cache_updated_at 
    BEFORE UPDATE ON news_cache 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE news_cache IS 'Cache table for storing news data (Twitter posts, AI news, blog posts)';
COMMENT ON COLUMN news_cache.cache_key IS 'Unique identifier for the cache entry';
COMMENT ON COLUMN news_cache.twitter_posts IS 'JSON array of cached Twitter/X posts';
COMMENT ON COLUMN news_cache.ai_news IS 'JSON array of cached AI news articles';
COMMENT ON COLUMN news_cache.blog_posts IS 'JSON array of cached blog posts from Medium';
COMMENT ON COLUMN news_cache.expires_at IS 'Timestamp when this cache entry expires';
COMMENT ON COLUMN news_cache.version IS 'Cache version for compatibility';