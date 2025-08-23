// App Configuration
export const APP_CONFIG = {
  name: 'W3-Energy',
  description: 'Real World Assets DeFi Platform',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  version: '1.0.0',
} as const

// Supported Chains
export const SUPPORTED_CHAINS = {
  ETHEREUM: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
    blockExplorer: 'https://etherscan.io',
  },
  POLYGON: {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
    blockExplorer: 'https://polygonscan.com',
  },
  ARBITRUM: {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ARB',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
    blockExplorer: 'https://arbiscan.io',
  },
  BASE: {
    id: 8453,
    name: 'Base',
    symbol: 'BASE',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL,
    blockExplorer: 'https://basescan.org',
  },
} as const

// Asset Categories
export const ASSET_CATEGORIES = {
  RENEWABLE_ENERGY: 'renewable_energy',
  CARBON_CREDITS: 'carbon_credits',
  GREEN_BONDS: 'green_bonds',
  REAL_ESTATE: 'real_estate',
  COMMODITIES: 'commodities',
  INFRASTRUCTURE: 'infrastructure',
} as const

// Transaction Types
export const TRANSACTION_TYPES = {
  BUY: 'buy',
  SELL: 'sell',
  STAKE: 'stake',
  UNSTAKE: 'unstake',
  CLAIM: 'claim',
  SWAP: 'swap',
  BRIDGE: 'bridge',
} as const

// Risk Levels
export const RISK_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const

// Theme Options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  GREEN: 'green',
} as const

// API Endpoints
export const API_ENDPOINTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  ASSETS: '/assets',
  PRICES: '/prices',
  TRANSACTIONS: '/transactions',
  USER: '/user',
  PORTFOLIO: '/portfolio',
  STAKING: '/staking',
  NEWS: '/news',
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'w3e-defi-theme',
  WALLET_ADDRESS: 'w3e-defi-wallet',
  USER_PREFERENCES: 'w3e-defi-preferences',
  PORTFOLIO_CACHE: 'w3e-defi-portfolio',
} as const

// Feature Flags
export const FEATURES = {
  TRADING: process.env.NEXT_PUBLIC_ENABLE_TRADING === 'true',
  STAKING: process.env.NEXT_PUBLIC_ENABLE_STAKING === 'true',
  GOVERNANCE: process.env.NEXT_PUBLIC_ENABLE_GOVERNANCE === 'true',
  MOBILE_APP: process.env.NEXT_PUBLIC_ENABLE_MOBILE_APP === 'true',
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

// Time Intervals
export const TIME_INTERVALS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const