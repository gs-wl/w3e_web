'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Zap, RefreshCw, ExternalLink, LayoutGrid, Play, Pause } from 'lucide-react';

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number;
  image: string;
  sparkline_in_7d?: {
    price: number[];
  };
}

interface CryptoPriceTrackerProps {
  className?: string;
}

interface PriceChangeAnimation {
  [key: string]: 'up' | 'down' | null;
}

const CryptoPriceTracker = ({ className = '' }: CryptoPriceTrackerProps) => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [priceAnimations, setPriceAnimations] = useState<PriceChangeAnimation>({});
  
  // View mode state - sliding is default
  const [viewMode, setViewMode] = useState<'sliding' | 'table'>('sliding');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  
  // Auto-scroll management
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const isScrollingRef = React.useRef<boolean>(false);
  const lastScrollTimeRef = React.useRef<number>(0);

  const fetchCryptoData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/crypto-prices?limit=10');
      
      if (!response.ok) {
        throw new Error('Failed to fetch cryptocurrency data');
      }
      
      const data: CryptoData[] = await response.json();
      
      // Detect price changes for animations
      if (cryptoData.length > 0) {
        const newAnimations: PriceChangeAnimation = {};
        data.forEach(newCrypto => {
          const oldCrypto = cryptoData.find(c => c.id === newCrypto.id);
          if (oldCrypto && oldCrypto.current_price !== newCrypto.current_price) {
            newAnimations[newCrypto.id] = newCrypto.current_price > oldCrypto.current_price ? 'up' : 'down';
          }
        });
        setPriceAnimations(newAnimations);
        
        // Clear animations after 2 seconds
        setTimeout(() => setPriceAnimations({}), 2000);
      }
      
      setCryptoData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCryptoData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCryptoData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Robust auto-scroll implementation
  const startAutoScroll = React.useCallback(() => {
    // Prevent multiple scroll instances
    if (isScrollingRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container || isHovered || !isPlaying || viewMode !== 'sliding') {
      return;
    }

    isScrollingRef.current = true;
    const scrollSpeed = 0.5; // Reduced speed for smoother scrolling
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      // Check if we should continue scrolling
      if (!container || isHovered || !isPlaying || viewMode !== 'sliding' || !isScrollingRef.current) {
        isScrollingRef.current = false;
        return;
      }

      // Throttle to ~60fps for better performance
      const deltaTime = currentTime - lastTime;
      if (deltaTime < 16) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;

      try {
        const currentScroll = container.scrollLeft;
        const scrollWidth = container.scrollWidth;
        const containerWidth = container.clientWidth;
        const halfWidth = (scrollWidth - containerWidth) / 2;

        // More precise reset logic
        if (currentScroll >= halfWidth) {
          // Smooth reset to avoid jarring jump
          container.scrollLeft = 0;
          lastScrollTimeRef.current = currentTime;
        } else {
          // Apply scroll increment
          const newScrollPosition = currentScroll + scrollSpeed;
          container.scrollLeft = newScrollPosition;
        }

        // Continue animation
        animationFrameRef.current = requestAnimationFrame(animate);
      } catch (error) {
        console.warn('Auto-scroll error:', error);
        isScrollingRef.current = false;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isHovered, isPlaying, viewMode]);

  // Stop auto-scroll with proper cleanup
  const stopAutoScroll = React.useCallback(() => {
    isScrollingRef.current = false;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Auto-scroll effect with better dependency management
  useEffect(() => {
    // Always stop first to prevent overlapping animations
    stopAutoScroll();
    
    // Start if conditions are met
    if (viewMode === 'sliding' && isPlaying && cryptoData.length > 0 && !isHovered) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        startAutoScroll();
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        stopAutoScroll();
      };
    }

    return stopAutoScroll;
  }, [viewMode, isPlaying, cryptoData.length, isHovered, startAutoScroll, stopAutoScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  // Handle visibility change to pause/resume scrolling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoScroll();
      } else if (viewMode === 'sliding' && isPlaying && !isHovered) {
        setTimeout(startAutoScroll, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [viewMode, isPlaying, isHovered, startAutoScroll, stopAutoScroll]);

  // Recovery mechanism - restart scrolling if it gets stuck
  useEffect(() => {
    if (viewMode !== 'sliding' || !isPlaying || isHovered) {
      return;
    }

    const recoveryInterval = setInterval(() => {
      const container = scrollContainerRef.current;
      if (container && !isScrollingRef.current && isPlaying && !isHovered) {
        console.log('Auto-scroll recovery: restarting scrolling');
        startAutoScroll();
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(recoveryInterval);
  }, [viewMode, isPlaying, isHovered, startAutoScroll]);





  const formatPrice = (price: number) => {
    if (price < 1) {
      return `$${price.toFixed(6)}`;
    } else if (price < 100) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    } else {
      return `$${marketCap.toLocaleString()}`;
    }
  };

  const MiniSparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length === 0) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    
    if (range === 0) return null;

    const points = data.map((price, index) => {
      const x = (index / (data.length - 1)) * 60;
      const y = 20 - ((price - min) / range) * 20;
      return `${x},${y}`;
    }).join(' ');

    const isPositive = data[data.length - 1] > data[0];

    return (
      <svg width="60" height="20" className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth="1.5"
          className="drop-shadow-sm"
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Cryptocurrencies</h2>
          <div className="animate-spin">
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/6"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Cryptocurrencies</h2>
          <button
            onClick={fetchCryptoData}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchCryptoData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Cryptocurrencies</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Live prices from CoinGecko
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('sliding')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                  viewMode === 'sliding' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Sliding View"
              >
                <Play className="w-3 h-3" />
                <span className="hidden sm:inline">Sliding</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                  viewMode === 'table' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Table View"
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {/* Play/Pause for sliding view */}
            {viewMode === 'sliding' && (
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={isPlaying ? 'Pause sliding' : 'Resume sliding'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-gray-400" />
                ) : (
                  <Play className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}

            {lastUpdated && (
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchCryptoData}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {viewMode === 'sliding' ? (
          /* Horizontal Scrollable Ticker View */
          <div className="h-20 relative bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            {/* Scrollable container */}
            <div 
              ref={scrollContainerRef}
              className="h-full overflow-hidden scrollbar-hide"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onTouchStart={() => setIsHovered(true)}
              onTouchEnd={() => setIsHovered(false)}
              style={{ 
                scrollBehavior: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex items-center h-full w-max">
                {/* First set of cryptos */}
                {cryptoData.map((crypto, index) => (
                  <div
                    key={`first-${crypto.id}`}
                    className="flex items-center gap-4 px-8 py-4 flex-shrink-0 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer"
                  >
                    {/* Crypto Icon */}
                    <img
                      src={crypto.image}
                      alt={crypto.name}
                      className="w-8 h-8 rounded-full shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/api/placeholder/32/32';
                      }}
                    />
                    
                    {/* Symbol */}
                    <div className="font-bold text-gray-900 dark:text-white text-sm min-w-0">
                      {crypto.symbol.toUpperCase()}
                    </div>
                    
                    {/* Price */}
                    <div className={`font-semibold text-sm transition-all duration-300 ${
                      priceAnimations[crypto.id] === 'up' ? 'text-green-600 dark:text-green-400' :
                      priceAnimations[crypto.id] === 'down' ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-900 dark:text-white'
                    }`}>
                      ${formatPrice(crypto.current_price)}
                    </div>
                    
                    {/* Change */}
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      crypto.price_change_percentage_24h >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {crypto.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                    </div>
                    
                    {/* Separator */}
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                  </div>
                ))}
                
                {/* Duplicate set for seamless loop */}
                {cryptoData.map((crypto, index) => (
                  <div
                    key={`second-${crypto.id}`}
                    className="flex items-center gap-4 px-8 py-4 flex-shrink-0 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer"
                  >
                    {/* Crypto Icon */}
                    <img
                      src={crypto.image}
                      alt={crypto.name}
                      className="w-8 h-8 rounded-full shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/api/placeholder/32/32';
                      }}
                    />
                    
                    {/* Symbol */}
                    <div className="font-bold text-gray-900 dark:text-white text-sm min-w-0">
                      {crypto.symbol.toUpperCase()}
                    </div>
                    
                    {/* Price */}
                    <div className={`font-semibold text-sm transition-all duration-300 ${
                      priceAnimations[crypto.id] === 'up' ? 'text-green-600 dark:text-green-400' :
                      priceAnimations[crypto.id] === 'down' ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-900 dark:text-white'
                    }`}>
                      ${formatPrice(crypto.current_price)}
                    </div>
                    
                    {/* Change */}
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      crypto.price_change_percentage_24h >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {crypto.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                    </div>
                    
                    {/* Separator */}
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Gradient overlays for smooth edges */}
            <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800 dark:to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-gray-50 to-transparent dark:from-gray-800 dark:to-transparent pointer-events-none"></div>
            
            {/* Status indicator */}
            <div className="absolute bottom-1 right-4 text-xs pointer-events-none">
              {isPlaying && !isHovered ? (
                <span className="text-green-500 font-medium">● Auto-scrolling</span>
              ) : isHovered ? (
                <span className="text-blue-500 font-medium">● Hover paused</span>
              ) : (
                <span className="text-gray-400 font-medium">● Paused</span>
              )}
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {cryptoData.map((crypto, index) => (
                <div
                  key={crypto.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
                  style={{
                    animation: `slideInUp 0.3s ease-out ${index * 0.05}s both`
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <img
                        src={crypto.image}
                        alt={crypto.name}
                        className="w-8 h-8 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/api/placeholder/32/32';
                        }}
                      />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {crypto.market_cap_rank}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                        {crypto.symbol.toUpperCase()}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {crypto.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {crypto.sparkline_in_7d?.price && (
                      <div className="hidden lg:block">
                        <MiniSparkline data={crypto.sparkline_in_7d.price} />
                      </div>
                    )}
                    
                    <div className="text-right">
                      <div className={`font-bold text-gray-900 dark:text-white text-sm transition-all duration-300 ${
                        priceAnimations[crypto.id] === 'up' ? 'text-green-600 dark:text-green-400 animate-pulse' :
                        priceAnimations[crypto.id] === 'down' ? 'text-red-600 dark:text-red-400 animate-pulse' : ''
                      }`}>
                        ${formatPrice(crypto.current_price)}
                      </div>
                      <div className={`flex items-center justify-end gap-1 text-xs ${
                        crypto.price_change_percentage_24h >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {crypto.price_change_percentage_24h >= 0 ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        {Math.abs(crypto.price_change_percentage_24h).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Powered by CoinGecko API</span>
          <a
            href="https://www.coingecko.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            View more <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default CryptoPriceTracker;