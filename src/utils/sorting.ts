import type { ProcessedStake, SortField, SortOrder, SortConfig } from '@/types/staking';

export const sortStakes = (
  stakes: ProcessedStake[],
  sortBy: SortField,
  sortOrder: SortOrder
): ProcessedStake[] => {
  return [...stakes].sort((a, b) => {
    let aValue: number | string | Date;
    let bValue: number | string | Date;

    switch (sortBy) {
      case 'amount':
        aValue = a.stakedAmount;
        bValue = b.stakedAmount;
        break;
      case 'rewards':
        aValue = a.pendingRewards;
        bValue = b.pendingRewards;
        break;
      case 'apy':
        aValue = a.apy;
        bValue = b.apy;
        break;
      case 'unlockDate':
        aValue = a.unlockDate;
        bValue = b.unlockDate;
        break;
      case 'startDate':
        aValue = a.startDate;
        bValue = b.startDate;
        break;
      case 'poolId':
        aValue = a.poolId;
        bValue = b.poolId;
        break;
      default:
        aValue = a.stakedAmount;
        bValue = b.stakedAmount;
    }

    // Handle different data types
    if (aValue instanceof Date && bValue instanceof Date) {
      const comparison = aValue.getTime() - bValue.getTime();
      return sortOrder === 'asc' ? comparison : -comparison;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = (aValue as string).localeCompare(bValue as string);
      return sortOrder === 'asc' ? comparison : -comparison;
    }

    // Handle numbers
    const numA = Number(aValue);
    const numB = Number(bValue);
    const comparison = numA - numB;
    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

export const getSortIcon = (currentSort: SortConfig, field: SortField): 'asc' | 'desc' | null => {
  if (currentSort.field !== field) return null;
  return currentSort.order;
};

export const getNextSortOrder = (currentSort: SortConfig, field: SortField): SortOrder => {
  if (currentSort.field !== field) return 'desc'; // Default to desc for new field
  return currentSort.order === 'asc' ? 'desc' : 'asc';
};

export const SORT_OPTIONS = [
  { key: 'amount' as SortField, label: 'Staked Amount' },
  { key: 'rewards' as SortField, label: 'Pending Rewards' },
  { key: 'apy' as SortField, label: 'APY' },
  { key: 'unlockDate' as SortField, label: 'Unlock Date' },
  { key: 'startDate' as SortField, label: 'Start Date' },
  { key: 'poolId' as SortField, label: 'Pool ID' },
] as const;