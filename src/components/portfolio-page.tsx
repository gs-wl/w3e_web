'use client'

import React, { useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Activity,
  ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Download, Share2, Filter, Search,
  Wallet, Coins, Target, Award, Zap, Leaf, Sun, Wind,
  Battery, Droplets,
  ExternalLink, Copy, MoreHorizontal, Minus,
  AlertCircle, CheckCircle, XCircle, Timer, ArrowRight,
  Home, Moon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WalletConnectButton } from './wallet-connect-button'
import { useTheme } from '@/contexts/theme-context'
import Image from 'next/image'

// Portfolio data types
interface PortfolioAsset {
  id: string
  symbol: string
  name: string
  balance: number
  value: number
  price: number
  change24h: number
  apy: number
  category: string
  logo: string
  color: string
  staked: number
  rewards: number
  lastActivity: string
}

interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'stake' | 'unstake' | 'claim' | 'transfer'
  asset: string
  amount: number
  value: number
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
  hash?: string
}

// Mock data
const mockAssets: PortfolioAsset[] = [
  {
    id: '1',
    symbol: 'SOLAR',
    name: 'Solar Energy Token',
    balance: 1250.5,
    value: 15006.0,
    price: 12.0,
    change24h: 5.2,
    apy: 12.5,
    category: 'Renewable Energy',
    logo: '/sol.svg',
    color: 'from-yellow-400 to-orange-500',
    staked: 800.0,
    rewards: 45.2,
    lastActivity: '2024-03-15T10:30:00Z'
  },
  {
    id: '2',
    symbol: 'WIND',
    name: 'Wind Power RWA',
    balance: 890.25,
    value: 12483.5,
    price: 14.02,
    change24h: -2.1,
    apy: 15.8,
    category: 'Renewable Energy',
    logo: '/wind.svg',
    color: 'from-blue-400 to-cyan-500',
    staked: 600.0,
    rewards: 32.8,
    lastActivity: '2024-03-14T16:45:00Z'
  },
  {
    id: '3',
    symbol: 'CARBON',
    name: 'Carbon Credit Token',
    balance: 2100.0,
    value: 8400.0,
    price: 4.0,
    change24h: 8.7,
    apy: 9.2,
    category: 'Carbon Credits',
    logo: '/carbon.svg',
    color: 'from-green-400 to-emerald-500',
    staked: 1500.0,
    rewards: 18.5,
    lastActivity: '2024-03-15T08:20:00Z'
  },
  {
    id: '4',
    symbol: 'HYDRO',
    name: 'Hydroelectric Power',
    balance: 567.8,
    value: 7345.14,
    price: 12.94,
    change24h: 3.4,
    apy: 11.7,
    category: 'Renewable Energy',
    logo: '/hydro.svg',
    color: 'from-blue-500 to-teal-500',
    staked: 400.0,
    rewards: 25.1,
    lastActivity: '2024-03-13T14:15:00Z'
  },
  {
    id: '5',
    symbol: 'BATTERY',
    name: 'Energy Storage Token',
    balance: 445.2,
    value: 6677.0,
    price: 15.0,
    change24h: 12.3,
    apy: 18.5,
    category: 'Energy Storage',
    logo: '/battery.svg',
    color: 'from-purple-400 to-pink-500',
    staked: 300.0,
    rewards: 28.7,
    lastActivity: '2024-03-15T12:00:00Z'
  }
]

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'stake',
    asset: 'SOLAR',
    amount: 100,
    value: 1200,
    timestamp: '2024-03-15T10:30:00Z',
    status: 'completed',
    hash: '0x1234...5678'
  },
  {
    id: '2',
    type: 'claim',
    asset: 'WIND',
    amount: 15.5,
    value: 217.31,
    timestamp: '2024-03-14T16:45:00Z',
    status: 'completed',
    hash: '0x2345...6789'
  },
  {
    id: '3',
    type: 'buy',
    asset: 'CARBON',
    amount: 500,
    value: 2000,
    timestamp: '2024-03-14T09:15:00Z',
    status: 'completed',
    hash: '0x3456...7890'
  },
  {
    id: '4',
    type: 'unstake',
    asset: 'HYDRO',
    amount: 50,
    value: 647,
    timestamp: '2024-03-13T14:15:00Z',
    status: 'pending'
  },
  {
    id: '5',
    type: 'stake',
    asset: 'BATTERY',
    amount: 75,
    value: 1125,
    timestamp: '2024-03-12T11:30:00Z',
    status: 'completed',
    hash: '0x4567...8901'
  }
]

