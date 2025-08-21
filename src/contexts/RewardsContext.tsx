import React, { createContext, useContext, useState, useCallback } from 'react';
import { UserReward } from '@/hooks/useRewardsData';

interface RewardsContextType {
  rewardsData: Map<number, UserReward>;
  updateRewardData: (poolId: number, data: UserReward) => void;
  getTotals: () => {
    totalClaimable: number;
    totalEarned: number;
    totalUsdValue: number;
  };
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const RewardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rewardsData, setRewardsData] = useState<Map<number, UserReward>>(new Map());

  const updateRewardData = useCallback((poolId: number, data: UserReward) => {
    setRewardsData(prev => {
      const newMap = new Map(prev);
      newMap.set(poolId, data);
      return newMap;
    });
  }, []);

  const getTotals = useCallback(() => {
    const rewards = Array.from(rewardsData.values());
    
    const totalClaimable = rewards
      .filter(r => r.status === 'claimable')
      .reduce((sum, r) => sum + r.availableRewards, 0);
    
    const totalEarned = rewards.reduce((sum, r) => sum + r.totalEarned, 0);
    
    const totalUsdValue = rewards
      .filter(r => r.status === 'claimable')
      .reduce((sum, r) => sum + r.usdValue, 0);

    return { totalClaimable, totalEarned, totalUsdValue };
  }, [rewardsData]);

  return (
    <RewardsContext.Provider value={{ rewardsData, updateRewardData, getTotals }}>
      {children}
    </RewardsContext.Provider>
  );
};

export const useRewardsContext = () => {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error('useRewardsContext must be used within a RewardsProvider');
  }
  return context;
};