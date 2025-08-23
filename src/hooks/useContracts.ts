import React from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getContractAddress } from '@/config/contracts';
import W3eTokenABI from '@/abi/tokens/W3eToken.json';
import StakingABI from '@/abi/staking/Staking.json';

// Contract addresses
const W3E_TOKEN_ADDRESS = getContractAddress('w3eToken');
const STAKING_CONTRACT_ADDRESS = getContractAddress('stakingContract');

// W3E Token Read Functions
export const useTokenBalance = (address?: string) => {
  return useReadContract({
    address: W3E_TOKEN_ADDRESS as `0x${string}`,
    abi: W3eTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
};

export const useTokenAllowance = (owner?: string, spender?: string) => {
  return useReadContract({
    address: W3E_TOKEN_ADDRESS as `0x${string}`,
    abi: W3eTokenABI,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!(owner && spender),
    },
  });
};

export const useTokenInfo = () => {
  const { data: name } = useReadContract({
    address: W3E_TOKEN_ADDRESS as `0x${string}`,
    abi: W3eTokenABI,
    functionName: 'name',
  });

  const { data: symbol } = useReadContract({
    address: W3E_TOKEN_ADDRESS as `0x${string}`,
    abi: W3eTokenABI,
    functionName: 'symbol',
  });

  const { data: decimals } = useReadContract({
    address: W3E_TOKEN_ADDRESS as `0x${string}`,
    abi: W3eTokenABI,
    functionName: 'decimals',
  });

  const { data: totalSupply } = useReadContract({
    address: W3E_TOKEN_ADDRESS as `0x${string}`,
    abi: W3eTokenABI,
    functionName: 'totalSupply',
  });

  const { data: maxSupply } = useReadContract({
    address: W3E_TOKEN_ADDRESS as `0x${string}`,
    abi: W3eTokenABI,
    functionName: 'MAX_SUPPLY',
  });

  return {
    name,
    symbol,
    decimals,
    totalSupply: totalSupply ? formatEther(totalSupply as bigint) : '0',
    maxSupply: maxSupply ? formatEther(maxSupply as bigint) : '0',
  };
};

// W3E Token Write Functions
export const useTokenApprove = () => {
  return useWriteContract();
};

export const useTokenTransfer = () => {
  return useWriteContract();
};

// Staking Contract Read Functions
export const usePoolInfo = (poolId: number) => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'getPoolInfo',
    args: [poolId],
  });
};

export const useUserInfo = (poolId: number, userAddress?: string) => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'getUserInfo',
    args: userAddress ? [poolId, userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
};

export const usePendingRewards = (poolId: number, userAddress?: string) => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'pendingRewards',
    args: userAddress ? [poolId, userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
};

export const usePoolCount = () => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'poolCount',
  });
};

export const useAllPools = () => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'getAllPools',
  });
};

export const useUserStakedPools = (userAddress?: string) => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'getUserStakedPools',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  });
};

export const usePoolUtilization = (poolId: number) => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'getPoolUtilization',
    args: [poolId],
  });
};

// Staking Contract Write Functions
export const useStake = () => {
  return useWriteContract();
};

export const useUnstake = () => {
  return useWriteContract();
};

export const useClaimRewards = () => {
  return useWriteContract();
};

export const useEmergencyUnstake = () => {
  return useWriteContract();
};

// Admin Functions
export const useContractOwner = () => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'owner',
  });
};

export const useAddPool = () => {
  return useWriteContract();
};

export const useUpdatePool = () => {
  return useWriteContract();
};

export const useSetEmergencyWithdrawFee = () => {
  return useWriteContract();
};

export const useCollectFees = () => {
  return useWriteContract();
};

export const usePauseContract = () => {
  return useWriteContract();
};

export const useUnpauseContract = () => {
  return useWriteContract();
};

export const useEmergencyTokenRecovery = () => {
  return useWriteContract();
};

export const useContractPaused = () => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'paused',
  });
};

export const useEmergencyWithdrawFee = () => {
  return useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: StakingABI,
    functionName: 'emergencyWithdrawFee',
  });
};

// Combined hooks for common operations
export const useStakingData = (poolId: number, userAddress?: string) => {
  const poolInfo = usePoolInfo(poolId);
  const userInfo = useUserInfo(poolId, userAddress);
  const pendingRewards = usePendingRewards(poolId, userAddress);
  const poolUtilization = usePoolUtilization(poolId);

  return {
    poolInfo: poolInfo.data,
    userInfo: userInfo.data,
    pendingRewards: pendingRewards.data ? formatEther(pendingRewards.data as bigint) : '0',
    poolUtilization: poolUtilization.data?.toString() || '0',
    isLoading: poolInfo.isLoading || userInfo.isLoading || pendingRewards.isLoading,
    error: poolInfo.error || userInfo.error || pendingRewards.error,
  };
};

