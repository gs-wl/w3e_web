'use client';

import { useState, useEffect, useCallback } from 'react';

interface CachedNewsData {
  twitterPosts: any[];
  aiNews: any[];
  blogPosts: any[];
  lastUpdated: string;
  version: number;
}

interface NewsNotification {
  hasNewUpdates: boolean;
  newTwitterCount: number;
  newNewsCount: number;
}

export const useNewsCache = () => {
  const [cachedData, setCachedData] = useState<CachedNewsData | null>(null);
  const [notification, setNotification] = useState<NewsNotification>({
    hasNewUpdates: false,
    newTwitterCount: 0,
    newNewsCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load cached data from JSON file on mount
  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = useCallback(async () => {
    try {
      const response = await fetch('/api/news/cache');
      const result = await response.json();
      
      if (result.success && result.data) {
        setCachedData(result.data);
      }
    } catch (error) {
      console.error('Error loading cached news data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCachedData = useCallback(async (twitterPosts: any[], aiNews: any[], blogPosts: any[] = []) => {
    try {
      const response = await fetch('/api/news/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ twitterPosts, aiNews, blogPosts }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const dataToCache: CachedNewsData = {
          twitterPosts,
          aiNews,
          blogPosts,
          lastUpdated: new Date().toISOString(),
          version: 1
        };
        
        setCachedData(dataToCache);
        
        // Clear notifications after manual update
        setNotification({
          hasNewUpdates: false,
          newTwitterCount: 0,
          newNewsCount: 0
        });
      }
    } catch (error) {
      console.error('Error saving news data to cache:', error);
    }
  }, []);

  const checkForUpdates = useCallback(async (currentTwitter: any[], currentNews: any[], currentBlogs: any[] = []) => {
    try {
      // Get the latest cached data from API
      const response = await fetch('/api/news/cache');
      const result = await response.json();
      
      if (!result.success || !result.data) return;
      
      const parsedData: CachedNewsData = result.data;
      
      // First check if the data is exactly the same (no changes at all)
      const isTwitterSame = currentTwitter.length === parsedData.twitterPosts.length &&
        currentTwitter.every(post => parsedData.twitterPosts.some(cached => cached.id === post.id));
      
      const isNewsSame = currentNews.length === parsedData.aiNews.length &&
        currentNews.every(article => parsedData.aiNews.some(cached => cached.id === article.id));
      
      const isBlogsSame = currentBlogs.length === (parsedData.blogPosts || []).length &&
        currentBlogs.every(blog => (parsedData.blogPosts || []).some(cached => cached.id === blog.id));
      
      if (isTwitterSame && isNewsSame && isBlogsSame) {
        // Data is identical - show "up to date" notification
        setNotification({
          hasNewUpdates: false,
          newTwitterCount: 0,
          newNewsCount: 0
        });
        return;
      }
      
      // Compare with fresh data to detect new items
      const newTwitterPosts = currentTwitter.filter(post => 
        !parsedData.twitterPosts.some(cached => cached.id === post.id)
      );
      
      const newNewsArticles = currentNews.filter(article => 
        !parsedData.aiNews.some(cached => cached.id === article.id)
      );
      
      const newBlogPosts = currentBlogs.filter(blog => 
        !(parsedData.blogPosts || []).some(cached => cached.id === blog.id)
      );

      if (newTwitterPosts.length > 0 || newNewsArticles.length > 0 || newBlogPosts.length > 0) {
        setNotification({
          hasNewUpdates: true,
          newTwitterCount: newTwitterPosts.length,
          newNewsCount: newNewsArticles.length
        });
      } else {
        // No new items but data structure might be different (removed items)
        setNotification({
          hasNewUpdates: false,
          newTwitterCount: 0,
          newNewsCount: 0
        });
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await fetch('/api/news/cache', { method: 'DELETE' });
      setCachedData(null);
      setNotification({
        hasNewUpdates: false,
        newTwitterCount: 0,
        newNewsCount: 0
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotification({
      hasNewUpdates: false,
      newTwitterCount: 0,
      newNewsCount: 0
    });
  }, []);

  return {
    cachedData,
    notification,
    isLoading,
    saveCachedData,
    checkForUpdates,
    clearCache,
    clearNotifications,
    hasCachedData: !!cachedData
  };
};