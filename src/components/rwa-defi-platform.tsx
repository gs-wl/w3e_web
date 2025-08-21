'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, TrendingUp, Filter, Star, Zap, Wind, Sun, Battery, Leaf, Mountain,
  DollarSign, Users, ArrowRight, PlusCircle, BarChart3, Globe,
  Shield, Menu, X, Activity, Coins,
  ArrowUpDown, Droplets, Bell, Lock, Target, Briefcase, FileText,
  Database, GitBranch, Network, Moon, Home
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { useNewsCache } from '@/hooks/useNewsCache';
import { useAdmin } from '@/hooks/useAdmin';
import { StakingPage, NewsPage } from './index';
import { WalletConnectButton, CompactWalletButton } from './wallet-connect-button';
import { useTheme } from '@/contexts/theme-context';
import DashboardPage from './dashboard-page';
import FloatingAnnouncement from './floating-announcement';
import GasPriceDisplay from './gas-price-display';
import { AdminAppPage } from './admin-app-page';
import { AdminGuard } from './admin-guard';

/* ---------- Dummy data kept identical ---------- */

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;        // <- corrected type
  active?: boolean;
  badge?: string;
  adminOnly?: boolean;     // <- optional flag
}

interface MenuSection {
  category: string;
  items: MenuItem[];
}

/* ---------- Dummy data kept identical ---------- */

const assetTypes = [
  { id: 'all', label: 'All RWAs', icon: Globe },
  { id: 'solar', label: 'Solar', icon: Sun },
  { id: 'wind', label: 'Wind', icon: Wind },
  { id: 'uranium', label: 'Uranium', icon: Zap },
  { id: 'hydrogen', label: 'Hydrogen', icon: Battery },
  { id: 'battery', label: 'Battery Storage', icon: Battery },
  { id: 'bioenergy', label: 'Bioenergy', icon: Leaf },
  { id: 'geothermal', label: 'Geothermal', icon: Mountain },
  { id: 'carbon', label: 'Carbon Credits', icon: Leaf },
  { id: 'green_bonds', label: 'Green Bonds', icon: DollarSign },
  { id: 'ppa', label: 'PPAs', icon: FileText }
];

const tokenizedAssets = [
  { id: 1, symbol: 'TSOL-001', name: 'Texas Solar Farm Token', type: 'Solar', tvl: '$4.2M', apy: '12.5', price: '$1,247.50', change24h: '+3.2%', marketCap: '$15.8M', liquidity: '$890K', chain: 'ethereum', verified: true, yieldType: 'Revenue Share', nextReward: '5 days', holders: 1247 },
  { id: 2, symbol: 'WIND-EU', name: 'European Offshore Wind', type: 'Wind', tvl: '$12.7M', apy: '15.8', price: '$845.20', change24h: '+7.1%', marketCap: '$28.3M', liquidity: '$1.2M', chain: 'polygon', verified: true, yieldType: 'Staking Rewards', nextReward: '2 days', holders: 892 },
  { id: 3, symbol: 'H2-PRO', name: 'Green Hydrogen Production', type: 'Hydrogen', tvl: '$8.9M', apy: '18.2', price: '$2,156.80', change24h: '-1.4%', marketCap: '$22.1M', liquidity: '$654K', chain: 'arbitrum', verified: true, yieldType: 'LP Rewards', nextReward: '1 day', holders: 543 },
  { id: 4, symbol: 'BATT-NET', name: 'Grid Battery Network', type: 'Battery Storage', tvl: '$6.3M', apy: '11.9', price: '$987.45', change24h: '+5.7%', marketCap: '$18.7M', liquidity: '$743K', chain: 'base', verified: true, yieldType: 'Auto-compound', nextReward: '12 hours', holders: 734 }
];

