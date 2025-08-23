/**
 * @fileoverview Testing utilities for W3E DeFi Platform components
 * @description Helper functions and mocks for component testing
 * @version 1.0.0
 */

import React from 'react';
import type { TokenInfo, StakeInfo } from './types';

// =============================================================================
// TEST PROVIDERS
// =============================================================================

/**
 * Props for the test wrapper
 */
interface TestWrapperProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
}

/**
 * Test wrapper component that provides all necessary contexts
 * Note: This is a template - actual implementation depends on your testing setup
 */
function TestWrapper({ children, theme = 'light' }: TestWrapperProps) {
  // This is a placeholder implementation
  // Replace with actual providers when setting up testing
  return <div data-testid="test-wrapper" data-theme={theme}>{children}</div>;
}

/**
 * Custom render function with providers
 * Note: This is a template - implement when setting up testing framework
 */
interface CustomRenderOptions {
  theme?: 'light' | 'dark';
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { theme } = options;
  
  // Placeholder implementation
  // Replace with actual testing library render when setting up tests
  return {
    container: document.createElement('div'),
    rerender: () => {},
    unmount: () => {},
    debug: () => {},
  };
}

// =============================================================================
// MOCK DATA
// =============================================================================

/**
 * Mock token data for testing
 */
export const mockTokens: TokenInfo[] = [
  {
    id: 1,
    symbol: 'TSOL-001',
    name: 'Texas Solar Farm Token',
    type: 'Solar',
    tvl: '$4.2M',
    apy: '12.5',
    price: '$1,247.50',
    change24h: '+3.2%',
    marketCap: '$15.8M',
    liquidity: '$890K',
    chain: 'ethereum',
    verified: true,
    yieldType: 'Revenue Share',
    nextReward: '5 days',
    holders: 1247,
    logo: '/tokens/solar.svg',
  },
  {
    id: 2,
    symbol: 'WIND-EU',
    name: 'European Offshore Wind',
    type: 'Wind',
    tvl: '$12.7M',
    apy: '15.8',
    price: '$845.20',
    change24h: '+7.1%',
    marketCap: '$28.3M',
    liquidity: '$1.2M',
    chain: 'polygon',
    verified: true,
    yieldType: 'Staking Rewards',
    nextReward: '2 days',
    holders: 892,
    logo: '/tokens/wind.svg',
  },
  {
    id: 3,
    symbol: 'H2-PRO',
    name: 'Green Hydrogen Production',
    type: 'Hydrogen',
    tvl: '$8.9M',
    apy: '18.2',
    price: '$2,156.80',
    change24h: '-1.4%',
    marketCap: '$22.1M',
    liquidity: '$654K',
    chain: 'arbitrum',
    verified: true,
    yieldType: 'LP Rewards',
    nextReward: '1 day',
    holders: 543,
    logo: '/tokens/hydrogen.svg',
  },
];

/**
 * Mock stake data for testing
 */
export const mockStakes: StakeInfo[] = [
  {
    id: BigInt(1),
    token: '0x1234567890123456789012345678901234567890',
    amount: BigInt('1000000000000000000'), // 1 token
    rewards: BigInt('100000000000000000'), // 0.1 token
    startTime: BigInt(Math.floor(Date.now() / 1000) - 86400 * 30), // 30 days ago
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 60), // 60 days from now
    claimed: false,
  },
  {
    id: BigInt(2),
    token: '0x2345678901234567890123456789012345678901',
    amount: BigInt('2000000000000000000'), // 2 tokens
    rewards: BigInt('250000000000000000'), // 0.25 token
    startTime: BigInt(Math.floor(Date.now() / 1000) - 86400 * 60), // 60 days ago
    endTime: BigInt(Math.floor(Date.now() / 1000) - 86400 * 1), // 1 day ago (matured)
    claimed: false,
  },
];

/**
 * Mock wallet address for testing
 */
export const mockWalletAddress = '0x1234567890123456789012345678901234567890';

/**
 * Mock transaction hash for testing
 */
export const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

// =============================================================================
// MOCK HOOKS
// =============================================================================

/**
 * Mock useAccount hook
 */
export const mockUseAccount = {
  address: mockWalletAddress,
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  isReconnecting: false,
  status: 'connected' as const,
};

/**
 * Mock useBalance hook
 */
