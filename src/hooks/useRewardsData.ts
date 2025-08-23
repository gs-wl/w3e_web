import React from 'react';
import { formatEther } from 'viem';
import { useUserStakesDetails, usePendingRewards, useUserInfo, usePoolInfo } from './useContracts';
import { contractUtils } from '@/utils/contracts';

export interface UserReward {
  poolId: number;
  tokenSymbol: string;
  availableRewards: number;
  totalEarned: number;
  apy: number;
  status: 'claimable' | 'pending';
  usdValue: number;
}

export interface RewardsDataHookResult {
  rewards: UserReward[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  totalClaimable: number;
  totalEarned: number;
  totalUsdValue: number;
}

// Hook to get all user rewards data
export const useUserRewards = (userAddress?: string): RewardsDataHookResult => {
  const userStakesDetails = useUserStakesDetails(userAddress);
  const [rewards, setRewards] = React.useState<UserReward[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const poolIds = userStakesDetails.stakedPoolIds;

  // Debug logging to track pool IDs loading
  React.useEffect(() => {
    console.log('🔍 useUserRewards - Pool IDs update:', {
      poolIds,
      poolIdsLength: poolIds.length,
      isLoading: userStakesDetails.isLoading,
      error: userStakesDetails.error?.message,
      userAddress
    });
  }, [poolIds, userStakesDetails.isLoading, userStakesDetails.error, userAddress]);

  React.useEffect(() => {
    const fetchRewardsData = async () => {
      if (!userAddress) {
        setRewards([]);
        setIsLoading(false);
        return;
      }

      // Wait for the userStakesDetails to finish loading
      if (userStakesDetails.isLoading) {
        setIsLoading(true);
        return;
      }

      // If there's an error or no pools, set empty state
      if (userStakesDetails.error || !poolIds.length) {
        setRewards([]);
        setIsLoading(false);
        setError(userStakesDetails.error);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Create basic rewards structure - individual components will populate with real data
        // This approach allows the table to render immediately while data loads
        const rewardsData: UserReward[] = poolIds.map((poolId: number) => ({
          poolId,
          tokenSymbol: 'W3E',
          availableRewards: 0, // Will be populated by RewardsRow component
          totalEarned: 0, // Will be populated by RewardsRow component
          apy: 0, // Will be populated by RewardsRow component
          status: 'pending' as const, // Will be updated by RewardsRow component
          usdValue: 0, // Will be calculated by RewardsRow component
        }));

        console.log('🔍 Creating rewards data for pools:', poolIds);
        setRewards(rewardsData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewardsData();
  }, [poolIds, userAddress, userStakesDetails.isLoading, userStakesDetails.error]);

  const refetch = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    // Trigger a re-fetch by updating the dependency
    const fetchRewardsData = async () => {
      if (!userAddress || userStakesDetails.isLoading) {
        return;
      }

      if (userStakesDetails.error || !poolIds.length) {
        setRewards([]);
        setIsLoading(false);
        setError(userStakesDetails.error);
        return;
      }

      try {
        const rewardsData: UserReward[] = poolIds.map((poolId: number) => ({
          poolId,
          tokenSymbol: 'W3E',
          availableRewards: 0,
          totalEarned: 0,
          apy: 0,
          status: 'pending' as const,
          usdValue: 0,
        }));

        console.log('🔍 Refetching rewards data for pools:', poolIds);
        setRewards(rewardsData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewardsData();
  }, [userAddress, poolIds, userStakesDetails.isLoading, userStakesDetails.error]);

  // Calculate totals
  const totals = React.useMemo(() => {
    const totalClaimable = rewards
      .filter(r => r.status === 'claimable')
      .reduce((sum, r) => sum + r.availableRewards, 0);
    
    const totalEarned = rewards.reduce((sum, r) => sum + r.totalEarned, 0);
    
    const totalUsdValue = rewards
      .filter(r => r.status === 'claimable')
      .reduce((sum, r) => sum + r.usdValue, 0);

    return { totalClaimable, totalEarned, totalUsdValue };
  }, [rewards]);

  return {
    rewards,
    isLoading: isLoading || userStakesDetails.isLoading,
    error: error || userStakesDetails.error,
    refetch,
    ...totals,
  };
};

// Hook for individual reward data (to be used by components that need real-time data)
export const useIndividualRewardData = (poolId: number, userAddress?: string) => {
  const pendingRewards = usePendingRewards(poolId, userAddress);
  const userInfo = useUserInfo(poolId, userAddress);
  const poolInfo = usePoolInfo(poolId);

  return React.useMemo(() => {
    if (!userInfo.data || !userAddress) {
      return null;
    }

    const user = userInfo.data as any;
    const pool = poolInfo.data as any;
    const rewards = pendingRewards.data ? Number(formatEther(pendingRewards.data as bigint)) : 0;
    const totalClaimed = Number(formatEther(user.totalRewardsClaimed || 0n));

    // Calculate APY from pool data
    let calculatedAPY = 0; // Start with 0 to indicate no data
    
    if (pool && pool.rewardRate !== undefined && pool.totalStaked !== undefined) {
      try {
        calculatedAPY = contractUtils.calculateAPY(
          pool.rewardRate.toString(),
          pool.totalStaked.toString()
        );
        
        // Debug logging to see what's happening
        console.log(`🔍 Pool ${poolId} APY calculation:`, {
          rewardRate: pool.rewardRate.toString(),
          totalStaked: pool.totalStaked.toString(),
          calculatedAPY,
          poolData: {
            isActive: pool.isActive,
            lockPeriod: pool.lockPeriod?.toString(),
            minStakeAmount: pool.minStakeAmount?.toString(),
            maxStakeLimit: pool.maxStakeLimit?.toString()
          }
        });
      } catch (error) {
        console.error(`❌ Error calculating APY for pool ${poolId}:`, error);
        calculatedAPY = 0;
      }
    } else {
      console.log(`⚠️ Pool ${poolId} missing data for APY calculation:`, {
        hasPool: !!pool,
        hasRewardRate: pool?.rewardRate !== undefined,
        hasTotalStaked: pool?.totalStaked !== undefined,
        rewardRate: pool?.rewardRate?.toString(),
        totalStaked: pool?.totalStaked?.toString(),
        poolKeys: pool ? Object.keys(pool) : 'no pool'
      });
    }

    const rewardData: UserReward = {
      poolId,
      tokenSymbol: 'W3E',
      availableRewards: rewards,
      totalEarned: totalClaimed + rewards,
      apy: calculatedAPY,
      status: rewards > 0 ? 'claimable' : 'pending',
      usdValue: rewards * 1.0, // Assuming 1 W3E = $1 for now
    };

    return rewardData;
  }, [poolId, userAddress, pendingRewards.data, userInfo.data, poolInfo.data]);
};