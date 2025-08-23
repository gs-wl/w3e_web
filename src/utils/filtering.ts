import type { 
  ProcessedStake, 
  FilterConfig, 
  StatusFilter, 
  AmountRangeFilter,
  AMOUNT_RANGES 
} from '@/types/staking';

export const filterStakes = (
  stakes: ProcessedStake[],
  filters: FilterConfig
): ProcessedStake[] => {
  return stakes.filter(stake => {
    // Status filter
    if (filters.status !== 'all') {
      if (filters.status !== stake.status) {
        return false;
      }
    }

    // Amount range filter
    if (filters.amountRange !== 'all') {
      const ranges = {
        small: { min: 0, max: 1000 },
        medium: { min: 1000, max: 10000 },
        large: { min: 10000, max: Infinity },
      };
      
      const range = ranges[filters.amountRange];
      if (stake.stakedAmount < range.min || stake.stakedAmount >= range.max) {
        return false;
      }
    }

    // Pool ID filter
    if (filters.poolId !== undefined) {
      if (stake.poolId !== filters.poolId) {
        return false;
      }
    }

    // Search term filter (searches pool ID and asset)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const poolIdMatch = stake.poolId.toString().includes(searchLower);
      const assetMatch = stake.asset.toLowerCase().includes(searchLower);
      
      if (!poolIdMatch && !assetMatch) {
        return false;
      }
    }

    return true;
  });
};

export const getStatusFilterOptions = () => [
  { value: 'all' as StatusFilter, label: 'All Status', count: 0 },
  { value: 'active' as StatusFilter, label: 'Active', count: 0 },
  { value: 'locked' as StatusFilter, label: 'Locked', count: 0 },
  { value: 'unlocked' as StatusFilter, label: 'Unlocked', count: 0 },
];

export const getAmountRangeOptions = () => [
  { value: 'all' as AmountRangeFilter, label: 'All Amounts', count: 0 },
  { value: 'small' as AmountRangeFilter, label: 'Small (< 1K W3E)', count: 0 },
  { value: 'medium' as AmountRangeFilter, label: 'Medium (1K - 10K W3E)', count: 0 },
  { value: 'large' as AmountRangeFilter, label: 'Large (> 10K W3E)', count: 0 },
];

export const updateFilterCounts = (
  stakes: ProcessedStake[],
  statusOptions: ReturnType<typeof getStatusFilterOptions>,
  amountOptions: ReturnType<typeof getAmountRangeOptions>
) => {
  // Update status counts
  const statusCounts = stakes.reduce((acc, stake) => {
    acc[stake.status] = (acc[stake.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const updatedStatusOptions = statusOptions.map(option => ({
    ...option,
    count: option.value === 'all' ? stakes.length : (statusCounts[option.value] || 0)
  }));

  // Update amount range counts
  const amountCounts = stakes.reduce((acc, stake) => {
    if (stake.stakedAmount < 1000) acc.small++;
    else if (stake.stakedAmount < 10000) acc.medium++;
    else acc.large++;
    return acc;
  }, { small: 0, medium: 0, large: 0 });

  const updatedAmountOptions = amountOptions.map(option => ({
    ...option,
    count: option.value === 'all' ? stakes.length : amountCounts[option.value as keyof typeof amountCounts] || 0
  }));

  return { statusOptions: updatedStatusOptions, amountOptions: updatedAmountOptions };
};

export const createDefaultFilters = (): FilterConfig => ({
  status: 'all',
  amountRange: 'all',
  poolId: undefined,
  searchTerm: undefined,
});

export const hasActiveFilters = (filters: FilterConfig): boolean => {
  return (
    filters.status !== 'all' ||
    filters.amountRange !== 'all' ||
    filters.poolId !== undefined ||
    Boolean(filters.searchTerm && filters.searchTerm.length > 0)
  );
};

export const clearAllFilters = (): FilterConfig => createDefaultFilters();