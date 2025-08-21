'use client';

import React from 'react';
import { Clock, Unlock, TrendingUp, DollarSign, Zap, Star } from 'lucide-react';
import type { FilterConfig, ProcessedStake } from '@/types/staking';

interface QuickFiltersProps {
  stakes: ProcessedStake[];
  onApplyFilter: (filter: Partial<FilterConfig>) => void;
  currentFilters: FilterConfig;
}

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  filter: Partial<FilterConfig>;
  count: number;
  color: string;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  stakes,
  onApplyFilter,
  currentFilters,
}) => {
  // Calculate counts for each quick filter
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const quickFilters: QuickFilter[] = [
    {
      id: 'recently-staked',
      label: 'Recently Staked',
      icon: <Clock className="w-3 h-3" />,
      filter: { searchTerm: undefined }, // We'll handle this with custom logic
      count: stakes.filter(stake => stake.startDate.getTime() > oneWeekAgo).length,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50',
    },
    {
      id: 'unlocked',
      label: 'Ready to Unstake',
      icon: <Unlock className="w-3 h-3" />,
      filter: { status: 'unlocked' },
      count: stakes.filter(stake => !stake.isLocked).length,
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50',
    },
    {
      id: 'high-rewards',
      label: 'High Rewards',
      icon: <TrendingUp className="w-3 h-3" />,
      filter: { searchTerm: undefined }, // Custom logic for rewards > 10
      count: stakes.filter(stake => stake.pendingRewards > 10).length,
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50',
    },
    {
      id: 'large-stakes',
      label: 'Large Stakes',
      icon: <DollarSign className="w-3 h-3" />,
      filter: { amountRange: 'large' },
      count: stakes.filter(stake => stake.stakedAmount >= 10000).length,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50',
    },
    {
      id: 'high-apy',
      label: 'High APY',
      icon: <Zap className="w-3 h-3" />,
      filter: { searchTerm: undefined }, // Custom logic for APY > 25%
      count: stakes.filter(stake => stake.apy > 25).length,
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50',
    },
    {
      id: 'top-performers',
      label: 'Top Performers',
      icon: <Star className="w-3 h-3" />,
      filter: { searchTerm: undefined }, // Custom logic for high rewards + high APY
      count: stakes.filter(stake => stake.pendingRewards > 5 && stake.apy > 20).length,
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50',
    },
  ];

  const handleQuickFilter = (quickFilter: QuickFilter) => {
    // Handle custom logic filters
    switch (quickFilter.id) {
      case 'recently-staked':
        // For recently staked, we'll clear other filters and let the component handle the date logic
        onApplyFilter({ 
          status: 'all', 
          amountRange: 'all', 
          searchTerm: undefined,
          poolId: undefined 
        });
        break;
      case 'high-rewards':
        // Clear other filters and let the component handle rewards logic
        onApplyFilter({ 
          status: 'all', 
          amountRange: 'all', 
          searchTerm: undefined,
          poolId: undefined 
        });
        break;
      case 'high-apy':
        // Clear other filters and let the component handle APY logic
        onApplyFilter({ 
          status: 'all', 
          amountRange: 'all', 
          searchTerm: undefined,
          poolId: undefined 
        });
        break;
      case 'top-performers':
        // Clear other filters and let the component handle performance logic
        onApplyFilter({ 
          status: 'all', 
          amountRange: 'all', 
          searchTerm: undefined,
          poolId: undefined 
        });
        break;
      default:
        // Apply the filter directly
        onApplyFilter(quickFilter.filter);
    }
  };

  // Don't show if no stakes
  if (stakes.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Filters:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleQuickFilter(filter)}
            disabled={filter.count === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter.count === 0
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                : filter.color
            }`}
          >
            {filter.icon}
            {filter.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
              filter.count === 0
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-500'
                : 'bg-white/20 text-current'
            }`}>
              {filter.count}
            </span>
          </button>
        ))}
      </div>
      
      {/* Helper text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Click on any filter to quickly find specific types of stakes. Numbers show how many stakes match each filter.
      </p>
    </div>
  );
};