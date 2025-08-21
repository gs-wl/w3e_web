'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther, formatEther, type Address } from 'viem';
import { CONTRACT_ADDRESSES, SUPPORTED_TOKENS } from '@/lib/web3-config';
import { StakeInfo } from '@/types';

// Basic ERC20 ABI for token operations
const ERC20_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Basic Staking Contract ABI
const STAKING_ABI = [
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'period', type: 'uint256' }
    ],
    name: 'stake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'stakeId', type: 'uint256' }],
    name: 'unstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'stakeId', type: 'uint256' }],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserStakes',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'rewards', type: 'uint256' },
          { name: 'claimed', type: 'bool' }
        ],
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }, { name: 'token', type: 'address' }],
    name: 'getPendingRewards',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useStaking() {
  const { address, chainId } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Get contract addresses for current chain
  const stakingContract = chainId ? CONTRACT_ADDRESSES[chainId]?.stakingContract : undefined;

  // Get user stakes
  const { data: userStakes, refetch: refetchStakes } = useReadContract({
    address: stakingContract as Address,
    abi: STAKING_ABI,
    functionName: 'getUserStakes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingContract,
    },
  }) as { data: StakeInfo[] | undefined, refetch: () => void };

  // Get token balance
  const useTokenBalance = (tokenSymbol: string) => {
    const token = SUPPORTED_TOKENS.find(t => t.symbol === tokenSymbol);
    const tokenAddress = token && chainId ? token.addresses[chainId] : undefined;

    return useReadContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
      query: {
        enabled: !!address && !!tokenAddress,
      },
    });
  };

  // Get token allowance
  const useTokenAllowance = (tokenSymbol: string) => {
    const token = SUPPORTED_TOKENS.find(t => t.symbol === tokenSymbol);
    const tokenAddress = token && chainId ? token.addresses[chainId] : undefined;

    return useReadContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: address && stakingContract ? [address, stakingContract as Address] : undefined,
      query: {
        enabled: !!address && !!tokenAddress && !!stakingContract,
      },
    });
  };

  // Get pending rewards
  const usePendingRewards = (tokenSymbol: string) => {
    const token = SUPPORTED_TOKENS.find(t => t.symbol === tokenSymbol);
    const tokenAddress = token && chainId ? token.addresses[chainId] : undefined;

    return useReadContract({
      address: stakingContract as Address,
      abi: STAKING_ABI,
      functionName: 'getPendingRewards',
      args: address && tokenAddress ? [address, tokenAddress as Address] : undefined,
      query: {
        enabled: !!address && !!tokenAddress && !!stakingContract,
      },
    });
  };

  // Approve token spending
  const approveToken = async (tokenSymbol: string, amount: string) => {
    if (!chainId || !stakingContract) {
      throw new Error('Chain not supported or staking contract not found');
    }

    const token = SUPPORTED_TOKENS.find(t => t.symbol === tokenSymbol);
    if (!token) {
      throw new Error('Token not supported');
    }

    const tokenAddress = token.addresses[chainId];
    if (!tokenAddress) {
      throw new Error('Token not available on this chain');
    }

    setIsLoading(true);
    setError(null);

    try {
      await writeContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [stakingContract as Address, parseEther(amount)],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve token');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Stake tokens
  const stakeTokens = async (tokenSymbol: string, amount: string, periodInDays: number) => {
    if (!chainId || !stakingContract) {
      throw new Error('Chain not supported or staking contract not found');
    }

    const token = SUPPORTED_TOKENS.find(t => t.symbol === tokenSymbol);
    if (!token) {
      throw new Error('Token not supported');
    }

    const tokenAddress = token.addresses[chainId];
    if (!tokenAddress) {
      throw new Error('Token not available on this chain');
    }

    setIsLoading(true);
    setError(null);

    try {
      await writeContract({
        address: stakingContract as Address,
        abi: STAKING_ABI,
        functionName: 'stake',
        args: [
          tokenAddress as Address,
          parseEther(amount),
          BigInt(periodInDays * 24 * 60 * 60) // Convert days to seconds
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stake tokens');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Unstake tokens
  const unstakeTokens = async (stakeId: bigint) => {
    if (!stakingContract) {
      throw new Error('Staking contract not found');
    }

    setIsLoading(true);
    setError(null);

    try {
      await writeContract({
        address: stakingContract as Address,
        abi: STAKING_ABI,
        functionName: 'unstake',
        args: [stakeId],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unstake tokens');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Claim rewards
  const claimRewards = async (stakeId: bigint) => {
    if (!stakingContract) {
      throw new Error('Staking contract not found');
    }

    setIsLoading(true);
    setError(null);

    try {
      await writeContract({
        address: stakingContract as Address,
        abi: STAKING_ABI,
        functionName: 'claimRewards',
        args: [stakeId],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim rewards');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch data after successful transaction
  useEffect(() => {
    if (isSuccess) {
      refetchStakes();
    }
  }, [isSuccess, refetchStakes]);

  return {
    // Data
    userStakes: userStakes as StakeInfo[] | undefined,
    
    // Hooks
    useTokenBalance,
    useTokenAllowance,
    usePendingRewards,
    
    // Actions
    approveToken,
    stakeTokens,
    unstakeTokens,
    claimRewards,
    
    // State
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    error,
    
    // Utils
    refetchStakes,
  };
}