// Hook to get detailed user stakes for all pools
export const useUserStakesDetails = (userAddress?: string) => {
  const userStakedPools = useUserStakedPools(userAddress);
  const allPools = useAllPools();
  
  console.log('🔍 Debug useUserStakesDetails - Raw contract data:', {
    userStakedPoolsData: userStakedPools.data,
    userStakedPoolsType: typeof userStakedPools.data,
    userStakedPoolsArray: Array.isArray(userStakedPools.data),
    userStakedPoolsLength: Array.isArray(userStakedPools.data) ? userStakedPools.data.length : 0,
    userStakedPoolsError: userStakedPools.error?.message,
    userStakedPoolsLoading: userStakedPools.isLoading,
    allPoolsLoading: allPools.isLoading,
    userAddress
  });
  
  // Convert BigInt array to number array properly
  const processedPoolIds = React.useMemo(() => {
    if (!userStakedPools.data) return [];
    
    const rawData = userStakedPools.data as any;
    console.log('🔍 Processing pool IDs:', rawData);
    
    // Handle different data formats
    if (Array.isArray(rawData)) {
      return rawData.map((id: any) => {
        if (typeof id === 'bigint') {
          return Number(id);
        }
        return Number(id);
      });
    }
    
    return [];
  }, [userStakedPools.data]);

  return {
    stakedPoolIds: processedPoolIds,
    allPools: allPools.data,
    isLoading: userStakedPools.isLoading || allPools.isLoading,
    error: userStakedPools.error || allPools.error,
  };
};

// Hook to get all user stakes with complete data for sorting/filtering
export const useAllUserStakes = (userAddress?: string) => {
  const userStakesDetails = useUserStakesDetails(userAddress);
  
  // For now, return basic data structure that can be sorted
  // We'll enhance this later with proper data fetching
  const stakes = React.useMemo(() => {
    if (!userStakesDetails.stakedPoolIds.length) return [];
    
    return userStakesDetails.stakedPoolIds.map((poolId: number) => ({
      poolId,
      asset: 'W3E',
      amount: 0, // Will be populated by individual components
      earned: 0, // Will be populated by individual components
      apy: 20.01, // Placeholder
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: 'active' as const,
      logo: '/logo/logo.png',
      color: 'from-green-500 to-emerald-600',
      lockPeriod: 86400,
      isLocked: true,
      totalClaimed: 0,
      // Raw contract data placeholders
      stakedAmount: 0n,
      pendingRewards: 0n,
      lastStakeTime: 0n,
    }));
  }, [userStakesDetails.stakedPoolIds]);
  
  return {
    stakes,
    isLoading: userStakesDetails.isLoading,
    error: userStakesDetails.error,
  };
};

export const useTokenData = (userAddress?: string) => {
  const tokenInfo = useTokenInfo();
  const balance = useTokenBalance(userAddress);
  const allowance = useTokenAllowance(userAddress, STAKING_CONTRACT_ADDRESS);

  return {
    ...tokenInfo,
    balance: balance.data ? formatEther(balance.data as bigint) : '0',
    allowance: allowance.data ? formatEther(allowance.data as bigint) : '0',
    isLoading: balance.isLoading || allowance.isLoading,
    error: balance.error || allowance.error,
  };
};

// Utility functions
export const formatTokenAmount = (amount: string | number, decimals: number = 18) => {
  if (typeof amount === 'string') {
    return parseEther(amount);
  }
  return parseEther(amount.toString());
};

export const parseTokenAmount = (amount: bigint) => {
  return formatEther(amount);
};

// Contract addresses export
export const contractAddresses = {
  w3eToken: W3E_TOKEN_ADDRESS,
  stakingContract: STAKING_CONTRACT_ADDRESS,
};

export default {
  useTokenBalance,
  useTokenAllowance,
  useTokenInfo,
  useTokenTransfer,
  useTokenApprove,
  usePoolInfo,
  useUserInfo,
  usePendingRewards,
  usePoolCount,
  useAllPools,
  useUserStakedPools,
  usePoolUtilization,
  useStake,
  useUnstake,
  useClaimRewards,
  useEmergencyUnstake,
  useStakingData,
  useTokenData,
  contractAddresses,
  // Admin functions
  useContractOwner,
  useAddPool,
  useUpdatePool,
  useSetEmergencyWithdrawFee,
  useCollectFees,
  usePauseContract,
  useUnpauseContract,
  useEmergencyTokenRecovery,
  useContractPaused,
  useEmergencyWithdrawFee,
};