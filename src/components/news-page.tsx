'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  Calendar, Clock, ExternalLink, Twitter, TrendingUp, Filter,
  Search, BookOpen, Zap, Globe, ArrowRight, Star, Share2,
  MessageCircle, Heart, Repeat2, Eye, ChevronDown, ChevronUp, Bell, CheckCircle
} from 'lucide-react';
import { useNewsCache } from '@/hooks/useNewsCache';

// Loading and error components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading latest news...</span>
  </div>
);

const ErrorMessage = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="text-center py-12">
    <div className="text-red-500 mb-4">{message}</div>
    <button
      onClick={onRetry}
      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
    >
      Try Again
    </button>
  </div>
);

import { NewsPageProps } from './types';

const NewsPage = ({ defaultTab = 'all', showTrending = false, className = '' }: NewsPageProps = {}) => {
  const [activeTab, setActiveTab] = useState(defaultTab); // all | twitter | ai-news | blog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest'); // latest | trending | engagement
  const [expandedNews, setExpandedNews] = useState<string[]>([]);

  // Data states
  const [twitterPosts, setTwitterPosts] = useState<any[]>([]);
  const [aiNews, setAiNews] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [backgroundFetchInProgress, setBackgroundFetchInProgress] = useState(false);

  // Cache and notification system
  const {
    cachedData,
    notification,
    isLoading: cacheLoading,
    saveCachedData,
    checkForUpdates,
    clearNotifications,
    hasCachedData
  } = useNewsCache();

  // Load data on component mount with smart caching
  useEffect(() => {
    if (!cacheLoading) {
      const initializeData = async () => {
        // If we have recent cached data (less than 30 minutes old), use it
        if (hasCachedData && cachedData) {
          const cacheAge = new Date().getTime() - new Date(cachedData.lastUpdated).getTime();
          const thirtyMinutes = 30 * 60 * 1000;

          if (cacheAge < thirtyMinutes) {
            // Use cached data if it's fresh
            setTwitterPosts(cachedData.twitterPosts || []);
            setAiNews(cachedData.aiNews || []);
            setBlogPosts(cachedData.blogPosts || []);
            setLoading(false);

            // Still check for updates in background
            fetchDataForComparison();
            return;
          }
        }

        // Otherwise, fetch fresh data
        await fetchAllData();
      };

      initializeData();
    }
  }, [cacheLoading, hasCachedData, cachedData]);

  const fetchDataForComparison = async () => {
    // Prevent multiple background fetches
    if (backgroundFetchInProgress) return;

    setBackgroundFetchInProgress(true);
    try {
      const [twitterResponse, newsResponse, blogResponse] = await Promise.all([
        fetch('/api/news/twitter').catch(() => null),
        fetch('/api/news/scrape').catch(() => null),
        fetch('/api/news/medium').catch(() => null)
      ]);

      let freshTwitter: any[] = [];
      let freshNews: any[] = [];
      let freshBlogs: any[] = [];

      if (twitterResponse && twitterResponse.ok) {
        const twitterData = await twitterResponse.json();
        if (twitterData.success) {
          freshTwitter = twitterData.data || [];
        }
      }

      if (newsResponse && newsResponse.ok) {
        const newsData = await newsResponse.json();
        if (newsData.success) {
          freshNews = newsData.data || [];
        }
      }

      if (blogResponse && blogResponse.ok) {
        const blogData = await blogResponse.json();
        if (blogData.success) {
          freshBlogs = blogData.data || [];
        }
      }

      // Check for new updates
      await checkForUpdates(freshTwitter, freshNews, freshBlogs);
    } catch (err) {
      console.error('Background fetch failed:', err);
    } finally {
      setBackgroundFetchInProgress(false);
    }
  };

  const fetchAllData = async (isManual = false) => {
    setLoading(true);
    setError(null);
    setIsManualRefresh(isManual);

    try {
      // Fetch Twitter posts, news, and blog posts in parallel
      const [twitterResponse, newsResponse, blogResponse] = await Promise.all([
        fetch('/api/news/twitter').catch(() => null),
        fetch('/api/news/scrape').catch(() => null),
        fetch('/api/news/medium').catch(() => null)
      ]);

      let freshTwitter: any[] = [];
      let freshNews: any[] = [];
      let freshBlogs: any[] = [];

      // Handle Twitter data
      if (twitterResponse && twitterResponse.ok) {
        const twitterData = await twitterResponse.json();
        if (twitterData.success) {
          freshTwitter = twitterData.data || [];
          setTwitterPosts(freshTwitter);
        }
      }

      // Handle news data
      if (newsResponse && newsResponse.ok) {
        const newsData = await newsResponse.json();
        if (newsData.success) {
          freshNews = newsData.data || [];
          setAiNews(freshNews);
        }
      }

      // Handle blog data
      if (blogResponse && blogResponse.ok) {
        const blogData = await blogResponse.json();
        if (blogData.success) {
          freshBlogs = blogData.data || [];
          setBlogPosts(freshBlogs);
        }
      }

      // Always save fresh data to cache, clear notifications if manual refresh
      await saveCachedData(freshTwitter, freshNews, freshBlogs);
      if (isManual) {
        clearNotifications();
      }

    } catch (err) {
      console.error('Failed to fetch news data:', err);
      setError('Failed to load news data. Please try again later.');
    } finally {
      setLoading(false);
      setIsManualRefresh(false);
    }
  };

  // Filter and sort logic
  const filteredContent = useMemo(() => {
    let content: any[] = [];

    if (activeTab === 'all' || activeTab === 'twitter') {
      content = [...content, ...twitterPosts.map(post => ({ ...post, type: 'twitter' }))];
    }

    if (activeTab === 'all' || activeTab === 'ai-news') {
      content = [...content, ...aiNews.map(news => ({ ...news, type: 'news' }))];
    }

    if (activeTab === 'all' || activeTab === 'blog') {
      content = [...content, ...blogPosts.map(blog => ({ ...blog, type: 'blog' }))];
    }

    // Apply search filter
    if (searchQuery) {
      content = content.filter(item => {
        if (item.type === 'twitter') {
          return item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.username.toLowerCase().includes(searchQuery.toLowerCase());
        } else if (item.type === 'blog') {
          return item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))) ||
            (item.author && item.author.toLowerCase().includes(searchQuery.toLowerCase()));
        } else {
          return item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        }
      });
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      content = content.filter(item => {
        if (item.type === 'news') {
          return item.category.toLowerCase() === selectedCategory.toLowerCase();
        } else if (item.type === 'blog') {
          // Blog posts can be filtered by tags
          return item.tags && item.tags.some((tag: string) =>
            tag.toLowerCase().includes(selectedCategory.toLowerCase())
          );
        }
        return true; // Twitter posts don't have categories
      });
    }

    // Apply sorting
    content.sort((a, b) => {
      if (sortBy === 'latest') {
        const aTime = a.type === 'twitter' ? a.timestamp :
          a.type === 'blog' ? a.publishedAt || a.timestamp :
            a.publishedAt;
        const bTime = b.type === 'twitter' ? b.timestamp :
          b.type === 'blog' ? b.publishedAt || b.timestamp :
            b.publishedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      } else if (sortBy === 'trending') {
        if (a.type === 'news' && b.type === 'news') {
          return (b.trending ? 1 : 0) - (a.trending ? 1 : 0);
        } else if (a.type === 'twitter' && b.type === 'twitter') {
          return (b.engagement === 'high' ? 2 : b.engagement === 'medium' ? 1 : 0) -
            (a.engagement === 'high' ? 2 : a.engagement === 'medium' ? 1 : 0);
        } else if (a.type === 'blog' && b.type === 'blog') {
          return (b.claps || 0) - (a.claps || 0);
        }
      } else if (sortBy === 'engagement') {
        if (a.type === 'twitter' && b.type === 'twitter') {
          return (b.likes + b.retweets + b.replies) - (a.likes + a.retweets + a.replies);
        } else if (a.type === 'blog' && b.type === 'blog') {
          return ((b.claps || 0) + (b.responses || 0)) - ((a.claps || 0) + (a.responses || 0));
        }
      }
      return 0;
    });

    return content;
  }, [activeTab, searchQuery, selectedCategory, sortBy, twitterPosts, aiNews, blogPosts]);

  const toggleNewsExpansion = (newsId: string) => {
    setExpandedNews(prev =>
      prev.includes(newsId)
        ? prev.filter(id => id !== newsId)
        : [...prev, newsId]
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">News & Updates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Latest updates from W3-Energy and AI-powered market insights</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification indicator */}
          {notification.hasNewUpdates ? (
            <div className="flex items-center gap-2 bg-secondary-50 dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 px-3 py-2 rounded-lg text-sm">
              <Bell className="w-4 h-4" />
              <span>
                {notification.newTwitterCount + notification.newNewsCount} new update{notification.newTwitterCount + notification.newNewsCount !== 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 px-3 py-2 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>News up to date</span>
            </div>
          )}

          <button
            onClick={() => fetchAllData(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            {loading ? (isManualRefresh ? 'Refreshing...' : 'Loading...') : 'Refresh'}
          </button>
          <a
            href="https://x.com/w3energy_org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-secondary-600 hover:to-secondary-700 transition-all"
          >
            <Twitter className="w-4 h-4" />
            Follow Us
          </a>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
          {([
            { id: 'all' as const, label: 'All Updates', icon: Globe },
            { id: 'blog' as const, label: 'Our Blog', icon: BookOpen },
            { id: 'twitter' as const, label: 'Twitter/X', icon: Twitter },
            { id: 'ai-news' as const, label: 'AI News', icon: Zap },
          ] as const).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search news, updates, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Categories</option>
            <option value="real estate">Real Estate</option>
            <option value="regulation">Regulation</option>
            <option value="esg">ESG</option>
            <option value="defi">DeFi</option>
            <option value="commodities">Commodities</option>
            <option value="renewable">Renewable Energy</option>
            <option value="tokenization">Tokenization</option>
            <option value="blockchain">Blockchain</option>
            <option value="sustainability">Sustainability</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="latest">Latest</option>
            <option value="trending">Trending</option>
            <option value="engagement">Most Engaged</option>
          </select>
        </div>
      </div>

      {/* Content Feed */}
      <div className="space-y-6">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchAllData} />
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No content matches your current filters.</p>
          </div>
        ) : (
          filteredContent.map((item) => (
            <div key={`${item.type}-${item.id}`}>
              {item.type === 'twitter' ? (
                <TwitterPostCard post={item} formatTimeAgo={formatTimeAgo} />
              ) : item.type === 'blog' ? (
                <BlogPostCard
                  post={item}
                  formatTimeAgo={formatTimeAgo}
                  isExpanded={expandedNews.includes(item.id)}
                  onToggleExpansion={() => toggleNewsExpansion(item.id)}
                />
              ) : (
                <NewsArticleCard
                  article={item}
                  formatTimeAgo={formatTimeAgo}
                  isExpanded={expandedNews.includes(item.id)}
                  onToggleExpansion={() => toggleNewsExpansion(item.id)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Twitter Post Card Component
const TwitterPostCard = ({ post, formatTimeAgo }: { post: any; formatTimeAgo: (timestamp: string) => string }) => (
  <article className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all hover:border-primary-300 dark:hover:border-primary-600">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
        <Image
          src={post.avatar}
          alt={post.username}
          width={48}
          height={48}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.className = 'w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0';
              parent.textContent = post.username.slice(0, 2).toUpperCase();
            }
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-gray-900 dark:text-white">{post.username}</h3>
          {post.verified && <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>}
          <span className="text-gray-500 dark:text-gray-400">{post.handle}</span>
          <span className="text-gray-400 dark:text-gray-500">·</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm">{formatTimeAgo(post.timestamp)}</span>
        </div>

        <p className="text-gray-900 dark:text-white mb-4 whitespace-pre-line">{post.content}</p>

        {post.images && post.images.length > 0 && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <Image
              src={post.images[0]}
              alt="Post image"
              width={600}
              height={300}
              className="w-full h-48 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400">
          <button className="flex items-center gap-2 hover:text-secondary-500 transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{post.replies}</span>
          </button>
          <button className="flex items-center gap-2 hover:text-primary-500 transition-colors">
            <Repeat2 className="w-4 h-4" />
            <span className="text-sm">{post.retweets}</span>
          </button>
          <button className="flex items-center gap-2 hover:text-primary-600 transition-colors">
            <Heart className="w-4 h-4" />
            <span className="text-sm">{post.likes}</span>
          </button>
          <button className="flex items-center gap-2 hover:text-secondary-500 transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </article>
);

// Blog Post Card Component
const BlogPostCard = ({
  post,
  formatTimeAgo,
  isExpanded,
  onToggleExpansion
}: {
  post: any;
  formatTimeAgo: (timestamp: string) => string;
  isExpanded: boolean;
  onToggleExpansion: () => void;
}) => (
  <article className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all hover:border-primary-300 dark:hover:border-primary-600">
    {post.image && (
      <div className="h-48 overflow-hidden">
        <Image
          src={post.image}
          alt={post.title}
          width={800}
          height={200}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
    )}

    <div className="p-6">
      <div className="flex items-center gap-3 mb-3">
        {post.author && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {post.author.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{post.author}</span>
          </div>
        )}
        {post.readTime && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{post.readTime} min read</span>
          </>
        )}
        <span className="text-gray-400">•</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatTimeAgo(post.publishedAt || post.timestamp)}
        </span>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{post.title}</h2>

      {post.summary && (
        <p className="text-gray-600 dark:text-gray-400 mb-4">{post.summary}</p>
      )}

      {isExpanded && post.content && post.content !== post.summary && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300">
            {post.content.substring(0, 800)}
            {post.content.length > 800 && '...'}
          </p>
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.slice(0, 6).map((tag: string, index: number) => (
            <span
              key={index}
              className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {post.claps && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              <span>{post.claps} claps</span>
            </div>
          )}
          {post.responses && (
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{post.responses} responses</span>
            </div>
          )}
          {post.source && (
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span>{post.source}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {post.content && post.content !== post.summary && (
            <button
              onClick={onToggleExpansion}
              className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Read More
                </>
              )}
            </button>
          )}
          {post.url && post.url !== '#' && (
            <button
              onClick={() => window.open(post.url, '_blank', 'noopener,noreferrer')}
              className="text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              title="Read full article on Medium"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  </article>
);

// News Article Card Component
const NewsArticleCard = ({
  article,
  formatTimeAgo,
  isExpanded,
  onToggleExpansion
}: {
  article: any;
  formatTimeAgo: (timestamp: string) => string;
  isExpanded: boolean;
  onToggleExpansion: () => void;
}) => (
  <article className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all hover:border-primary-300 dark:hover:border-primary-600">
    {article.image && (
      <div className="h-48 overflow-hidden">
        <Image
          src={article.image}
          alt={article.title}
          width={800}
          height={200}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
    )}

    <div className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${article.category === 'Real Estate' ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200' :
          article.category === 'Regulation' ? 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200' :
            article.category === 'ESG' ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200' :
              article.category === 'DeFi' ? 'bg-primary-200 text-primary-900 dark:bg-primary-800 dark:text-primary-100' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
          {article.category}
        </span>
        {article.trending && (
          <span className="flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-full text-xs font-semibold">
            <TrendingUp className="w-3 h-3" />
            Trending
          </span>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Zap className="w-3 h-3" />
          AI Confidence: {Math.round(article.confidence * 100)}%
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{article.title}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{article.summary}</p>

      {isExpanded && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300">{article.content}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {article.tags.map((tag: string) => (
          <span key={tag} className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatTimeAgo(article.publishedAt)}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {article.readTime} min read
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {article.source}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleExpansion}
            className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Read More
              </>
            )}
          </button>
          <button
            onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
            className="text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            title="Open article in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </article>
);

export default NewsPage;