export function PortfolioPage() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [selectedTimeframe, setSelectedTimeframe] = useState('7D')
  const [showBalances, setShowBalances] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('value')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const totalValue = mockAssets.reduce((sum, asset) => sum + asset.value, 0)
    const totalStaked = mockAssets.reduce((sum, asset) => sum + (asset.staked * asset.price), 0)
    const totalRewards = mockAssets.reduce((sum, asset) => sum + (asset.rewards * asset.price), 0)
    const avgApy = mockAssets.reduce((sum, asset) => sum + asset.apy, 0) / mockAssets.length
    const totalChange24h = mockAssets.reduce((sum, asset) => sum + (asset.value * asset.change24h / 100), 0)
    const changePercentage = (totalChange24h / totalValue) * 100

    return {
      totalValue,
      totalStaked,
      totalRewards,
      avgApy,
      totalChange24h,
      changePercentage
    }
  }, [])

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    const filtered = mockAssets.filter(asset => {
      const matchesCategory = selectedCategory === 'all' || asset.category.toLowerCase().includes(selectedCategory.toLowerCase())
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value': return b.value - a.value
        case 'change': return b.change24h - a.change24h
        case 'apy': return b.apy - a.apy
        case 'name': return a.name.localeCompare(b.name)
        default: return 0
      }
    })
  }, [selectedCategory, searchQuery, sortBy])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy': return <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'sell': return <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'stake': return <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case 'unstake': return <Minus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      case 'claim': return <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      case 'transfer': return <ArrowRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      default: return <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'pending': return <Timer className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      default: return <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">Connect Your Wallet</CardTitle>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Connect your wallet to view your portfolio and manage your RWA investments
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <WalletConnectButton />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Your portfolio data is securely stored on-chain
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/app')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              >
                <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Image 
                src="/logo/logo.png" 
                alt="W3-Energy Logo" 
                width={72} 
                height={64} 
                className="h-16 w-18"
              />
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden sm:block">Manage your RWA investments</p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              <Button variant="outline" size="sm" className="text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBalances(!showBalances)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              >
                {showBalances ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
              <WalletConnectButton />
            </div>
            
            {/* Mobile Actions */}
            <div className="flex lg:hidden items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBalances(!showBalances)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              >
                {showBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Portfolio Value</p>
                  <p className="text-3xl font-bold text-white">
                    {showBalances ? formatCurrency(portfolioMetrics.totalValue) : '••••••'}
                  </p>
                  <div className="flex items-center mt-2">
                    {portfolioMetrics.changePercentage >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1 text-blue-100" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1 text-blue-100" />
                    )}
                    <span className="text-sm text-blue-100">
                      {portfolioMetrics.changePercentage >= 0 ? '+' : ''}
                      {formatNumber(portfolioMetrics.changePercentage)}% (24h)
                    </span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Staked</p>
                  <p className="text-3xl font-bold text-white">
                    {showBalances ? formatCurrency(portfolioMetrics.totalStaked) : '••••••'}
                  </p>
                  <p className="text-sm text-emerald-100 mt-2">
                    Avg APY: {formatNumber(portfolioMetrics.avgApy)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-sm font-medium">Pending Rewards</p>
                  <p className="text-3xl font-bold text-white">
                    {showBalances ? formatCurrency(portfolioMetrics.totalRewards) : '••••••'}
                  </p>
                  <p className="text-sm text-violet-100 mt-2">
                    Ready to claim
                  </p>
                </div>
                <Award className="h-8 w-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Active Assets</p>
                  <p className="text-3xl font-bold text-white">{mockAssets.length}</p>
                  <p className="text-sm text-amber-100 mt-2">
                    Across {new Set(mockAssets.map(a => a.category)).size} categories
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            {/* Desktop Tabs */}
            <nav className="-mb-px hidden sm:flex space-x-8 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'assets', label: 'Assets', icon: Coins },
                { id: 'transactions', label: 'Transactions', icon: Activity },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
            
            {/* Mobile Tabs */}
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full py-3 px-4 border-0 border-b border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-0 focus:border-blue-500 text-base font-medium"
              >
                <option value="overview">📊 Overview</option>
                <option value="assets">🪙 Assets</option>
                <option value="transactions">📈 Transactions</option>
                <option value="analytics">📊 Analytics</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Performance Chart */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 dark:text-white">Portfolio Performance</CardTitle>
                  <div className="flex items-center space-x-2">
                    {['1D', '7D', '1M', '3M', '1Y', 'ALL'].map((timeframe) => (
                      <Button
                        key={timeframe}
                        variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTimeframe(timeframe)}
                      >
                        {timeframe}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-700 dark:text-gray-200 font-medium">Performance chart visualization</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      Interactive chart showing portfolio value over time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Asset Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockAssets.map((asset) => {
                      const percentage = (asset.value / portfolioMetrics.totalValue) * 100
                      return (
                        <div key={asset.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${asset.color}`} />
                          <span className="font-medium text-gray-900 dark:text-white">{asset.symbol}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">{formatNumber(percentage)}%</p>
                          <p className="text-sm text-gray-500 dark:text-gray-300">
                            {showBalances ? formatCurrency(asset.value) : '••••••'}
                          </p>
                        </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockAssets
                      .sort((a, b) => b.change24h - a.change24h)
                      .slice(0, 5)
                      .map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${asset.color} flex items-center justify-center text-white text-xs font-bold`}>
                              {asset.symbol.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{asset.symbol}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-300">{asset.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`flex items-center space-x-1 ${
                              asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {asset.change24h >= 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span className="font-medium">
                                {asset.change24h >= 0 ? '+' : ''}{formatNumber(asset.change24h)}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-300">
                              {showBalances ? formatCurrency(asset.price) : '••••••'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6">
            {/* Filters and Search */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <input
                      type="text"
                      placeholder="Search assets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                    >
                      <option value="all">All Categories</option>
                      <option value="renewable">Renewable Energy</option>
                      <option value="carbon">Carbon Credits</option>
                      <option value="storage">Energy Storage</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                    >
                      <option value="value">Sort by Value</option>
                      <option value="change">Sort by Change</option>
                      <option value="apy">Sort by APY</option>
                      <option value="name">Sort by Name</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredAssets.map((asset) => (
                <Card key={asset.id} className="hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r ${asset.color} flex items-center justify-center text-white font-bold shadow-sm text-sm sm:text-base`}>
                          {asset.symbol.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white truncate">{asset.symbol}</h3>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{asset.name}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Balance</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {showBalances ? formatNumber(asset.balance) : '••••••'} {asset.symbol}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Value</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {showBalances ? formatCurrency(asset.value) : '••••••'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">24h Change</span>
                        <span className={`font-medium flex items-center space-x-1 ${
                          asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {asset.change24h >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>
                            {asset.change24h >= 0 ? '+' : ''}{formatNumber(asset.change24h)}%
                          </span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">APY</span>
                        <span className="font-medium text-emerald-600">
                          {formatNumber(asset.apy)}%
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Staked</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {showBalances ? formatNumber(asset.staked) : '••••••'} {asset.symbol}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Rewards</span>
                        <span className="font-medium text-violet-600">
                          {showBalances ? formatNumber(asset.rewards) : '••••••'} {asset.symbol}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2">
                      <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600">
                        <Target className="h-4 w-4 mr-1" />
                        <span className="text-xs sm:text-sm">Stake</span>
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                        <Award className="h-4 w-4 mr-1" />
                        <span className="text-xs sm:text-sm">Claim</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">Transaction History</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Filter className="h-4 w-4 sm:mr-2 text-gray-600 dark:text-gray-400" />
                    <span className="hidden sm:inline">Filter</span>
                  </Button>
                  <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Download className="h-4 w-4 sm:mr-2 text-gray-600 dark:text-gray-400" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {mockTransactions.map((tx) => (
                  <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors gap-3 sm:gap-0">
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {getTransactionIcon(tx.type)}
                        {getStatusIcon(tx.status)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium capitalize text-gray-900 dark:text-white text-sm sm:text-base truncate">{tx.type} {tx.asset}</p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{formatDate(tx.timestamp)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                          {showBalances ? formatNumber(tx.amount) : '••••••'} {tx.asset}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {showBalances ? formatCurrency(tx.value) : '••••••'}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                        {tx.hash && (
                          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 h-8 w-8">
                            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 h-8 w-8">
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">Portfolio Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatNumber(portfolioMetrics.avgApy)}%
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Average APY</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700">
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatNumber((portfolioMetrics.totalStaked / portfolioMetrics.totalValue) * 100)}%
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Staking Ratio</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Risk Distribution</h4>
                    {['Low Risk', 'Medium Risk', 'High Risk'].map((risk, index) => {
                      const percentage = [60, 30, 10][index]
                      return (
                        <div key={risk} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{risk}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  index === 0 ? 'bg-emerald-500' : 
                                  index === 1 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{percentage}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Environmental Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700">
                      <div className="flex items-center space-x-3">
                        <Leaf className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Carbon Offset</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Total CO₂ reduced</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">2.1M tons</p>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-amber-100 dark:bg-amber-900/50 rounded-lg border border-amber-200 dark:border-amber-700">
                      <div className="flex items-center space-x-3">
                        <Zap className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Clean Energy</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Generated capacity</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400">156 MW</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Impact by Category</h4>
                    {[
                      { name: 'Solar Energy', impact: '45%', icon: Sun, color: 'text-amber-600 dark:text-amber-400' },
                      { name: 'Wind Power', impact: '30%', icon: Wind, color: 'text-blue-600 dark:text-blue-400' },
                      { name: 'Hydroelectric', impact: '15%', icon: Droplets, color: 'text-cyan-600 dark:text-cyan-400' },
                      { name: 'Other', impact: '10%', icon: Battery, color: 'text-violet-600 dark:text-violet-400' }
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Icon className={`h-5 w-5 ${item.color}`} />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.impact}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}