'use client';

import React from 'react';
import { Lock, Unlock, SortAsc, SortDesc } from 'lucide-react';
import { contractUtils } from '@/utils/contracts';
import { useIndividualStakeData } from '@/hooks/useStakesData';
import type { ProcessedStake, SortConfig, SortField } from '@/types/staking';

interface StakesTableProps {
  stakes: ProcessedStake[];
  userAddress?: string;
  onUnstakeClick: (stake: ProcessedStake) => void;
  sortConfig: SortConfig;
  onSortChange: (field: SortField) => void;
  selectedStakes?: ProcessedStake[];
  onStakeSelect?: (stake: ProcessedStake, selected: boolean) => void;
  onSelectAll?: () => void;
  bulkSelectionEnabled?: boolean;
  onStakeDataUpdate?: (poolId: number, stakeData: ProcessedStake) => void;
}

interface StakeRowProps {
  poolId: number;
  userAddress?: string;
  onUnstakeClick: (stake: ProcessedStake) => void;
  selectedStakes?: ProcessedStake[];
  onStakeSelect?: (stake: ProcessedStake, selected: boolean) => void;
  bulkSelectionEnabled?: boolean;
  stake: ProcessedStake;
  onStakeDataUpdate?: (poolId: number, stakeData: ProcessedStake) => void;
}

const StakeRow: React.FC<StakeRowProps> = ({ 
  poolId, 
  userAddress, 
  onUnstakeClick,
  selectedStakes = [],
  onStakeSelect,
  bulkSelectionEnabled = false,
  stake,
  onStakeDataUpdate
}) => {
  // Use individual data for real-time updates, but fall back to passed stake data
  const individualData = useIndividualStakeData(poolId, userAddress);
  
  // Update parent with real data when available
  React.useEffect(() => {
    if (individualData && onStakeDataUpdate) {
      onStakeDataUpdate(poolId, individualData);
    }
  }, [individualData, poolId, onStakeDataUpdate]);

  // If individual data is null (meaning 0 staked amount), don't render this row
  // Temporarily disabled to see all stakes
  // if (individualData === null) {
  //   return null;
  // }

  const stakeData = individualData || { ...stake, poolId }; // Ensure poolId is always correct

  if (!stakeData) {
    return (
      <tr className="animate-pulse">
        {bulkSelectionEnabled && (
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </td>
        )}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </td>
      </tr>
    );
  }

  const isSelected = selectedStakes.some(s => s.poolId === stakeData.poolId);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onStakeSelect) {
      onStakeSelect(stakeData, e.target.checked);
    }
  };

  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''}`}>
      {bulkSelectionEnabled && (
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${stakeData.color} flex items-center justify-center text-white font-bold text-xs`}>
            {stakeData.asset}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{stakeData.asset}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pool #{poolId ?? stake.poolId ?? 0}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          <p className="font-semibold text-gray-900 dark:text-white">
            {contractUtils.formatTokenDisplay(stakeData.stakedAmount.toString())}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ${(stakeData.stakedAmount * 1).toFixed(2)}
          </p>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          <p className="font-semibold text-green-600 dark:text-green-400">
            {contractUtils.formatRewardDisplay(stakeData.pendingRewards.toString())}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ${(stakeData.pendingRewards * 1).toFixed(stakeData.pendingRewards < 0.01 ? 6 : stakeData.pendingRewards < 0.1 ? 4 : 2)}
          </p>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {stakeData.apy.toFixed(2)}%
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          <p className="text-gray-900 dark:text-white">{stakeData.unlockDate.toISOString().split('T')[0]}</p>
          {stakeData.isLocked && (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              {contractUtils.formatDuration(stakeData.timeRemaining)} left
            </p>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          stakeData.status === 'locked'
            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
            : stakeData.status === 'unlocked'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
        }`}>
          {stakeData.isLocked ? (
            <>
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </>
          ) : (
            <>
              <Unlock className="w-3 h-3 mr-1" />
              Unlocked
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onUnstakeClick(stakeData)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            (stakeData.rawStakedAmount ? Number(stakeData.rawStakedAmount) > 0 : stakeData.stakedAmount > 0)
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
          disabled={stakeData.rawStakedAmount ? Number(stakeData.rawStakedAmount) <= 0 : stakeData.stakedAmount <= 0}
        >
          <Unlock className="w-3 h-3" />
          Unstake
        </button>
      </td>
    </tr>
  );
};

const MobileStakeCard: React.FC<{
  stake: ProcessedStake;
  userAddress?: string;
  selectedStakes: ProcessedStake[];
  onStakeSelect?: (stake: ProcessedStake, selected: boolean) => void;
  onUnstakeClick: (stake: ProcessedStake) => void;
  bulkSelectionEnabled: boolean;
}> = ({ stake, userAddress, selectedStakes, onStakeSelect, onUnstakeClick, bulkSelectionEnabled }) => {
  // Check if this stake has actual staked amount
  const individualData = useIndividualStakeData(stake.poolId, userAddress);
  
  // Don't render if no actual stake
  // Temporarily disabled to see all stakes
  // if (individualData === null) {
  //   return null;
  // }
  
  const isSelected = selectedStakes.some(s => s.poolId === stake.poolId);
  const stakeData = individualData || stake;
  
  return (
    <div 
      className={`p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3">
          {bulkSelectionEnabled && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onStakeSelect?.(stakeData, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-1"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white">{stakeData.asset}</h3>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Pool #{stakeData.poolId}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Lock ends: {stakeData.unlockDate.toISOString().split('T')[0]}
            </p>
          </div>
        </div>
        <button
          onClick={() => onUnstakeClick(stakeData)}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        >
          <Unlock className="inline w-4 h-4 mr-1" />
          Unstake
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Staked Amount</span>
          <p className="font-medium text-gray-900 dark:text-white">{contractUtils.formatTokenDisplay(stakeData.stakedAmount.toString())}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Pending Rewards</span>
          <p className="font-medium text-green-600 dark:text-green-400">
            {contractUtils.formatRewardDisplay(stakeData.pendingRewards.toString())}
          </p>
        </div>
      </div>
    </div>
  );
};

const SortableHeader: React.FC<{
  field: SortField;
  label: string;
  sortConfig: SortConfig;
  onSortChange: (field: SortField) => void;
}> = ({ field, label, sortConfig, onSortChange }) => {
  const isActive = sortConfig.field === field;
  const isAsc = isActive && sortConfig.order === 'asc';

  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button
        onClick={() => onSortChange(field)}
        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        {label}
        {isActive && (
          isAsc ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
        )}
      </button>
    </th>
  );
};

export const StakesTable: React.FC<StakesTableProps> = ({
  stakes,
  userAddress,
  onUnstakeClick,
  sortConfig,
  onSortChange,
  selectedStakes = [],
  onStakeSelect,
  onSelectAll,
  bulkSelectionEnabled = false,
  onStakeDataUpdate,
}) => {
  const allSelected = bulkSelectionEnabled && stakes.length > 0 && selectedStakes.length === stakes.length;
  if (stakes.length === 0) {
    return (
      <div className="text-center py-12">
        <Lock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Stakes Found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          No stakes match your current filters. Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      {/* Desktop view */}
      <div className="hidden sm:block">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {bulkSelectionEnabled && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              <SortableHeader field="poolId" label="Pool" sortConfig={sortConfig} onSortChange={onSortChange} />
              <SortableHeader field="amount" label="Staked Amount" sortConfig={sortConfig} onSortChange={onSortChange} />
              <SortableHeader field="rewards" label="Pending Rewards" sortConfig={sortConfig} onSortChange={onSortChange} />
              <SortableHeader field="apy" label="APY" sortConfig={sortConfig} onSortChange={onSortChange} />
              <SortableHeader field="unlockDate" label="Unlock Date" sortConfig={sortConfig} onSortChange={onSortChange} />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {stakes.map((stake) => (
              <StakeRow
                key={stake.poolId}
                poolId={stake.poolId}
                stake={stake}
                userAddress={userAddress}
                onUnstakeClick={onUnstakeClick}
                selectedStakes={selectedStakes}
                onStakeSelect={onStakeSelect}
                bulkSelectionEnabled={bulkSelectionEnabled}
                onStakeDataUpdate={onStakeDataUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="block sm:hidden">
        {stakes.map((stake) => (
          <MobileStakeCard
            key={stake.poolId}
            stake={stake}
            userAddress={userAddress}
            selectedStakes={selectedStakes}
            onStakeSelect={onStakeSelect}
            onUnstakeClick={onUnstakeClick}
            bulkSelectionEnabled={bulkSelectionEnabled}
          />
        ))}
      </div>
    </div>
  );
};