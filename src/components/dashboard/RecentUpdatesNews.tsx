'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileText, Twitter, Newspaper, Clock, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useNewsCache } from '@/hooks/useNewsCache';

interface NewsItem {
  id: string;
  title: string;
  timeAgo: string;
  type: 'blog' | 'twitter' | 'news';
  content?: string;
  summary?: string;
  url?: string;
  source?: string;
  category?: string;
  tags?: string[];
  username?: string;
  handle?: string;
  avatar?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  verified?: boolean;
  timestamp?: string; // Original timestamp for sorting
  // Blog-specific fields
  author?: string;
  readTime?: number;
  claps?: number;
  responses?: number;
}

interface RecentUpdatesNewsProps {
  newsItems?: NewsItem[];
}

const defaultNewsItems: NewsItem[] = [
  // Blog posts
  {
    id: '1',
    title: 'New Partnership with EcoInnovate announced.',
    timeAgo: '2 hours ago',
    type: 'blog'
  },
  {
    id: '2',
    title: 'Q3 2024 Roadmap Update: What\'s coming next.',
    timeAgo: '1 day ago',
    type: 'blog'
  },
  {
    id: '3',
    title: 'How we are using blockchain to support sustainable projects.',
    timeAgo: '3 days ago',
    type: 'blog'
  },
  {
    id: '4',
    title: 'Understanding RWA tokenization and its impact on traditional finance.',
    timeAgo: '5 days ago',
    type: 'blog'
  },
  {
    id: '5',
    title: 'Deep dive into our staking rewards mechanism.',
    timeAgo: '1 week ago',
    type: 'blog'
  },
  {
    id: '6',
    title: 'Community governance proposal: New voting system.',
    timeAgo: '1 week ago',
    type: 'blog'
  },
  {
    id: '7',
    title: 'Security audit results and platform improvements.',
    timeAgo: '2 weeks ago',
    type: 'blog'
  },

  // Twitter posts
  {
    id: '8',
    title: 'Major breakthrough in renewable energy tokenization announced! 🚀',
    timeAgo: '5 hours ago',
    type: 'twitter'
  },
  {
    id: '9',
    title: 'Just launched our new staking dashboard! Check it out 👀',
    timeAgo: '8 hours ago',
    type: 'twitter'
  },
  {
    id: '10',
    title: 'Community AMA session scheduled for next week. Submit your questions!',
    timeAgo: '12 hours ago',
    type: 'twitter'
  },
  {
    id: '11',
    title: 'Partnership announcement coming soon... Stay tuned! 👀',
    timeAgo: '1 day ago',
    type: 'twitter'
  },
  {
    id: '12',
    title: 'New whitelist spots available! Don\'t miss out on early access.',
    timeAgo: '2 days ago',
    type: 'twitter'
  },
  {
    id: '13',
    title: 'Celebrating 10K followers! Thank you for your support 🎉',
    timeAgo: '3 days ago',
    type: 'twitter'
  },
  {
    id: '14',
    title: 'Weekly market update: RWA sector showing strong growth.',
    timeAgo: '4 days ago',
    type: 'twitter'
  },

  // AI News
  {
    id: '15',
    title: 'Global renewable energy market reaches new milestone.',
    timeAgo: '1 day ago',
    type: 'news'
  },
  {
    id: '16',
    title: 'AI-powered trading algorithms show 40% improvement in DeFi protocols.',
    timeAgo: '6 hours ago',
    type: 'news'
  },
  {
    id: '17',
    title: 'Machine learning models predict next bull run in crypto markets.',
    timeAgo: '10 hours ago',
    type: 'news'
  },
  {
    id: '18',
    title: 'Blockchain AI integration reaches new heights with smart contracts.',
    timeAgo: '1 day ago',
    type: 'news'
  },
  {
    id: '19',
    title: 'Automated yield farming strategies powered by AI show promising results.',
    timeAgo: '2 days ago',
    type: 'news'
  },
  {
    id: '20',
    title: 'Neural networks optimize gas fees across multiple blockchain networks.',
    timeAgo: '3 days ago',
    type: 'news'
  },
  {
    id: '21',
    title: 'AI sentiment analysis predicts market volatility with 85% accuracy.',
    timeAgo: '4 days ago',
    type: 'news'
  },
  {
    id: '22',
    title: 'Decentralized AI models revolutionize predictive analytics in DeFi.',
    timeAgo: '5 days ago',
    type: 'news'
  }
];