export const mockUseBalance = {
  data: {
    value: BigInt('5000000000000000000'), // 5 ETH
    symbol: 'ETH',
    decimals: 18,
    formatted: '5.0',
  },
  isLoading: false,
  error: null,
};

/**
 * Mock useStaking hook
 */
export const mockUseStaking = {
  userStakes: mockStakes,
  isLoading: false,
  error: null,
  stakeTokens: () => Promise.resolve(mockTxHash),
  unstakeTokens: () => Promise.resolve(mockTxHash),
  claimRewards: () => Promise.resolve(mockTxHash),
  approveToken: () => Promise.resolve(mockTxHash),
  useTokenBalance: () => mockUseBalance,
  useTokenAllowance: () => ({ data: BigInt('1000000000000000000000') }),
  usePendingRewards: () => ({ data: BigInt('100000000000000000') }),
};

/**
 * Mock useWhitelist hook
 */
export const mockUseWhitelist = {
  isWhitelisted: true,
  isLoading: false,
  error: null,
  submitWhitelistRequest: () => Promise.resolve(true),
};

/**
 * Mock useAdmin hook
 */
export const mockUseAdmin = {
  isAdmin: false,
  isLoading: false,
  error: null,
};

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Create a mock function with TypeScript support
 */
export function createMockFunction<T extends (...args: any[]) => any>(): T {
  return (() => {}) as T;
}

/**
 * Mock localStorage for testing
 */
export const mockLocalStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

/**
 * Mock window.matchMedia for responsive testing
 */
export const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
};

/**
 * Mock IntersectionObserver for testing
 */
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = function() {
    return {
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null,
    };
  };
  (window as any).IntersectionObserver = mockIntersectionObserver;
};

/**
 * Mock ResizeObserver for testing
 */
export const mockResizeObserver = () => {
  const mockResizeObserver = function() {
    return {
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null,
    };
  };
  (window as any).ResizeObserver = mockResizeObserver;
};

// =============================================================================
// CUSTOM MATCHERS
// =============================================================================

/**
 * Custom matcher to check if element has specific classes
 */
export function toHaveClasses(received: Element, expectedClasses: string[]) {
  const classList = Array.from(received.classList);
  const missingClasses = expectedClasses.filter(cls => !classList.includes(cls));
  
  if (missingClasses.length === 0) {
    return {
      message: () => `Expected element not to have classes: ${expectedClasses.join(', ')}`,
      pass: true,
    };
  }
  
  return {
    message: () => `Expected element to have classes: ${missingClasses.join(', ')}`,
    pass: false,
  };
}

/**
 * Custom matcher to check if element is accessible
 */
export function toBeAccessible(received: Element) {
  const hasAriaLabel = received.hasAttribute('aria-label');
  const hasAriaLabelledBy = received.hasAttribute('aria-labelledby');
  const hasRole = received.hasAttribute('role');
  const isButton = received.tagName.toLowerCase() === 'button';
  const isInput = received.tagName.toLowerCase() === 'input';
  
  const isAccessible = hasAriaLabel || hasAriaLabelledBy || hasRole || isButton || isInput;
  
  if (isAccessible) {
    return {
      message: () => 'Expected element not to be accessible',
      pass: true,
    };
  }
  
  return {
    message: () => 'Expected element to be accessible (have aria-label, aria-labelledby, role, or be a button/input)',
    pass: false,
  };
}

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Setup function to run before each test
 */
export function setupTest() {
  // Setup localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
  });
  
  // Setup matchMedia mock
  mockMatchMedia(false);
  
  // Setup observers
  mockIntersectionObserver();
  mockResizeObserver();
}

/**
 * Cleanup function to run after each test
 */
export function cleanupTest() {
  // Cleanup logic when using a testing framework
  // This is a placeholder for now
}

// =============================================================================
// EXPORT ALL UTILITIES
// =============================================================================

export {
  TestWrapper,
  renderWithProviders as render,
};

// Note: Add testing library re-exports when setting up testing framework
// export * from '@testing-library/react';
// export { userEvent } from '@testing-library/user-event';

// Default export for convenience
export default {
  renderWithProviders,
  mockTokens,
  mockStakes,
  mockWalletAddress,
  mockTxHash,
  setupTest,
  cleanupTest,
};