const menuItems: MenuSection[] = [
  { category: 'Latest', items: [
      { id: 'market-overview', label: 'Dashboard', icon: BarChart3, active: true },
      { id: 'news', label: 'News', icon: FileText },
      { id: 'invest', label: 'Invest', icon: Target, badge: 'NEW' }
  ]},
  { category: 'Asset Classes', items: [
      { id: 'tokenized-assets', label: 'Tokenized Assets', icon: Coins },
      { id: 'defi-pools', label: 'DeFi Pools', icon: Droplets },
      { id: 'yield-farming', label: 'Yield Farming', icon: Leaf },
      { id: 'liquidity-mining', label: 'Liquidity Mining', icon: Activity },
      { id: 'staking', label: 'Staking', icon: Lock },
      { id: 'derivatives', label: 'Derivatives', icon: TrendingUp, badge: 'SOON' }
  ]},
  { category: 'Trading & DeFi', items: [
      { id: 'dex', label: 'DEX Trading', icon: ArrowUpDown },
      { id: 'order-book', label: 'Order Book', icon: BarChart3 },
      { id: 'cross-chain', label: 'Bridge', icon: GitBranch },
      { id: 'portfolio', label: 'Portfolio', icon: Briefcase }
  ]},
  { category: 'Analytics', items: [
      { id: 'research', label: 'Research', icon: Database },
      { id: 'impact', label: 'ESG Impact', icon: Leaf },
      { id: 'governance', label: 'Governance', icon: Users }
  ]},
  { category: 'Administration', items: [
      { id: 'admin', label: 'Admin Panel', icon: Shield, adminOnly: true }
  ]}
];

/* ---------- helpers ---------- */
const normalizeType = (type: string) => type.toLowerCase().replace(/\s/g, '_');

