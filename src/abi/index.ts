// Contract ABI exports for the RWA DeFi Platform

// Staking contracts
import StakingABI from './staking/Staking.json';

// Token contracts
import RwaTokenABI from './tokens/RwaToken.json';

// Export all ABIs
export const ABIS = {
  // Staking
  Staking: StakingABI,
  
  // Tokens
  RwaToken: RwaTokenABI,
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
  RwaTokenABI,
};