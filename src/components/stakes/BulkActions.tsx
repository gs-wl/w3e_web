'use client';

import React from 'react';
import { Check, X, Gift, Unlock, Download, BarChart3 } from 'lucide-react';
import type { ProcessedStake } from '@/types/staking';

interface BulkActionsProps {
  selectedStakes: ProcessedStake[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkClaim: (stakes: ProcessedStake[]) => void;
  onBulkUnstake: (stakes: ProcessedStake[]) => void;
  onExportData: (stakes: ProcessedStake[]) => void;
  totalStakes: number;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedStakes,
  onSelectAll,
  onClearSelection,
  onBulkClaim,
  onBulkUnstake,
  onExportData,
  totalStakes,
}) => {
  const selectedCount = selectedStakes.length;
  const allSelected = selectedCount === totalStakes && totalStakes > 0;
  
  // Calculate totals for selected stakes
  const totalStakedAmount = selectedStakes.reduce((sum, stake) => sum + stake.stakedAmount, 0);
  const totalPendingRewards = selectedStakes.reduce((sum, stake) => sum + stake.pendingRewards, 0);
  const unlockedStakes = selectedStakes.filter(stake => !stake.isLocked);
  const stakesWithRewards = selectedStakes.filter(stake => stake.pendingRewards > 0);

  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {selectedCount} stake{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          <div className="hidden sm:flex items-center gap-4 text-sm text-blue-700 dark:text-blue-300">
            <span>
              Total Staked: {totalStakedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} W3E
            </span>
            <span>
              Total Rewards: {totalPendingRewards.toLocaleString(undefined, { maximumFractionDigits: 4 })} W3E
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Select All/Clear */}
          <button
            onClick={allSelected ? onClearSelection : onSelectAll}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
          >
            {allSelected ? (
              <>
                <X className="w-3 h-3" />
                Clear All
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                Select All
              </>
            )}
          </button>

          <div className="w-px h-6 bg-blue-300 dark:bg-blue-700" />

          {/* Bulk Claim Rewards */}
          {stakesWithRewards.length > 0 && (
            <button
              onClick={() => onBulkClaim(stakesWithRewards)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Gift className="w-3 h-3" />
              Claim Rewards ({stakesWithRewards.length})
            </button>
          )}

          {/* Bulk Unstake */}
          {unlockedStakes.length > 0 && (
            <button
              onClick={() => onBulkUnstake(unlockedStakes)}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Unlock className="w-3 h-3" />
              Unstake ({unlockedStakes.length})
            </button>
          )}

          {/* Export Data */}
          <button
            onClick={() => onExportData(selectedStakes)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-3 h-3" />
            Export
          </button>

          {/* Analytics */}
          <button
            onClick={() => {/* TODO: Implement analytics modal */}}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <BarChart3 className="w-3 h-3" />
            Analytics
          </button>

          <div className="w-px h-6 bg-blue-300 dark:bg-blue-700" />

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Mobile Summary */}
      <div className="sm:hidden mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-2 gap-4 text-sm text-blue-700 dark:text-blue-300">
          <div>
            <span className="font-medium">Total Staked:</span>
            <br />
            {totalStakedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} W3E
          </div>
          <div>
            <span className="font-medium">Total Rewards:</span>
            <br />
            {totalPendingRewards.toLocaleString(undefined, { maximumFractionDigits: 4 })} W3E
          </div>
        </div>
      </div>
    </div>
  );
};