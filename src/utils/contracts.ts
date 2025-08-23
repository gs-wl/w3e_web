import { parseEther, formatEther, type Address } from 'viem';
import { getContractAddress, getBlockExplorerUrl, getTransactionUrl } from '@/config/contracts';

// Contract addresses
export const W3E_TOKEN_ADDRESS = getContractAddress('w3eToken') as Address;
export const STAKING_CONTRACT_ADDRESS = getContractAddress('stakingContract') as Address;

// Common contract interaction utilities
export const contractUtils = {
  // Format token amounts
  formatAmount: (amount: bigint | string, decimals: number = 18): string => {
    if (typeof amount === 'string') {
      return amount;
    }
    return formatEther(amount);
  },

  // Parse token amounts
  parseAmount: (amount: string): bigint => {
    return parseEther(amount);
  },

  // Format percentage
  formatPercentage: (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num.toFixed(2)}%`;
  },

  // Format time duration
  formatDuration: (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  },

  // Get explorer URLs
  getAddressUrl: (address: string): string => {
    return getBlockExplorerUrl(address);
  },

  getTxUrl: (txHash: string): string => {
    return getTransactionUrl(txHash);
  },

  // Validate address
  isValidAddress: (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  // Truncate address for display
  truncateAddress: (address: string, startLength: number = 6, endLength: number = 4): string => {
    if (!address) return '';
    if (address.length <= startLength + endLength) return address;
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
  },

  // Format large numbers
  formatLargeNumber: (num: number | string): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(2)}K`;
    } else {
      return value.toFixed(2);
    }
  },

  // Calculate APY from reward rate (tokens per second per token staked)
  calculateAPY: (rewardRate: string, totalStaked: string): number => {
    if (!rewardRate) return 0;
    
    // Convert reward rate from wei to tokens (if it's in wei format)
    const rewardRateWei = parseFloat(rewardRate);
    const rewardRateTokens = rewardRateWei / 1e18;
    
    // Calculate APY: reward rate per second * seconds per year * 100
    const secondsPerYear = 365.25 * 24 * 60 * 60; // 31,557,600
    const apy = rewardRateTokens * secondsPerYear * 100;
    
    return apy;
  },

  // Calculate time remaining for lock period
  calculateTimeRemaining: (lastStakeTime: number, lockPeriod: number): number => {
    const now = Math.floor(Date.now() / 1000);
    const unlockTime = lastStakeTime + lockPeriod;
    return Math.max(0, unlockTime - now);
  },

  // Check if tokens are locked
  isLocked: (lastStakeTime: number, lockPeriod: number): boolean => {
    return contractUtils.calculateTimeRemaining(lastStakeTime, lockPeriod) > 0;
  },

  // Format token symbol with amount
  formatTokenDisplay: (amount: string | number, symbol: string = 'W3E'): string => {
    const formattedAmount = typeof amount === 'string' ? amount : amount.toString();
    return `${parseFloat(formattedAmount).toLocaleString()} ${symbol}`;
  },

  // Format token display with more decimal places for small amounts (rewards)
  formatRewardDisplay: (amount: string | number, symbol: string = 'W3E'): string => {
    const formattedAmount = typeof amount === 'string' ? amount : amount.toString();
    const numAmount = parseFloat(formattedAmount);
    
    // Show more decimal places for small amounts
    let decimals = 2; // default
    if (numAmount < 0.01) decimals = 6;
    else if (numAmount < 0.1) decimals = 4;
    else if (numAmount < 1) decimals = 3;
    
    return `${numAmount.toLocaleString(undefined, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    })} ${symbol}`;
  },

  // Calculate emergency unstake fee
  calculateEmergencyFee: (amount: string, feeRate: number = 500): string => {
    const amountNum = parseFloat(amount);
    const fee = (amountNum * feeRate) / 10000; // feeRate is in basis points
    return fee.toString();
  },

  // Get pool status
  getPoolStatus: (isActive: boolean, totalStaked: string, maxStakeLimit: string): string => {
    if (!isActive) return 'Inactive';
    
    const utilization = (parseFloat(totalStaked) / parseFloat(maxStakeLimit)) * 100;
    
    if (utilization >= 100) return 'Full';
    if (utilization >= 90) return 'Nearly Full';
    if (utilization >= 50) return 'Active';
    return 'Available';
  },

  // Validate stake amount
  validateStakeAmount: (
    amount: string,
    balance: string,
    minStake: string,
    maxStake: string,
    currentStaked: string
  ): { isValid: boolean; error?: string } => {
    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(balance);
    const minStakeNum = parseFloat(minStake);
    const maxStakeNum = parseFloat(maxStake);
    const currentStakedNum = parseFloat(currentStaked);

    if (amountNum <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }

    if (amountNum > balanceNum) {
      return { isValid: false, error: 'Insufficient balance' };
    }

    if (amountNum < minStakeNum) {
      return { isValid: false, error: `Minimum stake amount is ${minStakeNum} W3E` };
    }

    if (currentStakedNum + amountNum > maxStakeNum) {
      return { isValid: false, error: 'Would exceed pool maximum stake limit' };
    }

    return { isValid: true };
  },

  // Validate unstake amount
  validateUnstakeAmount: (
    amount: string,
    stakedAmount: string
  ): { isValid: boolean; error?: string } => {
    const amountNum = parseFloat(amount);
    const stakedNum = parseFloat(stakedAmount);

    if (amountNum <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }

    if (amountNum > stakedNum) {
      return { isValid: false, error: 'Cannot unstake more than staked amount' };
    }

    return { isValid: true };
  },
};

// Transaction status helpers
export const txStatus = {
  isPending: (status: string): boolean => {
    return status === 'pending' || status === 'loading';
  },

  isSuccess: (status: string): boolean => {
    return status === 'success';
  },

  isError: (status: string): boolean => {
    return status === 'error';
  },

  getMessage: (status: string, type: string): string => {
    switch (status) {
      case 'pending':
        return `${type} transaction pending...`;
      case 'success':
        return `${type} successful!`;
      case 'error':
        return `${type} failed. Please try again.`;
      default:
        return '';
    }
  },
};

// Error handling
export const handleContractError = (error: any): string => {
  if (error?.message) {
    // Common error patterns
    if (error.message.includes('User rejected')) {
      return 'Transaction was rejected by user';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    if (error.message.includes('execution reverted')) {
      return 'Transaction failed - please check requirements';
    }
    return error.message;
  }
  
  return 'An unknown error occurred';
};

// Constants
export const CONSTANTS = {
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000' as Address,
  MAX_UINT256: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
  SECONDS_PER_DAY: 86400,
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_MINUTE: 60,
  BASIS_POINTS_DIVISOR: 10000,
} as const;

export default contractUtils;