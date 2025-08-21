export interface Chain {
  id: string
  name: string
  symbol: string
  rpcUrl?: string
  blockExplorer?: string
  nativeCurrency?: {
    name: string
    symbol: string
    decimals: number
  }
}

export interface AssetType {
  id: string
  label: string
  icon: any // Lucide React icon component
  description?: string
}

export interface TokenizedAsset {
  id: number
  symbol: string
  name: string
  type: string
  tvl: string
  apy: string
  price: string
  change24h: string
  marketCap: string
  liquidity: string
  chain: string
  verified: boolean
  yieldType: string
  nextReward: string
  holders: number
  description?: string
  riskLevel?: 'Low' | 'Medium' | 'High'
  minInvestment?: string
  maxInvestment?: string
  lockupPeriod?: string
  contractAddress?: string
  auditStatus?: 'Audited' | 'Pending' | 'Not Audited'
}

export interface MenuItem {
  id: string
  label: string
  icon: any // Lucide React icon component
  active?: boolean
  badge?: string
  href?: string
  onClick?: () => void
}

export interface MenuSection {
  category: string
  items: MenuItem[]
}

export interface Theme {
  id: string
  label: string
  className: string
}

export interface User {
  address: string
  balance: string
  portfolio: {
    totalValue: string
    assets: TokenizedAsset[]
    performance24h: string
    performance7d: string
    performance30d: string
  }
  preferences: {
    theme: string
    currency: string
    notifications: boolean
  }
}

export interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'stake' | 'unstake' | 'claim'
  asset: string
  amount: string
  price: string
  timestamp: Date
  status: 'pending' | 'confirmed' | 'failed'
  hash?: string
}

export interface Pool {
  id: string
  name: string
  token0: string
  token1: string
  tvl: string
  apr: string
  volume24h: string
  fees24h: string
  userLiquidity?: string
  userRewards?: string
}

export interface StakingPool {
  id: string
  asset: string
  apy: string
  tvl: string
  minStake: string
  lockupPeriod: string
  userStaked?: string
  userRewards?: string
  nextRewardDate?: Date
}

export interface News {
  id: string
  title: string
  summary: string
  content: string
  author: string
  publishedAt: Date
  category: string
  tags: string[]
  imageUrl?: string
  sourceUrl?: string
}

export interface MarketData {
  totalTvl: string
  volume24h: string
  avgApy: string
  activeUsers: string
  totalAssets: number
  topPerformers: TokenizedAsset[]
  recentTransactions: Transaction[]
}

export interface FilterOptions {
  assetType: string
  chain: string
  minApy?: number
  maxApy?: number
  minTvl?: number
  maxTvl?: number
  verified?: boolean
  riskLevel?: string[]
}

export interface SortOptions {
  field: 'apy' | 'tvl' | 'price' | 'change24h' | 'marketCap' | 'liquidity'
  direction: 'asc' | 'desc'
}

export interface NotificationSettings {
  priceAlerts: boolean
  rewardNotifications: boolean
  newsUpdates: boolean
  marketingEmails: boolean
  pushNotifications: boolean
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// Web3 specific types
export interface StakeInfo {
  id: bigint
  user: string
  token: string
  amount: bigint
  rewards: bigint
  startTime: bigint
  endTime: bigint
  claimed: boolean
}