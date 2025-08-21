import React from 'react';
import { formatEther } from 'viem';
import { useUserStakesDetails, usePoolInfo, useUserInfo, usePendingRewards } from './useContracts';
import { contractUtils } from '@/utils/contracts';
import type { ProcessedStake, StakeDataHookResult } from '@/types/staking';

// Custom hook to aggregate all user stakes data
export const useAggregatedUserStakes = (userAddress?: string): StakeDataHookResult => {
  const userStakesDetails = useUserStakesDetails(userAddress);
  const [stakes, setStakes] = React.useState<ProcessedStake[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const poolIds = userStakesDetails.stakedPoolIds;
  
  console.log('🔍 Debug useAggregatedUserStakes - Raw userStakesDetails:', {
    stakedPoolIds: userStakesDetails.stakedPoolIds,
    isLoading: userStakesDetails.isLoading,
    error: userStakesDetails.error?.message
  });

  React.useEffect(() => {
    const processStakes = async () => {
      if (!userAddress) {
        setStakes([]);
        setIsLoading(false);
        return;
      }

      // Only show stakes that actually exist
      console.log('🔍 Debug useAggregatedUserStakes - poolIds from contract:', poolIds);
      if (!poolIds.length) {
        setStakes([]);
        setIsLoading(false);
        return;
      }

      const stakesPoolIds = poolIds;

      setIsLoading(true);
      setError(null);

      try {
        // Create stakes with pool IDs - these will be enhanced with real data by the table
        const processedStakes: ProcessedStake[] = stakesPoolIds.map((poolId: number, index: number) => {
          // Ensure poolId is always a valid number
          const validPoolId = typeof poolId === 'number' ? poolId : index;
          const now = new Date();
          const unlockDate = new Date(now.getTime() + 86400000); // 24 hours from now
          
          return {
            poolId: validPoolId,
            asset: 'RWA',
            stakedAmount: 0, // Will be populated by individual fetching in table
            pendingRewards: 0, // Will be populated by individual fetching in table
            apy: 20.01,
            lockPeriod: 86400,
            unlockDate,
            startDate: now,
            isLocked: true,
            status: 'locked' as const,
            totalClaimed: 0,
            timeRemaining: 86400,
            logo: '/logo/logo.png',
            color: 'from-green-500 to-emerald-600',
            
            // Raw contract data placeholders
            rawStakedAmount: 0n,
            rawPendingRewards: 0n,
            rawLastStakeTime: BigInt(Math.floor(Date.now() / 1000)),
            rawLockPeriod: 86400n,
          };
        });

        setStakes(processedStakes);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    processStakes();
  }, [poolIds, userAddress]);

  const refetch = React.useCallback(() => {
    // Trigger re-fetch logic here
    setIsLoading(true);
  }, []);

  return {
    stakes,
    isLoading: isLoading || userStakesDetails.isLoading,
    error: error || userStakesDetails.error,
    refetch,
  };
};

// Hook for individual stake data (to be used by components that need real-time data)
export const useIndividualStakeData = (poolId: number, userAddress?: string) => {
  const poolInfo = usePoolInfo(poolId);
  const userInfo = useUserInfo(poolId, userAddress);
  const pendingRewards = usePendingRewards(poolId, userAddress);

  return React.useMemo(() => {
    console.log(`🔍 Debug useIndividualStakeData - Pool ${poolId} data check:`, {
      hasPoolInfo: !!poolInfo.data,
      hasUserInfo: !!userInfo.data,
      hasUserAddress: !!userAddress,
      poolInfoLoading: poolInfo.isLoading,
      userInfoLoading: userInfo.isLoading,
      poolInfoError: poolInfo.error?.message,
      userInfoError: userInfo.error?.message
    });
    
    if (!poolInfo.data || !userInfo.data || !userAddress) {
      console.log(`❌ Pool ${poolId}: Missing required data`);
      return null;
    }

    const pool = poolInfo.data as any;
    const user = userInfo.data as any;
    const rewards = pendingRewards.data ? Number(formatEther(pendingRewards.data as bigint)) : 0;
    
    const stakedAmount = Number(formatEther(user.stakedAmount));
    
    console.log(`🔍 Debug useIndividualStakeData - Pool ${poolId}:`, {
      stakedAmount,
      userStakedAmount: user.stakedAmount?.toString(),
      poolExists: !!pool,
      userExists: !!user
    });
    
    // If user has no staked amount, don't return stake data
    if (stakedAmount <= 0) {
      console.log(`❌ Pool ${poolId}: Filtered out due to 0 staked amount`);
      // Temporarily disable filtering to see all stakes
      // return null;
    }
    
    const lastStakeTime = Number(user.lastStakeTime);
    const lockPeriod = Number(pool.lockPeriod);
    const totalClaimed = Number(formatEther(user.totalRewardsClaimed));
    
    const now = Math.floor(Date.now() / 1000);
    const isLocked = contractUtils.isLocked(lastStakeTime, lockPeriod);
    const timeRemaining = contractUtils.calculateTimeRemaining(lastStakeTime, lockPeriod);
    const unlockDate = new Date((lastStakeTime + lockPeriod) * 1000);
    const startDate = new Date(lastStakeTime * 1000);
    const apy = contractUtils.calculateAPY(pool.rewardRate?.toString() || '0', pool.totalStaked?.toString() || '1');

    let status: 'active' | 'locked' | 'unlocked' = 'active';
    if (isLocked) status = 'locked';
    else if (stakedAmount > 0) status = 'unlocked';

    const processedStake: ProcessedStake = {
      poolId,
      asset: 'RWA',
      stakedAmount,
      pendingRewards: rewards,
      apy,
      lockPeriod,
      unlockDate,
      startDate,
      isLocked,
      status,
      totalClaimed,
      timeRemaining,
      logo: '/logo/logo.png',
      color: 'from-green-500 to-emerald-600',
      
      // Raw contract data
      rawStakedAmount: user.stakedAmount,
      rawPendingRewards: (pendingRewards.data as bigint) || 0n,
      rawLastStakeTime: user.lastStakeTime,
      rawLockPeriod: pool.lockPeriod,
    };

    return processedStake;
  }, [poolInfo.data, userInfo.data, pendingRewards.data, poolId, userAddress]);
};