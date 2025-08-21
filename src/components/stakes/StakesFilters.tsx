'use client';

import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { FilterConfig, StatusFilter, AmountRangeFilter } from '@/types/staking';
import { getStatusFilterOptions, getAmountRangeOptions, hasActiveFilters } from '@/utils/filtering';

interface StakesFiltersProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  onClearFilters: () => void;
  stakesCount: number;
  totalStakes: number;
}

export const StakesFilters: React.FC<StakesFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  stakesCount,
  totalStakes,
}) => {
  const statusOptions = getStatusFilterOptions();
  const amountOptions = getAmountRangeOptions();
  const hasFilters = hasActiveFilters(filters);

  const handleStatusChange = (status: StatusFilter) => {
    onFiltersChange({ ...filters, status });
  };

  const handleAmountRangeChange = (amountRange: AmountRangeFilter) => {
    onFiltersChange({ ...filters, amountRange });
  };

  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({ ...filters, searchTerm: searchTerm || undefined });
  };

  const handlePoolIdChange = (poolIdStr: string) => {
    const poolId = poolIdStr ? parseInt(poolIdStr, 10) : undefined;
    onFiltersChange({ ...filters, poolId: isNaN(poolId!) ? undefined : poolId });
  };

  return (
    <div className="space-y-4">
      {/* Search and Pool ID */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search stakes..."
              value={filters.searchTerm || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {filters.searchTerm && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="w-full sm:w-48">
          <input
            type="number"
            placeholder="Filter by Pool ID"
            value={filters.poolId || ''}
            onChange={(e) => handlePoolIdChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <select
              value={filters.status}
              onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Range Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount:</span>
            <select
              value={filters.amountRange}
              onChange={(e) => handleAmountRangeChange(e.target.value as AmountRangeFilter)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {amountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results and Clear */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {stakesCount} of {totalStakes} stakes
          </div>
          
          {hasFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Active filters:</span>
          
          {filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
              Status: {filters.status}
              <button
                onClick={() => handleStatusChange('all')}
                className="hover:text-blue-600 dark:hover:text-blue-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {filters.amountRange !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
              Amount: {filters.amountRange}
              <button
                onClick={() => handleAmountRangeChange('all')}
                className="hover:text-green-600 dark:hover:text-green-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {filters.poolId !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-full">
              Pool: #{filters.poolId}
              <button
                onClick={() => handlePoolIdChange('')}
                className="hover:text-purple-600 dark:hover:text-purple-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {filters.searchTerm && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs rounded-full">
              Search: "{filters.searchTerm}"
              <button
                onClick={() => handleSearchChange('')}
                className="hover:text-orange-600 dark:hover:text-orange-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};