const RecentUpdatesNews = ({ newsItems = defaultNewsItems }: RecentUpdatesNewsProps) => {
  const [activeTab, setActiveTab] = useState<'blog' | 'twitter' | 'news'>('blog');
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [realNewsData, setRealNewsData] = useState<{
    twitterPosts: any[];
    aiNews: any[];
    blogPosts: any[];
  }>({ twitterPosts: [], aiNews: [], blogPosts: [] });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { cachedData, hasCachedData } = useNewsCache();

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      // If we have recent cached data (less than 30 minutes old), use it
      if (hasCachedData && cachedData) {
        const cacheAge = new Date().getTime() - new Date(cachedData.lastUpdated).getTime();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (cacheAge < thirtyMinutes) {
          // Use cached data if it's fresh
          setRealNewsData({
            twitterPosts: cachedData.twitterPosts || [],
            aiNews: cachedData.aiNews || [],
            blogPosts: cachedData.blogPosts || []
          });
          return;
        }
      }
      
      // Otherwise, fetch fresh data
      await loadRealNewsData();
    };
    
    initializeData();
  }, [cachedData, hasCachedData]);

  const loadRealNewsData = async () => {
    setLoading(true);
    try {
      // Fetch real news data in parallel
      const [twitterResponse, newsResponse, blogResponse] = await Promise.all([
        fetch('/api/news/twitter').catch(() => null),
        fetch('/api/news/scrape').catch(() => null),
        fetch('/api/news/medium').catch(() => null)
      ]);

      let twitterPosts: any[] = [];
      let aiNews: any[] = [];
      let blogPosts: any[] = [];

      if (twitterResponse && twitterResponse.ok) {
        const twitterData = await twitterResponse.json();
        if (twitterData.success) {
          twitterPosts = twitterData.data || [];
        }
      }

      if (newsResponse && newsResponse.ok) {
        const newsData = await newsResponse.json();
        if (newsData.success) {
          aiNews = newsData.data || [];
        }
      }

      if (blogResponse && blogResponse.ok) {
        const blogData = await blogResponse.json();
        if (blogData.success) {
          blogPosts = blogData.data || [];
        }
      }

      setRealNewsData({ twitterPosts, aiNews, blogPosts });
      
      // Save fresh data to cache
      try {
        await fetch('/api/news/cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ twitterPosts, aiNews, blogPosts })
        });
      } catch (cacheError) {
        console.error('Failed to save data to cache:', cacheError);
      }
    } catch (error) {
      console.error('Failed to load real news data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert real news data to the format expected by the component
  const convertToNewsItems = (): NewsItem[] => {
    const items: NewsItem[] = [];

    // Add real blog posts from Medium (or AI-generated fallback)
    const blogItems: NewsItem[] = realNewsData.blogPosts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      summary: post.summary,
      timeAgo: formatTimeAgo(post.publishedAt || post.timestamp),
      type: 'blog' as const,
      url: post.url,
      source: post.source,
      tags: post.tags,
      timestamp: post.publishedAt || post.timestamp,
      // Medium-specific fields
      author: post.author,
      readTime: post.readTime,
      claps: post.claps,
      responses: post.responses
    }));

    // Sort blog posts by timestamp (most recent first) and take top 8
    const sortedBlogItems = blogItems
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);
    items.push(...sortedBlogItems);

    // If no real blog posts, fall back to default mock data
    if (sortedBlogItems.length === 0) {
      const fallbackBlogPosts = defaultNewsItems.filter(item => item.type === 'blog');
      items.push(...fallbackBlogPosts);
    }

    // Add real Twitter posts with full data and timestamp for sorting
    const twitterItems: NewsItem[] = realNewsData.twitterPosts.map(post => ({
      id: post.id,
      title: post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content,
      content: post.content,
      timeAgo: formatTimeAgo(post.timestamp),
      type: 'twitter' as const,
      username: post.username,
      handle: post.handle,
      avatar: post.avatar,
      likes: post.likes,
      retweets: post.retweets,
      replies: post.replies,
      verified: post.verified,
      url: `https://x.com/${post.handle?.replace('@', '') || 'w3energy_org'}`,
      source: 'X (Twitter)',
      timestamp: post.timestamp // Keep original timestamp for sorting
    }));

    // Sort Twitter posts by timestamp (most recent first) and take top 8
    const sortedTwitterItems = twitterItems
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);
    items.push(...sortedTwitterItems);

    // Add real AI news with full data and timestamp for sorting
    const newsItems: NewsItem[] = realNewsData.aiNews.map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      timeAgo: formatTimeAgo(article.publishedAt),
      type: 'news' as const,
      url: article.url,
      source: article.source,
      category: article.category,
      tags: article.tags,
      timestamp: article.publishedAt // Keep original timestamp for sorting
    }));

    // Sort AI news by timestamp (most recent first) and take top 8
    const sortedNewsItems = newsItems
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);
    items.push(...sortedNewsItems);

    return items;
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

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const openExternalLink = (url: string) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const allNewsItems = convertToNewsItems();
  const filteredNews = allNewsItems
    .filter(item => item.type === activeTab)
    .sort((a, b) => {
      // Sort by timestamp if available, otherwise use timeAgo parsing
      if (a.timestamp && b.timestamp) {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }

      // Fallback: parse timeAgo for sorting (most recent first)
      const parseTimeAgo = (timeAgo: string): number => {
        if (timeAgo.includes('Just now')) return 0;
        if (timeAgo.includes('h ago')) return parseInt(timeAgo) || 0;
        if (timeAgo.includes('day')) return (parseInt(timeAgo) || 0) * 24;
        if (timeAgo.includes('week')) return (parseInt(timeAgo) || 0) * 24 * 7;
        return 999; // Very old items
      };

      return parseTimeAgo(a.timeAgo) - parseTimeAgo(b.timeAgo);
    });

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setShowScrollIndicator(!isAtBottom);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Check initial scroll state
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [filteredNews]);

  useEffect(() => {
    // Reset scroll indicator when tab changes
    setShowScrollIndicator(filteredNews.length > 4);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeTab, filteredNews.length]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'blog':
        return <FileText className="text-blue-500" />;
      case 'twitter':
        return <Twitter className="text-blue-400" />;
      case 'news':
        return <Newspaper className="text-green-500" />;
      default:
        return <FileText className="text-blue-500" />;
    }
  };

  const tabs = [
    { id: 'blog', label: 'Our Blog', icon: FileText },
    { id: 'twitter', label: 'Twitter', icon: Twitter },
    { id: 'news', label: 'AI News', icon: Newspaper }
  ];

  // Twitter Expanded Content Component
  const TwitterExpandedContent = ({ item }: { item: NewsItem }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        {item.avatar && (
          <div className="w-6 h-6 rounded-full overflow-hidden">
            <img
              src={item.avatar}
              alt={item.username}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-1 text-sm">
          <span className="font-medium text-gray-900 dark:text-white">{item.username}</span>
          {item.verified && (
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          <span className="text-gray-500 dark:text-gray-400">{item.handle}</span>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-line">
        {item.content}
      </p>

      {(item.likes || item.retweets || item.replies) && (
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          {item.replies && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              {item.replies}
            </span>
          )}
          {item.retweets && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
              </svg>
              {item.retweets}
            </span>
          )}
          {item.likes && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              {item.likes}
            </span>
          )}
        </div>
      )}
    </div>
  );

  // Blog Expanded Content Component
  const BlogExpandedContent = ({ item }: { item: NewsItem }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
      {item.author && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {item.author.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.author}</span>
          {item.readTime && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.readTime} min read</span>
            </>
          )}
        </div>
      )}
      
      {item.summary && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {item.summary}
        </p>
      )}
      
      {item.content && item.content !== item.summary && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {item.content.substring(0, 400)}
          {item.content.length > 400 && '...'}
        </p>
      )}
      
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 4).map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {((item as any).claps || (item as any).responses) && (
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          {(item as any).claps && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              {(item as any).claps} claps
            </span>
          )}
          {(item as any).responses && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              {(item as any).responses} responses
            </span>
          )}
        </div>
      )}
    </div>
  );

  // News Expanded Content Component
  const NewsExpandedContent = ({ item }: { item: NewsItem }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
      {item.category && (
        <div className="mb-2">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${item.category === 'Real Estate' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
            item.category === 'Regulation' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
              item.category === 'ESG' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                item.category === 'DeFi' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
            {item.category}
          </span>
        </div>
      )}

      {item.summary && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {item.summary}
        </p>
      )}

      {item.content && item.content !== item.summary && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {item.content.substring(0, 300)}
          {item.content.length > 300 && '...'}
        </p>
      )}

      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.slice(0, 4).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Updates & News</h2>
        <button
          onClick={loadRealNewsData}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
          title="Refresh news"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const hasRealData = tab.id === 'twitter' ? realNewsData.twitterPosts.length > 0 :
            tab.id === 'news' ? realNewsData.aiNews.length > 0 :
            tab.id === 'blog' ? realNewsData.blogPosts.length > 0 : true;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'blog' | 'twitter' | 'news')}
              className={`flex-1 py-2 px-4 text-center font-semibold transition-colors relative ${activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {hasRealData && (tab.id === 'twitter' || tab.id === 'news' || tab.id === 'blog') && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Live data" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* News Items */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 scroll-smooth"
        >
          {filteredNews.length > 0 ? (
            filteredNews.map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              const hasExpandableContent = (item.type === 'twitter' && item.content) ||
                (item.type === 'news' && (item.summary || item.content)) ||
                (item.type === 'blog' && (item.summary || item.content));

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm leading-relaxed">
                        {item.title}
                      </p>

                      {/* Expanded Content */}
                      {isExpanded && hasExpandableContent && (
                        <div className="mt-3 space-y-3">
                          {item.type === 'twitter' && (
                            <TwitterExpandedContent item={item} />
                          )}
                          {item.type === 'news' && (
                            <NewsExpandedContent item={item} />
                          )}
                          {item.type === 'blog' && (
                            <BlogExpandedContent item={item} />
                          )}
                        </div>
                      )}

                      {/* Footer with time and actions */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span>{item.timeAgo}</span>
                          {item.source && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{item.source}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {hasExpandableContent && (
                            <button
                              onClick={() => toggleItemExpansion(item.id)}
                              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  Read More
                                </>
                              )}
                            </button>
                          )}

                          {item.url && item.url !== '#' && (
                            <button
                              onClick={() => openExternalLink(item.url!)}
                              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Source
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No {activeTab} updates available</p>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        {showScrollIndicator && filteredNews.length > 4 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none flex items-end justify-center pb-2">
            <div className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">
              Scroll for more
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentUpdatesNews;