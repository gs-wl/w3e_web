import React from 'react';
import { Gift, Clock } from 'lucide-react';
import { useIndividualRewardData } from '@/hooks/useRewardsData';
import { useRewardsContext } from '@/contexts/RewardsContext';

interface RewardsMobileCardProps {
  poolId: number;
  userAddress?: string;
  onClaim: (poolId: number) => void;
}

export const RewardsMobileCard: React.FC<RewardsMobileCardProps> = ({
  poolId,
  userAddress,
  onClaim,
}) => {
  const rewardData = useIndividualRewardData(poolId, userAddress);
  const { updateRewardData } = useRewardsContext();

  // Update the context when reward data changes
  React.useEffect(() => {
    if (rewardData) {
      updateRewardData(poolId, rewardData);
    }
  }, [rewardData, poolId, updateRewardData]);

  if (!rewardData) {
    return (
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <div>
              <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div>
            <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div>
            <div className="w-8 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
            <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div>
            <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">#{poolId}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{rewardData.tokenSymbol}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              rewardData.status === 'claimable'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {rewardData.status === 'claimable' ? 'Claimable' : 'Pending'}
            </span>
          </div>
        </div>
        {rewardData.status === 'claimable' && (
          <button
            onClick={() => onClaim(poolId)}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 font-semibold text-sm"
          >
            Claim
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Available</span>
          <p className="font-medium text-gray-900 dark:text-white">{rewardData.availableRewards.toFixed(4)} {rewardData.tokenSymbol}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Total Earned</span>
          <p className="font-medium text-gray-900 dark:text-white">{rewardData.totalEarned.toFixed(4)} {rewardData.tokenSymbol}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">APY</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {rewardData.apy > 0 ? `${rewardData.apy.toFixed(2)}%` : (
              <span className="text-gray-400 dark:text-gray-500 text-sm">Loading...</span>
            )}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">USD Value</span>
          <p className="font-medium text-green-600 dark:text-green-400">${rewardData.usdValue.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};