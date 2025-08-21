import React from 'react';
import { Gift, Clock } from 'lucide-react';
import { useIndividualRewardData } from '@/hooks/useRewardsData';
import { useRewardsContext } from '@/contexts/RewardsContext';

interface RewardsRowProps {
    poolId: number;
    userAddress?: string;
    onClaim: (poolId: number) => void;
}

export const RewardsRow: React.FC<RewardsRowProps> = ({
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
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                    {/* No checkbox needed for individual claims */}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                        <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
            </tr>
        );
    }

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <td className="px-6 py-4 whitespace-nowrap">
                {/* No checkbox needed for individual claims */}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">#{poolId}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{rewardData.tokenSymbol}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                {rewardData.availableRewards.toFixed(4)} {rewardData.tokenSymbol}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                {rewardData.totalEarned.toFixed(4)} {rewardData.tokenSymbol}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                {rewardData.apy > 0 ? `${rewardData.apy.toFixed(2)}%` : (
                    <span className="text-gray-400 text-sm">Loading...</span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${rewardData.status === 'claimable'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                    {rewardData.status === 'claimable' ? 'Claimable' : 'Pending'}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {rewardData.status === 'claimable' ? (
                    <button
                        onClick={() => onClaim(poolId)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 font-semibold"
                    >
                        <Gift className="inline w-4 h-4 mr-1" /> Claim
                    </button>
                ) : (
                    <span className="text-gray-400 text-sm">
                        <Clock className="inline w-4 h-4 mr-1" /> Pending
                    </span>
                )}
            </td>
        </tr>
    );
};