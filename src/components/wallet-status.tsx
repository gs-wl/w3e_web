'use client';

import React from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { DollarSign, TrendingUp, PieChart } from 'lucide-react';
import { useUserStakesDetails, useAllPools, useUserInfo, usePendingRewards } from '@/hooks/useContracts';

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const userStakesDetails = useUserStakesDetails(address);
  const allPools = useAllPools();





  // Get native token balance (ETH, MATIC, etc.)
  const { data: nativeBalance } = useBalance({
    address,
  });

  // Component to fetch individual pool data and calculate total earned
  const PoolEarningsCalculator = React.memo(({ poolId, onEarningsUpdate }: { poolId: number, onEarningsUpdate: (poolId: number, earnings: number) => void }) => {
    const userInfo = useUserInfo(poolId, address);
    const pendingRewards = usePendingRewards(poolId, address);
    const lastEarningsRef = React.useRef<number | null>(null);

    React.useEffect(() => {
      if (userInfo.data && pendingRewards.data) {
        const user = userInfo.data as any;
        const claimed = Number(formatEther(user.totalRewardsClaimed || 0n));
        const pending = Number(formatEther(pendingRewards.data as bigint));
        const totalEarnings = (claimed + pending) * 1.0; // Convert to USD (assuming 1 W3E = $1)
        
        // Only update if the value has changed
        if (lastEarningsRef.current !== totalEarnings) {
          lastEarningsRef.current = totalEarnings;
          onEarningsUpdate(poolId, totalEarnings);
        }
      } else if (!userInfo.isLoading && !pendingRewards.isLoading && lastEarningsRef.current !== 0) {
        // If data is loaded but no earnings, set to 0
        lastEarningsRef.current = 0;
        onEarningsUpdate(poolId, 0);
      }
    }, [userInfo.data, pendingRewards.data, userInfo.isLoading, pendingRewards.isLoading, poolId]);

    return null; // This component doesn't render anything
  });

  // State to track pool earnings
  const [poolEarnings, setPoolEarnings] = React.useState<Record<number, number>>({});

  // Create stable callback for earnings updates
  const handleEarningsUpdate = React.useCallback((poolId: number, earnings: number) => {
    setPoolEarnings(prev => {
      // Only update if the value has actually changed
      if (prev[poolId] !== earnings) {
        return {
          ...prev,
          [poolId]: earnings
        };
      }
      return prev;
    });
  }, []);

  // Calculate total earned
  const totalEarned = React.useMemo(() => {
    const earnings = Object.values(poolEarnings);
    return earnings.reduce((sum, earning) => sum + earning, 0);
  }, [poolEarnings]);

  // Calculate total earned info
  const totalEarnedInfo = React.useMemo(() => {
    return {
      totalEarned,
      poolCount: userStakesDetails.stakedPoolIds.length
    };
  }, [totalEarned, userStakesDetails.stakedPoolIds.length]);

  // Calculate Total Value Locked (TVL) across all pools
  const tvlInfo = React.useMemo(() => {
    if (!allPools.data) {
      return { totalTVL: 0, poolCount: 0 };
    }

    const pools = allPools.data as any[];
    let totalTVL = 0;
    let activePoolCount = 0;

    pools.forEach((pool: any) => {
      if (pool.isActive && pool.totalStaked) {
        // Convert totalStaked from wei to tokens
        const stakedAmount = Number(formatEther(pool.totalStaked));
        // Assuming 1 W3E token = $1 USD for now
        // In a real implementation, you'd fetch the actual token price
        totalTVL += stakedAmount * 1.0;
        activePoolCount++;
      }
    });

    return {
      totalTVL,
      poolCount: activePoolCount
    };
  }, [allPools.data]);



  if (!isConnected) {
    return null;
  }

  return (
    <div>
      {/* Hidden components to fetch individual pool data */}
      {address && userStakesDetails.stakedPoolIds.map((poolId: number) => (
        <PoolEarningsCalculator
          key={poolId}
          poolId={poolId}
          onEarningsUpdate={handleEarningsUpdate}
        />
      ))}

      {/* Wallet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Native Balance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {nativeBalance?.symbol || 'ETH'} Balance
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {nativeBalance ?
              Number(formatEther(nativeBalance.value)).toLocaleString(undefined, {
                maximumFractionDigits: 4
              }) :
              '0.0000'
            }
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {nativeBalance?.symbol || 'ETH'}
          </p>
        </div>

        {/* Total Earned */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Earned
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${totalEarnedInfo.totalEarned.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            From {totalEarnedInfo.poolCount} {totalEarnedInfo.poolCount === 1 ? 'pool' : 'pools'}
          </p>
        </div>

        {/* Total Value Locked (TVL) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <PieChart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Value Locked</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${tvlInfo.totalTVL.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Across {tvlInfo.poolCount} active {tvlInfo.poolCount === 1 ? 'pool' : 'pools'}
          </p>
        </div>
      </div>




    </div>
  );
}