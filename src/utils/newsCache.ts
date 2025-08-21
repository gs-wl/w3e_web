import { getSupabase } from '@/lib/supabase';

const CACHE_EXPIRY_HOURS = 24;
const CACHE_KEY = 'main_news_cache';

interface CachedNewsData {
  twitterPosts: any[];
  aiNews: any[];
  blogPosts: any[];
  lastUpdated: string;
  version: number;
}

// Function to get cached news data
export async function getCachedNewsData(): Promise<{ success: boolean; data?: CachedNewsData; message?: string }> {
  try {
    const supabase = getSupabase();
    const { data: cacheData, error } = await supabase
      .from('news_cache')
      .select('*')
      .eq('cache_key', CACHE_KEY)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error reading cache from Supabase:', error);
      return {
        success: false,
        message: 'Error reading cache'
      };
    }

    if (!cacheData) {
      return {
        success: false,
        message: 'No cache found or cache expired'
      };
    }

    return {
      success: true,
      data: {
        twitterPosts: cacheData.twitter_posts || [],
        aiNews: cacheData.ai_news || [],
        blogPosts: cacheData.blog_posts || [],
        lastUpdated: cacheData.last_updated,
        version: cacheData.version || 1
      }
    };
  } catch (error) {
    console.error('Error getting cached news data:', error);
    return {
      success: false,
      message: `Error getting cache: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Function to save news data to cache
export async function saveCachedNewsData(twitterPosts: any[], aiNews: any[], blogPosts: any[] = []): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000));

    const { error } = await supabase
      .from('news_cache')
      .upsert({
        cache_key: CACHE_KEY,
        twitter_posts: twitterPosts,
        ai_news: aiNews,
        blog_posts: blogPosts,
        last_updated: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        version: 1
      }, {
        onConflict: 'cache_key'
      });

    if (error) {
      console.error('Error saving cache to Supabase:', error);
      return {
        success: false,
        message: 'Error saving cache'
      };
    }

    return {
      success: true,
      message: 'Cache updated successfully'
    };
  } catch (error) {
    console.error('Error saving cached news data:', error);
    return {
      success: false,
      message: `Error saving cache: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Function to clear cache
export async function clearCachedNewsData(): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('news_cache')
      .delete()
      .eq('cache_key', CACHE_KEY);

    if (error) {
      console.error('Error clearing cache from Supabase:', error);
      return {
        success: false,
        message: 'Error clearing cache'
      };
    }

    return {
      success: true,
      message: 'Cache cleared successfully'
    };
  } catch (error) {
    console.error('Error clearing cached news data:', error);
    return {
      success: false,
      message: `Error clearing cache: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Function to check and clean expired cache
export async function cleanupExpiredCache(): Promise<{ cleaned: boolean; message: string }> {
  try {
    const supabase = getSupabase();
    const { data: expiredCache, error: selectError } = await supabase
      .from('news_cache')
      .select('id, cache_key, expires_at')
      .lt('expires_at', new Date().toISOString());

    if (selectError) {
      console.error('Error checking expired cache:', selectError);
      return {
        cleaned: false,
        message: 'Error checking expired cache'
      };
    }

    if (!expiredCache || expiredCache.length === 0) {
      return {
        cleaned: false,
        message: 'No expired cache found'
      };
    }

    const { error: deleteError } = await supabase
      .from('news_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (deleteError) {
      console.error('Error deleting expired cache:', deleteError);
      return {
        cleaned: false,
        message: 'Error deleting expired cache'
      };
    }

    return {
      cleaned: true,
      message: `Cleaned up ${expiredCache.length} expired cache entries`
    };
  } catch (error) {
    console.error('Error during cache cleanup:', error);
    return {
      cleaned: false,
      message: `Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export { CACHE_EXPIRY_HOURS };
export type { CachedNewsData };