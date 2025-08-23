// Contract ABI exports for the W3E DeFi Platform

// Staking contracts
import StakingABI from './staking/Staking.json';

// Token contracts
import W3eTokenABI from './tokens/W3eToken.json';

// Export all ABIs
export const ABIS = {
  // Staking
  Staking: StakingABI,
  
  // Tokens
  W3eToken: W3eTokenABI,
} as const;

// Type-safe ABI access
export type ABIName = keyof typeof ABIS;

// Helper function to get ABI by name
export function getABI(name: ABIName) {
  return ABIS[name];
}

// Re-export individual ABIs for direct imports
export {
  StakingABI,
  W3eTokenABI,
};