/* ---------- Sidebar ---------- */
interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setUserToggledSidebar: (toggled: boolean) => void;
  activeTab: string;
  handleTabChange: (tab: string) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen, setUserToggledSidebar, activeTab, handleTabChange }: SidebarProps) => {
  const pathname = usePathname();
  const { isAdmin } = useAdmin();
  
  // Determine active tab from pathname
  const getActiveTabFromPath = () => {
    if (pathname === '/app') return 'market-overview';
    if (pathname === '/portfolio') return 'portfolio';
    const segments = pathname.split('/');
    return segments[segments.length - 1] || 'market-overview';
    };
  
  const currentActiveTab = getActiveTabFromPath();
  
  // Filter menu items based on admin status
  const filteredMenuItems = menuItems.map(section => ({
    ...section,
    items: section.items.filter(item => !item.adminOnly || isAdmin)
  })).filter(section => section.items.length > 0);
  
  return (
  <aside className={`fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:shadow-none lg:border-r lg:border-gray-200 dark:lg:border-gray-800`}>
    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-1 rounded-lg">
          <Image
            src="/logo/logo.png"
            alt="W3-Energy Logo"
            width={72}
            height={56}
            className="h-16 w-18"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">W3-Energy</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Real World Assets</p>
        </div>
      </div>
      <button onClick={() => { setSidebarOpen(false); setUserToggledSidebar(true); }} className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" aria-label="Close sidebar"><X className="w-5 h-5 text-gray-700 dark:text-gray-300" /></button>
    </div>
    <nav className="overflow-y-auto h-full pb-20">
      {filteredMenuItems.map(section => (
        <div key={section.category} className="p-4">
          <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase mb-3">{section.category}</h3>
          <div className="space-y-1">
            {section.items.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => handleTabChange(item.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${ currentActiveTab === item.id ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && <span className={`px-2 py-1 text-xs rounded-full ${item.badge === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{item.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="p-4 mx-4 mb-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg dark:bg-gradient-to-r dark:from-orange-900 dark:to-yellow-900 dark:border-orange-700">
        <h4 className="font-semibold text-orange-900 dark:text-yellow-400 mb-2">List Your Assets</h4>
        <p className="text-sm text-orange-700 dark:text-yellow-300 mb-3">Tokenize and list your real-world assets</p>
        <button className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-2 px-4 rounded-lg font-medium text-sm hover:from-orange-600 hover:to-yellow-600 transition-all">Get Started</button>
      </div>
    </nav>
  </aside>
  );
};

/* ---------- Token Card ---------- */
interface TokenCardProps {
  token: {
    id: number;
    symbol: string;
    name: string;
    type: string;
    tvl: string;
    apy: string;
    price: string;
    change24h: string;
    marketCap: string;
    liquidity: string;
    chain: string;
    verified: boolean;
    yieldType: string;
    nextReward: string;
    holders: number;
  };
}

const TokenCard = ({ token }: TokenCardProps) => (
  <article className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">{token.symbol.slice(0, 3)}</div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 dark:text-white">{token.symbol}</h3>
            {token.verified && <Shield className="w-4 h-4 text-green-500" />}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{token.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium dark:bg-green-800 dark:text-green-100">{token.type}</span>
        <button className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-300" aria-label="Favorite"><Star className="w-4 h-4" /></button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
        <div className="flex items-center gap-2"><p className="font-semibold text-lg text-gray-900 dark:text-white">{token.price}</p><span className={`text-xs ${token.change24h.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{token.change24h}</span></div>
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">APY</p>
        <p className="font-semibold text-lg text-green-600 dark:text-green-400">{token.apy}%</p>
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">TVL</p>
        <p className="font-semibold text-gray-900 dark:text-white">{token.tvl}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Liquidity</p>
        <p className="font-semibold text-gray-900 dark:text-white">{token.liquidity}</p>
      </div>
    </div>
    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
      <div className="flex items-center gap-1">
        <div className={`w-3 h-3 rounded-full ${token.chain === 'ethereum' ? 'bg-blue-500' : token.chain === 'polygon' ? 'bg-purple-500' : token.chain === 'arbitrum' ? 'bg-blue-400' : 'bg-indigo-500'}`}></div>
        <span className="capitalize">{token.chain}</span>
      </div>
      <span>{token.holders} holders</span>
    </div>
    <div className="flex items-center justify-between text-sm mb-4">
      <div><p className="text-gray-500 dark:text-gray-400">Yield Type</p><p className="font-medium text-gray-900 dark:text-white">{token.yieldType}</p></div>
      <div className="text-right"><p className="text-gray-500 dark:text-gray-400">Next Reward</p><p className="font-medium text-gray-900 dark:text-white">{token.nextReward}</p></div>
    </div>
    <div className="flex gap-2">
      <button className="flex-1 bg-blue-500/20 dark:bg-blue-400/20 hover:bg-blue-500/30 dark:hover:bg-blue-400/30 text-blue-700 dark:text-blue-300 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-md border border-blue-500/30 dark:border-blue-400/30 shadow-lg hover:shadow-xl">
        <Coins className="w-4 h-4" />Trade
      </button>
      <button className="flex-1 bg-emerald-500/20 dark:bg-emerald-400/20 hover:bg-emerald-500/30 dark:hover:bg-emerald-400/30 text-emerald-700 dark:text-emerald-300 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-400/30 shadow-lg hover:shadow-xl">
        <Lock className="w-4 h-4" />Stake
      </button>
    </div>
  </article>
);

/* ---------- Main platform ---------- */
interface Web3RWAPlatformProps {
  activeTab?: string;
}

const Web3RWAPlatform = ({ activeTab: propActiveTab }: Web3RWAPlatformProps = {}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(propActiveTab || 'market-overview');
  
  // News notification system
  const { notification } = useNewsCache();
  
  // Update activeTab when prop changes
  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);
  
  // Handle tab navigation with proper routing
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Navigate to the appropriate route
    if (tab === 'market-overview') {
      router.push('/app');
    } else if (tab === 'portfolio') {
      router.push('/portfolio');
    } else {
      router.push(`/app/${tab}`);
    }
  };
  const [selectedAssetType, setSelectedAssetType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userToggledSidebar, setUserToggledSidebar] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const [sortBy, setSortBy] = useState('apy');

  // Handle responsive sidebar state
  React.useEffect(() => {
    const handleResize = () => {
      // Only auto-adjust if user hasn't manually toggled
      if (!userToggledSidebar) {
        if (window.innerWidth >= 1024) { // lg breakpoint
          setSidebarOpen(true); // Open by default on desktop
        } else {
          setSidebarOpen(false); // Closed by default on mobile
        }
      }
    };

    // Set initial state
    handleResize();
    
    // Listen for window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userToggledSidebar]);

  const filteredAssets = useMemo(() => {
    return tokenizedAssets.filter(token => {
      const matchesType = selectedAssetType === 'all' || normalizeType(token.type) === selectedAssetType;
      const matchesSearch = token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || token.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [selectedAssetType, searchQuery]);

  const sortedAssets = useMemo(() => {
    const arr = [...filteredAssets];
    if (sortBy === 'apy') {
      arr.sort((a, b) => parseFloat(b.apy) - parseFloat(a.apy));
    }
    if (sortBy === 'tvl') {
      arr.sort((a, b) => parseFloat(b.tvl.replace(/[^0-9.]/g, '')) - parseFloat(a.tvl.replace(/[^0-9.]/g, '')));
    }
    return arr;
  }, [filteredAssets, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setUserToggledSidebar={setUserToggledSidebar} activeTab={activeTab} handleTabChange={handleTabChange} />
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => { setSidebarOpen(false); setUserToggledSidebar(true); }} />}
      <div className={`flex flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => { setSidebarOpen(true); setUserToggledSidebar(true); }} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" aria-label="Open sidebar"><Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" /></button>
              <button onClick={() => { setSidebarOpen(!sidebarOpen); setUserToggledSidebar(true); }} className="hidden lg:block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" aria-label="Toggle sidebar">
                {sidebarOpen ? <X className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
              </button>
              
              {/* Home button */}
              <button 
                onClick={() => window.open('https://w3-energy.org', '_blank')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" 
                title="Visit W3-Energy.org"
                aria-label="Visit W3-Energy.org"
              >
                <Home className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              
              {/* Sepolia Testnet Badge */}
              <div className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-yellow-100 to-orange-100 text-gray-700 dark:text-gray-800 rounded-full text-xs sm:text-sm font-medium shadow-sm border border-yellow-200 dark:border-yellow-300">
                <span className="text-xs sm:text-sm">🟡</span>
                <span className="hidden sm:inline">Sepolia Testnet — v1.0 (Demo Only)</span>
                <span className="sm:hidden text-xs">Demo</span>
              </div>

            </div>

            {/* Right side */}
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
              {/* Gas Price Display - hidden on mobile, visible on desktop */}
              <div className="hidden lg:block">
                <GasPriceDisplay />
              </div>
              
              {/* List Asset Button */}
              <button 
                className="flex items-center justify-center gap-2 p-2 h-10 w-10 sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
                onClick={() => {
                  // TODO: Implement list asset functionality
                  console.log('List Asset clicked');
                }}
                title="List your asset on the platform"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">List Asset</span>
              </button>
              
              {/* Wallet Connect - responsive design */}
              <div className="hidden sm:block">
                <WalletConnectButton />
              </div>
              <div className="sm:hidden">
                <CompactWalletButton />
              </div>
              
              {/* Notification and Theme toggle group - tighter spacing on mobile */}
              <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2">
                {/* Notifications - always visible */}
                <button 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg relative h-10 w-10 flex items-center justify-center group" 
                  aria-label="Notifications"
                  onClick={() => handleTabChange('news')}
                  title={notification.hasNewUpdates ? 
                    `${notification.newTwitterCount + notification.newNewsCount} new updates` : 
                    'News up to date'
                  }
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
                  {notification.hasNewUpdates ? (
                    <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold hidden sm:block">
                        {notification.newTwitterCount + notification.newNewsCount > 9 ? '9+' : notification.newTwitterCount + notification.newNewsCount}
                      </span>
                    </div>
                  ) : (
                    <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-xs text-white font-bold hidden sm:block">✓</span>
                    </div>
                  )}
                </button>
                
                {/* Theme toggle button */}
                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg h-10 w-10 flex items-center justify-center"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Floating Announcement */}
        <FloatingAnnouncement />

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {activeTab === 'staking' ? (
            <StakingPage />
          ) : activeTab === 'news' ? (
            <NewsPage />
          ) : activeTab === 'market-overview' ? (
            <DashboardPage />
          ) : activeTab === 'admin' ? (
            <AdminGuard>
              <AdminAppPage />
            </AdminGuard>
          ) : (
            <>

              {/* Search & filters */}
              <section className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Search tokenized assets, pools, or projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900" />
                </div>
                <div className="flex gap-2">
                  <button className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-3 rounded-lg flex items-center gap-2 transition-all text-gray-700 dark:text-gray-300"><Filter className="w-4 h-4 text-gray-700 dark:text-gray-300" />Filters</button>
                  <button className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-3 rounded-lg flex items-center gap-2 transition-all text-gray-700 dark:text-gray-300"><BarChart3 className="w-4 h-4 text-gray-700 dark:text-gray-300" />Analytics</button>
                </div>
              </section>

              {/* Asset type filter */}
              <section className="mb-8">
                <div className="flex flex-wrap gap-2">
                  {assetTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <button key={type.id} onClick={() => setSelectedAssetType(type.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${selectedAssetType === type.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                        <Icon className="w-4 h-4" />{type.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Asset grid */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tokenized Assets</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white">
                      <option value="apy" className="text-gray-900 dark:text-white">Highest APY</option>
                      <option value="tvl" className="text-gray-900 dark:text-white">Highest TVL</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {sortedAssets.length ? sortedAssets.map(token => <TokenCard key={token.id} token={token} />) : <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-12">No assets found.</div>}
                </div>
              </section>

              {/* Quick actions */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { 
                    icon: ArrowUpDown, 
                    title: 'DEX Trading', 
                    desc: 'Swap RWA tokens with minimal slippage', 
                    bgClass: 'bg-blue-500/20 dark:bg-blue-400/20 hover:bg-blue-500/30 dark:hover:bg-blue-400/30 border border-blue-500/30 dark:border-blue-400/30',
                    textColor: 'text-blue-700 dark:text-blue-300',
                    iconColor: 'text-blue-600 dark:text-blue-400',
                    buttonAction: 'Trade Now'
                  },
                  { 
                    icon: Droplets, 
                    title: 'Liquidity Pools', 
                    desc: 'Provide liquidity and earn fees', 
                    bgClass: 'bg-emerald-500/20 dark:bg-emerald-400/20 hover:bg-emerald-500/30 dark:hover:bg-emerald-400/30 border border-emerald-500/30 dark:border-emerald-400/30',
                    textColor: 'text-emerald-700 dark:text-emerald-300',
                    iconColor: 'text-emerald-600 dark:text-emerald-400',
                    buttonAction: 'Add Liquidity'
                  },
                  { 
                    icon: Lock, 
                    title: 'Yield Farming', 
                    desc: 'Stake LP tokens for maximum yields', 
                    bgClass: 'bg-purple-500/20 dark:bg-purple-400/20 hover:bg-purple-500/30 dark:hover:bg-purple-400/30 border border-purple-500/30 dark:border-purple-400/30',
                    textColor: 'text-purple-700 dark:text-purple-300',
                    iconColor: 'text-purple-600 dark:text-purple-400',
                    buttonAction: 'Start Farming'
                  },
                ].map(card => (
                  <div key={card.title} className={`${card.bgClass} backdrop-blur-md rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group`}>
                    <div className="flex items-center justify-between mb-4">
                      <card.icon className={`w-8 h-8 ${card.iconColor} group-hover:scale-110 transition-transform duration-300`} />
                      <ArrowRight className={`w-5 h-5 ${card.iconColor} group-hover:translate-x-1 transition-transform duration-300`} />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${card.textColor}`}>{card.title}</h3>
                    <p className={`mb-4 ${card.textColor} opacity-80`}>{card.desc}</p>
                    <button className={`bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 ${card.textColor} px-6 py-3 rounded-lg font-bold transition-all backdrop-blur-sm group-hover:scale-105 border-2 border-white/50 dark:border-gray-700 shadow-lg hover:shadow-xl`}>
                      {card.buttonAction}
                    </button>
                  </div>
                ))}
              </section>
            </>
          )}
        </main>
      </div>


    </div>
  );
};

export default Web3RWAPlatform;
export type { Web3RWAPlatformProps };
