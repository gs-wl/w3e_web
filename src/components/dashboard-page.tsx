'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Star, Zap, Wind, Sun, Battery, Leaf, Mountain,
  DollarSign, ArrowRight, BarChart3, Globe, Shield, Coins,
  ArrowUpDown, Droplets, Lock, Target, FileText, TrendingUp, Users, X
} from 'lucide-react';
import {
  TradingChart,
  UserStakingSummary,
  AssetPerformancePieChart,
  EcosystemSummary,
  RecentUpdatesNews,
  CryptoPriceTracker
} from './dashboard';

// Asset types and data from the main platform
const assetTypes = [
  { id: 'all', label: 'All W3Es', icon: Globe },
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

// Helper function
const normalizeType = (type: string) => type.toLowerCase().replace(/\s/g, '_');

// Token interfaces
interface TokenData {
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
}

interface TokenCardProps {
  token: TokenData;
}

interface TokenListItemProps {
  token: TokenData;
}

// Grid View Token Card Component
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

// List View Token Item Component
const TokenListItem = ({ token }: TokenListItemProps) => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200">
    <div className="px-6 py-4">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Token Info */}
        <div className="col-span-12 sm:col-span-4 lg:col-span-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {token.symbol.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{token.symbol}</h3>
                {token.verified && <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{token.name}</p>
              <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium dark:bg-green-800 dark:text-green-100 mt-1">
                {token.type}
              </span>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="col-span-6 sm:col-span-2 lg:col-span-2">
          <div className="text-right sm:text-left">
            <p className="font-semibold text-gray-900 dark:text-white">{token.price}</p>
            <span className={`text-sm ${token.change24h.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {token.change24h}
            </span>
          </div>
        </div>

        {/* APY */}
        <div className="col-span-6 sm:col-span-2 lg:col-span-1">
          <div className="text-right sm:text-left">
            <p className="font-semibold text-green-600 dark:text-green-400">{token.apy}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">APY</p>
          </div>
        </div>

        {/* TVL */}
        <div className="col-span-6 sm:col-span-2 lg:col-span-1">
          <div className="text-right sm:text-left">
            <p className="font-semibold text-gray-900 dark:text-white">{token.tvl}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">TVL</p>
          </div>
        </div>

        {/* Liquidity */}
        <div className="col-span-6 sm:col-span-2 lg:col-span-1">
          <div className="text-right sm:text-left">
            <p className="font-semibold text-gray-900 dark:text-white">{token.liquidity}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Liquidity</p>
          </div>
        </div>

        {/* Chain & Holders */}
        <div className="col-span-6 sm:col-span-4 lg:col-span-2">
          <div className="flex items-center justify-between sm:justify-start sm:gap-4">
            <div className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${token.chain === 'ethereum' ? 'bg-blue-500' : token.chain === 'polygon' ? 'bg-purple-500' : token.chain === 'arbitrum' ? 'bg-blue-400' : 'bg-indigo-500'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{token.chain}</span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">{token.holders} holders</span>
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-6 sm:col-span-8 lg:col-span-2">
          <div className="flex gap-2 justify-end">
            <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-1 text-sm">
              <Coins className="w-3 h-3" />
              Trade
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-1 text-sm">
              <Lock className="w-3 h-3" />
              Stake
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  // State management for filters and search
  const [selectedAssetType, setSelectedAssetType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('apy');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and sort logic
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
    <div className="space-y-8">
      {/* Enhanced Stats Grid - First Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total Market Cap', 
            value: '$1,234,567,890', 
            change: '+5.2%', 
            isPositive: true,
            description: 'Total market capitalization'
          },
          { 
            label: 'Total Value Locked', 
            value: '$987,654,321', 
            change: '+12.4%', 
            isPositive: true,
            description: 'Assets locked in protocols'
          },
          { 
            label: 'Avg APY', 
            value: '12.34%', 
            change: '+0.8%', 
            isPositive: true,
            description: 'Average annual percentage yield'
          },
          { 
            label: 'Total Holders', 
            value: '1,234', 
            change: '+15.2%', 
            isPositive: true,
            description: 'Active token holders'
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              {stat.label}
            </h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.description}
                </p>
              </div>
              <div className={`text-sm font-semibold ${
                stat.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Crypto Price Tracker - Full Width Prominent Section */}
      <section className="mb-8">
        <CryptoPriceTracker />
      </section>

      {/* Main Dashboard Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trading Chart - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <TradingChart 
            currentPrice="$45,678.90"
            priceChange="2.54%"
            isPositive={true}
          />
        </div>
        
        {/* Right Sidebar - User Staking Summary */}
        <div className="space-y-8">
          <UserStakingSummary />
          <AssetPerformancePieChart />
        </div>
      </section>

      {/* Bottom Section - Tables and News */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <EcosystemSummary />
        <RecentUpdatesNews />
      </section>

      {/* Additional Platform Features */}
      
      {/* Enhanced Search & Filters Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Asset Explorer</h3>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search assets, pools, or projects..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all" 
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Asset Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Asset Type</label>
            <select 
              value={selectedAssetType} 
              onChange={e => setSelectedAssetType(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-sm transition-all"
            >
              <option value="all">All Asset Types</option>
              {assetTypes.slice(1).map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* APY Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">APY Range</label>
            <select className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-sm transition-all">
              <option>All APY Ranges</option>
              <option>0% - 10%</option>
              <option>10% - 20%</option>
              <option>20%+</option>
            </select>
          </div>

          {/* Chain Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Blockchain</label>
            <select className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-sm transition-all">
              <option>All Chains</option>
              <option>Ethereum</option>
              <option>Polygon</option>
              <option>Arbitrum</option>
              <option>Base</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-sm transition-all"
            >
              <option value="apy">Highest APY</option>
              <option value="tvl">Highest TVL</option>
              <option value="name">Name A-Z</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>



        {/* Active Filters Display */}
        {(searchQuery || selectedAssetType !== 'all') && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                  Search: "{searchQuery}"
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedAssetType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                  Type: {assetTypes.find(t => t.id === selectedAssetType)?.label}
                  <button 
                    onClick={() => setSelectedAssetType('all')}
                    className="ml-1 hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAssetType('all');
                }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Tokenized Assets Grid */}
      <section className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tokenized Assets</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {sortedAssets.length} asset{sortedAssets.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Grid
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                List
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </div>
          </div>
        </div>
        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedAssets.length ? (
              sortedAssets.map(token => <TokenCard key={token.id} token={token} />)
            ) : (
              <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-12">
                <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No assets found</p>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* List Header */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-12 gap-4 items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="col-span-12 sm:col-span-4 lg:col-span-3">Asset</div>
                <div className="col-span-6 sm:col-span-2 lg:col-span-2 text-right sm:text-left">Price</div>
                <div className="col-span-6 sm:col-span-2 lg:col-span-1 text-right sm:text-left">APY</div>
                <div className="col-span-6 sm:col-span-2 lg:col-span-1 text-right sm:text-left">TVL</div>
                <div className="col-span-6 sm:col-span-2 lg:col-span-1 text-right sm:text-left">Liquidity</div>
                <div className="col-span-6 sm:col-span-4 lg:col-span-2">Network</div>
                <div className="col-span-6 sm:col-span-8 lg:col-span-2 text-right">Actions</div>
              </div>
            </div>

            {/* List Items */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedAssets.length ? (
                sortedAssets.map(token => <TokenListItem key={token.id} token={token} />)
              ) : (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No assets found</p>
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            icon: ArrowUpDown, 
            title: 'DEX Trading', 
            desc: 'Swap W3E tokens with minimal slippage', 
            bgClass: 'bg-blue-500/20 dark:bg-blue-400/20 hover:bg-blue-500/30 dark:hover:bg-blue-400/30 border border-blue-500/30 dark:border-blue-400/30',
            textColor: 'text-blue-700 dark:text-blue-300',
            iconColor: 'text-blue-600 dark:text-blue-400',
            action: 'Trade Now'
          },
          { 
            icon: Droplets, 
            title: 'Liquidity Pools', 
            desc: 'Provide liquidity and earn fees', 
            bgClass: 'bg-emerald-500/20 dark:bg-emerald-400/20 hover:bg-emerald-500/30 dark:hover:bg-emerald-400/30 border border-emerald-500/30 dark:border-emerald-400/30',
            textColor: 'text-emerald-700 dark:text-emerald-300',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            action: 'Add Liquidity'
          },
          { 
            icon: Lock, 
            title: 'Yield Farming', 
            desc: 'Stake LP tokens for maximum yields', 
            bgClass: 'bg-purple-500/20 dark:bg-purple-400/20 hover:bg-purple-500/30 dark:hover:bg-purple-400/30 border border-purple-500/30 dark:border-purple-400/30',
            textColor: 'text-purple-700 dark:text-purple-300',
            iconColor: 'text-purple-600 dark:text-purple-400',
            action: 'Start Farming'
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
              {card.action}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
};

export default DashboardPage;