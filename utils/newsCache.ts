// News cache utilities - now using Supabase instead of local JSON files
const CACHE_EXPIRY_HOURS = 24;

interface CachedNewsData {
  twitterPosts: any[];
  aiNews: any[];
  lastUpdated: string;
  version: number;
}

// Function to check and clean expired cache from Supabase
export async function cleanupExpiredCache(): Promise<{ cleaned: boolean; message: string }> {
  try {
    const response = await fetch('/api/news/cleanup', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to cleanup cache: ${response.status}`);
    }

    const result = await response.json();
    return {
      cleaned: result.cleaned || false,
      message: result.message || 'Cache cleanup completed'
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