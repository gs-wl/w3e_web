// Staking-related type definitions

export interface ProcessedStake {
  poolId: number;
  asset: string;
  stakedAmount: number;
  pendingRewards: number;
  apy: number;
  lockPeriod: number;
  unlockDate: Date;
  startDate: Date;
  isLocked: boolean;
  status: 'active' | 'locked' | 'unlocked';
  totalClaimed: number;
  timeRemaining: number; // seconds until unlock
  logo: string;
  color: string;
  
  // Raw contract data for transactions
  rawStakedAmount: bigint;
  rawPendingRewards: bigint;
  rawLastStakeTime: bigint;
  rawLockPeriod: bigint;
}

export interface StakeDataHookResult {
  stakes: ProcessedStake[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export type SortField = 'amount' | 'rewards' | 'apy' | 'unlockDate' | 'poolId' | 'startDate';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export type StatusFilter = 'all' | 'active' | 'locked' | 'unlocked';
export type AmountRangeFilter = 'all' | 'small' | 'medium' | 'large';

export interface FilterConfig {
  status: StatusFilter;
  amountRange: AmountRangeFilter;
  poolId?: number;
  searchTerm?: string;
}

// Amount range definitions (in RWA tokens)
export const AMOUNT_RANGES = {
  small: { min: 0, max: 1000 },
  medium: { min: 1000, max: 10000 },
  large: { min: 10000, max: Infinity },
} as const;