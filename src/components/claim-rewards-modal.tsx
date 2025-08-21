import React, { useState, useEffect } from 'react';
import { X, Gift, Clock, CheckCircle, TrendingUp, Calendar, Coins } from 'lucide-react';

interface ClaimRewardsModalProps {
  onClose?: () => void;
  selectedRewards?: string[];
}

// Mock data - in real app this would come from props or context
const userRewards = [
  {
    asset: 'ONT',
    availableRewards: 12.15,
    totalEarned: 125.75,
    apy: 7.46,
    lastClaimed: '2024-03-15',
    nextClaimDate: '2024-04-15',
    stakingPeriod: '6 Month',
    status: 'claimable',
    usdValue: 847.32,
    logo: '/ont.svg',
    color: 'from-green-500 to-green-600'
  },
  {
    asset: 'ADA',
    availableRewards: 45.82,
    totalEarned: 287.50,
    apy: 8.65,
    lastClaimed: '2024-03-10',
    nextClaimDate: '2024-04-10',
    stakingPeriod: '3 Month',
    status: 'claimable',
    usdValue: 1205.75,
    logo: '/ada.svg',
    color: 'from-blue-500 to-blue-600'
  },
  {
    asset: 'SOL',
    availableRewards: 2.35,
    totalEarned: 18.90,
    apy: 12.66,
    lastClaimed: '2024-03-20',
    nextClaimDate: '2024-04-20',
    stakingPeriod: '12 Month',
    status: 'claimable',
    usdValue: 425.60,
    logo: '/sol.svg',
    color: 'from-purple-500 to-purple-600'
  },
  {
    asset: 'XRP',
    availableRewards: 8.75,
    totalEarned: 92.40,
    apy: 15.47,
    lastClaimed: '2024-03-12',
    nextClaimDate: '2024-04-12',
    stakingPeriod: '9 Month',
    status: 'claimable',
    usdValue: 312.85,
    logo: '/xrp.svg',
    color: 'from-indigo-500 to-indigo-600'
  }
];

const ClaimRewardsModal = ({ onClose = () => {}, selectedRewards = [] }: ClaimRewardsModalProps) => {
  const [estimatedGas] = useState('0.0023');
  const [countdown, setCountdown] = useState({ h: 3, m: 45, s: 22 });
  
  // Filter rewards based on selected assets
  const rewardsToShow = selectedRewards.length > 0 
    ? userRewards.filter(reward => selectedRewards.includes(reward.asset))
    : userRewards.filter(reward => reward.status === 'claimable');
  
  const totalRewards = rewardsToShow.reduce((sum, reward) => sum + reward.availableRewards, 0);
  const totalUsdValue = rewardsToShow.reduce((sum, reward) => sum + reward.usdValue, 0);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle Escape key press
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { h: prev.h, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 };
        return { h: 0, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in"
           onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Claim Rewards</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reward Summary */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              {rewardsToShow.length === 1 ? 'Available Rewards' : `${rewardsToShow.length} Tokens to Claim`}
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-green-700 dark:text-green-300">
              ${totalUsdValue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total USD Value
            </p>
          </div>
        </div>

        {/* Reward Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {rewardsToShow.length === 1 ? 'Reward Details' : 'Rewards Breakdown'}
          </h3>
          
          {/* Individual Reward Items */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {rewardsToShow.map((reward, index) => (
              <div key={reward.asset} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${reward.color} flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">{reward.asset.slice(0, 2)}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{reward.asset}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{reward.stakingPeriod} stake</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {reward.availableRewards.toLocaleString()} {reward.asset}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ${reward.usdValue.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">APY:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{reward.apy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Earned:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{reward.totalEarned.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-500 dark:text-gray-400">Total Tokens</span>
              <span className="font-medium text-gray-900 dark:text-white">{rewardsToShow.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-500 dark:text-gray-400">Total USD Value</span>
              <span className="font-medium text-green-600 dark:text-green-400">${totalUsdValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Network Fee</span>
              <span className="font-medium text-gray-900 dark:text-white">{estimatedGas} ETH</span>
            </div>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Claiming Notice</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Rewards are automatically compounded if not claimed within 7 days. Network fees apply for manual claims.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
          >
            Cancel
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all">
            <Coins className="w-5 h-5" /> 
            {rewardsToShow.length === 1 
              ? `Claim ${rewardsToShow[0].availableRewards.toLocaleString()} ${rewardsToShow[0].asset}`
              : `Claim ${rewardsToShow.length} Rewards ($${totalUsdValue.toLocaleString()})`
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClaimRewardsModal;