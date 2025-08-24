'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Lock, Unlock, Clock, Gift, PlusCircle,
  TrendingUp, DollarSign,
  SortAsc, SortDesc, AlertCircle, CheckCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { useAccount, useChainId, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { Web3StakingModal } from './web3-staking-modal';
import { Web3ClaimModal } from './web3-claim-modal';
import { Web3UnstakeModal } from './web3-unstake-modal';
import { WalletStatus } from './wallet-status';

// Import our real contract hooks and utilities
import {
  useTokenData,
  useStakingData,
  usePoolInfo,
  useAllPools,
  useUserStakedPools,
  useUserStakesDetails,
  useUserInfo,
  usePendingRewards,
  useContractOwner,
  useContractPaused,
  useEmergencyWithdrawFee,
  contractAddresses
} from '@/hooks/useContracts';
import { useAggregatedUserStakes } from '@/hooks/useStakesData';
import Image from 'next/image';
import { useStakesPreferences, useAutoRefresh } from '@/hooks/useStakesPreferences';
import { useAdmin } from '@/hooks/useAdmin';
import { useUserRewards } from '@/hooks/useRewardsData';
import { RewardsRow } from '@/components/rewards/RewardsRow';
import { RewardsMobileCard } from '@/components/rewards/RewardsMobileCard';
import { RewardsProvider, useRewardsContext } from '@/contexts/RewardsContext';
import { useRewardsPreferences } from '@/hooks/useRewardsPreferences';
import { StakesTable } from '@/components/stakes/StakesTable';
import { StakesFilters } from '@/components/stakes/StakesFilters';
import { BulkActions } from '@/components/stakes/BulkActions';
import { QuickFilters } from '@/components/stakes/QuickFilters';
import { sortStakes, getNextSortOrder, SORT_OPTIONS } from '@/utils/sorting';
import { filterStakes, createDefaultFilters, clearAllFilters } from '@/utils/filtering';
import { exportStakesData, generateStakesSummary } from '@/utils/export';
import type { SortConfig, FilterConfig, ProcessedStake } from '@/types/staking';
import { contractUtils } from '@/utils/contracts';
import { getCurrentNetworkConfig, getNetworkConfig, isSupportedChain } from '@/config/contracts';

// Define types for our contract data
interface PoolData {
  poolId: number;
  stakingToken: string;
  totalStaked: bigint;
  maxStakeLimit: bigint;
  minStakeAmount: bigint;
  rewardRate: bigint;
  isActive: boolean;
  lockPeriod: bigint;
  totalRewardsDistributed: bigint;
}

interface UserStakeData {
  poolId: number;
  stakedAmount: bigint;
  pendingRewards: bigint;
  lastStakeTime: bigint;
  totalRewardsClaimed: bigint;
  tokenSymbol: string;
  lockPeriod: bigint;
}

interface UserReward {
  poolId: number;
  tokenSymbol: string;
  availableRewards: number;
  totalEarned: number;
  apy: number;
  status: 'claimable' | 'pending';
  usdValue: number;
}

const StakingPage = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Real contract data
  const tokenData = useTokenData(address);
  const allPools = useAllPools();
  const userStakedPools = useUserStakedPools(address);
  const userStakesDetails = useUserStakesDetails(address);
  const aggregatedStakes = useAggregatedUserStakes(address);
  const userRewardsData = useUserRewards(address);




  // Admin data
  const contractOwner = useContractOwner();
  const contractPaused = useContractPaused();
  const emergencyWithdrawFee = useEmergencyWithdrawFee();
  const { isAdmin } = useAdmin();

  // Check if current user is the contract owner
  const isOwner = Boolean(address && contractOwner.data &&
    address.toLowerCase() === (contractOwner.data as string).toLowerCase());

  // Allow admin access for both contract owner and general admins
  const hasAdminAccess = isOwner || isAdmin;

  // Network check
  const currentNetwork = getCurrentNetworkConfig();
  const isCorrectNetwork = chainId === currentNetwork.chainId;

  // UI state
  const [tab, setTab] = useState<'offerings' | 'my-stakes' | 'rewards' | 'admin'>('offerings');
  const [showStakingModal, setShowStakingModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<number>(0);
  const [selectedStake, setSelectedStake] = useState<ProcessedStake | undefined>(undefined);

  // Sorting and filtering states for offerings
  const [offeringSortBy, setOfferingSortBy] = useState('apy');
  const [offeringSortOrder, setOfferingSortOrder] = useState<'asc' | 'desc'>('desc');
  const [offeringStatusFilter, setOfferingStatusFilter] = useState('all');

  // Enhanced sorting and filtering states for stakes with preferences
  const stakesPreferences = useStakesPreferences();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'amount', order: 'desc' });
  const [filters, setFilters] = useState<FilterConfig>(createDefaultFilters());
  const [selectedStakes, setSelectedStakes] = useState<ProcessedStake[]>([]);
  const [bulkSelectionEnabled, setBulkSelectionEnabled] = useState(false);

  // Initialize preferences when loaded
  React.useEffect(() => {
    if (stakesPreferences.isLoaded) {
      setSortConfig(stakesPreferences.preferences.sortConfig);
      setFilters(stakesPreferences.preferences.filters);
    }
  }, [stakesPreferences.isLoaded, stakesPreferences.preferences]);

  // Rewards preferences
  const rewardsPreferences = useRewardsPreferences();
  const [rewardsSortBy, setRewardsSortBy] = useState('availableRewards');
  const [rewardsSortOrder, setRewardsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [rewardsStatusFilter, setRewardsStatusFilter] = useState('all');
  const [claimingPoolId, setClaimingPoolId] = useState<number | undefined>(undefined);

  // Initialize preferences when loaded
  React.useEffect(() => {
    if (rewardsPreferences.isLoaded) {
      setRewardsSortBy(rewardsPreferences.preferences.sortBy);
      setRewardsSortOrder(rewardsPreferences.preferences.sortOrder);
      setRewardsStatusFilter(rewardsPreferences.preferences.statusFilter);
    }
  }, [rewardsPreferences.isLoaded, rewardsPreferences.preferences]);

  // Process pool data for offerings
  const stakingOffers = useMemo(() => {
    if (!allPools.data || !Array.isArray(allPools.data)) return [];

    return allPools.data.map((pool: any, index: number) => ({
      poolId: index,
      asset: 'W3E', // Since we're using W3E token
      apy: contractUtils.calculateAPY(
        pool.rewardRate?.toString() || '0',
        pool.totalStaked?.toString() || '1'
      ),
      min: Number(pool.minStakeAmount || 0n) / 1e18,
      maxStakeLimit: Number(pool.maxStakeLimit || 0n) / 1e18,
      totalStaked: Number(pool.totalStaked || 0n) / 1e18,
      lockPeriod: Number(pool.lockPeriod || 0n),
      status: pool.isActive ? 'active' as const : 'inactive' as const,
      logo: '/logo/logo.png',
      color: 'from-green-500 to-emerald-600'
    }));
  }, [allPools.data]);

  // Hook to collect real data from individual stakes for summary
  const [realStakesData, setRealStakesData] = useState<ProcessedStake[]>([]);

  // Process and filter stakes data
  const processedStakes = useMemo(() => {
    const filtered = filterStakes(aggregatedStakes.stakes, filters);
    const sorted = sortStakes(filtered, sortConfig.field, sortConfig.order);
    // Filter out stakes with 0 amounts using real data when available
    return sorted.filter(stake => {
      const realStake = realStakesData.find(rs => rs.poolId === stake.poolId);
      return realStake ? realStake.stakedAmount > 0 : true; // Show all initially, filter when real data is available
    });
  }, [aggregatedStakes.stakes, filters, sortConfig, realStakesData]);

  // Update real stakes data when individual data is available
  const updateRealStakeData = useCallback((poolId: number, stakeData: ProcessedStake) => {
    setRealStakesData(prev => {
      const updated = prev.filter(s => s.poolId !== poolId);
      // Only add stakes with actual staked amounts
      if (stakeData.stakedAmount > 0) {
        return [...updated, stakeData];
      }
      return updated;
    });
  }, []);

  // Handle sorting
  const handleSortChange = (field: typeof sortConfig.field) => {
    const newOrder = getNextSortOrder(sortConfig, field);
    const newSortConfig = { field, order: newOrder };
    setSortConfig(newSortConfig);
    stakesPreferences.updateSortConfig(newSortConfig);
  };

  // Handle filtering
  const handleFiltersChange = (newFilters: FilterConfig) => {
    setFilters(newFilters);
    stakesPreferences.updateFilters(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = clearAllFilters();
    setFilters(clearedFilters);
    stakesPreferences.updateFilters(clearedFilters);
  };

  // Handle bulk selection
  const handleStakeSelect = (stake: ProcessedStake, selected: boolean) => {
    if (selected) {
      setSelectedStakes(prev => [...prev, stake]);
    } else {
      setSelectedStakes(prev => prev.filter(s => s.poolId !== stake.poolId));
    }
  };

  const handleSelectAll = () => {
    if (selectedStakes.length === processedStakes.length) {
      setSelectedStakes([]);
    } else {
      setSelectedStakes([...processedStakes]);
    }
  };

  const handleClearSelection = () => {
    setSelectedStakes([]);
  };

  // Handle bulk actions
  const handleBulkClaim = (stakes: ProcessedStake[]) => {
    // TODO: Implement bulk claim functionality
    console.log('Bulk claim for stakes:', stakes.map(s => s.poolId));
    // For now, just clear selection
    setSelectedStakes([]);
  };

  const handleBulkUnstake = (stakes: ProcessedStake[]) => {
    // TODO: Implement bulk unstake functionality
    console.log('Bulk unstake for stakes:', stakes.map(s => s.poolId));
    // For now, just clear selection
    setSelectedStakes([]);
  };

  const handleExportData = (stakes: ProcessedStake[]) => {
    exportStakesData(stakes, { format: 'csv' });
  };

  // Auto-refresh functionality
  useAutoRefresh(
    stakesPreferences.preferences.autoRefresh,
    stakesPreferences.preferences.refreshInterval,
    () => {
      aggregatedStakes.refetch();
    }
  );

  // Process rewards data - use the dedicated rewards hook
  const userRewards = userRewardsData?.rewards || [];

  // Refetch rewards data when switching to rewards tab
  React.useEffect(() => {
    if (tab === 'rewards' && address) {
      console.log('🔍 Switching to rewards tab, refetching data...');
      // Add a small delay to ensure underlying data is ready
      const timer = setTimeout(() => {
        userRewardsData.refetch();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [tab, address]);

  // Memoized sorted and filtered data
  const sortedOfferings = useMemo(() => {
    let filtered = stakingOffers;

    if (offeringStatusFilter !== 'all') {
      filtered = filtered.filter(offer => offer.status === offeringStatusFilter);
    }

    return filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (offeringSortBy) {
        case 'apy':
          aValue = a.apy;
          bValue = b.apy;
          break;
        case 'asset':
          aValue = a.asset;
          bValue = b.asset;
          break;
        case 'min':
          aValue = a.min;
          bValue = b.min;
          break;
        default:
          aValue = a.apy;
          bValue = b.apy;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return offeringSortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return offeringSortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [stakingOffers, offeringSortBy, offeringSortOrder, offeringStatusFilter]);

  // This old sorting logic is now handled by the new components
  // Remove this entire block since we're using the new system

  // Rewards sorting is handled by the rewards table component

  // Handle network switch
  const handleNetworkSwitch = async () => {
    if (switchChain) {
      try {
        await switchChain({ chainId: currentNetwork.chainId });
        console.log('✅ Network switched successfully!');
      } catch (error) {
        console.error('❌ Failed to switch network:', error);
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logo/logo.png"
            alt="W3-Energy Logo"
            width={80}
            height={70}
            className="h-18 w-20"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Staking</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {isConnected && (
            <>
              {/* Token Balance Card */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm min-w-[160px]">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                      W3E Balance
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                      {isCorrectNetwork && tokenData.balance ?
                        contractUtils.formatTokenDisplay(tokenData.balance) :
                        '0.00'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Stake Button */}
              <button
                onClick={() => setShowStakingModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all min-h-[40px]"
              >
                <PlusCircle className="w-4 h-4" /> Add Stake
              </button>
            </>
          )}
        </div>
      </header>

      {/* Wallet Status */}
      <WalletStatus />

      {/* Network Warning */}
      {isConnected && !isCorrectNetwork && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 text-yellow-600 dark:text-yellow-400">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                Wrong Network
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Please switch to {isSupportedChain(currentNetwork.chainId) ? getNetworkConfig(currentNetwork.chainId).chainName : 'the correct network'} to use staking features.
              </p>
            </div>
            <button
              onClick={handleNetworkSwitch}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Switch Network
            </button>
          </div>
        </div>
      )}

      {/* Connection Prompt */}
      {!isConnected && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connect Your Wallet</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connect your wallet to start staking W3E tokens and earning rewards.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
          <button
            onClick={() => setTab('offerings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
              ${tab === 'offerings'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            Staking Pools
          </button>
          <button
            onClick={() => setTab('my-stakes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
              ${tab === 'my-stakes'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            My Stakes
          </button>
          <button
            onClick={() => setTab('rewards')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
              ${tab === 'rewards'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            Rewards
          </button>
          {hasAdminAccess && (
            <button
              onClick={() => setTab('admin')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                ${tab === 'admin'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Admin
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'offerings' && (
        <OfferingGrid
          offerings={sortedOfferings}
          onStakeClick={(poolId) => {
            setSelectedPoolId(poolId);
            setShowStakingModal(true);
          }}
          sortBy={offeringSortBy}
          sortOrder={offeringSortOrder}
          statusFilter={offeringStatusFilter}
          onSortChange={(field) => {
            if (field === offeringSortBy) {
              setOfferingSortOrder(offeringSortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setOfferingSortBy(field);
              setOfferingSortOrder('desc');
            }
          }}
          onStatusFilterChange={setOfferingStatusFilter}
        />
      )}

      {tab === 'my-stakes' && (
        <div className="space-y-6">
          {/* Quick Filters */}
          <QuickFilters
            stakes={aggregatedStakes.stakes}
            onApplyFilter={(partialFilters) => {
              const newFilters = { ...filters, ...partialFilters };
              handleFiltersChange(newFilters);
            }}
            currentFilters={filters}
          />

          {/* Main Filters */}
          <StakesFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            stakesCount={processedStakes.length}
            totalStakes={aggregatedStakes.stakes.length}
          />

          {/* Bulk Selection Toggle */}
          {processedStakes.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={bulkSelectionEnabled}
                    onChange={(e) => {
                      setBulkSelectionEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedStakes([]);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  Enable bulk selection
                </label>

                {stakesPreferences.preferences.autoRefresh && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Auto-refresh enabled ({stakesPreferences.preferences.refreshInterval}s)
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportStakesData(processedStakes, { format: 'csv' })}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => exportStakesData(processedStakes, { format: 'json' })}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Export JSON
                </button>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {bulkSelectionEnabled && (
            <BulkActions
              selectedStakes={selectedStakes}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onBulkClaim={handleBulkClaim}
              onBulkUnstake={handleBulkUnstake}
              onExportData={handleExportData}
              totalStakes={processedStakes.length}
            />
          )}

          {/* Loading/Error States */}
          {aggregatedStakes.isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading your stakes...</p>
            </div>
          ) : aggregatedStakes.error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-red-300 dark:text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Stakes</h3>
              <p className="text-red-500 dark:text-red-400 mb-4">
                {aggregatedStakes.error.message || 'Failed to load your staking positions'}
              </p>
              <button
                onClick={() => aggregatedStakes.refetch()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            /* Stakes Table */
            <StakesTable
              stakes={processedStakes}
              userAddress={address}
              onUnstakeClick={(stake) => {
                setSelectedStake(stake);
                setShowUnstakeModal(true);
              }}
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
              selectedStakes={selectedStakes}
              onStakeSelect={handleStakeSelect}
              onSelectAll={handleSelectAll}
              bulkSelectionEnabled={bulkSelectionEnabled}
              onStakeDataUpdate={updateRealStakeData}
            />
          )}

          {/* Stakes Summary */}
          {processedStakes.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total Stakes:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{processedStakes.length}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total Staked:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {realStakesData.length > 0
                      ? realStakesData.reduce((sum, stake) => sum + stake.stakedAmount, 0).toLocaleString()
                      : '0'} W3E
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total Rewards:</span>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {realStakesData.length > 0
                      ? realStakesData.reduce((sum, stake) => sum + stake.pendingRewards, 0).toLocaleString(undefined, { maximumFractionDigits: 4 })
                      : '0'} W3E
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg APY:</span>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                    {realStakesData.length > 0 ? (realStakesData.reduce((sum, stake) => sum + stake.apy, 0) / realStakesData.length).toFixed(2) : '0'}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'rewards' && (
        <div className="space-y-6">
          {/* Loading/Error States */}
          {userRewardsData.isLoading || userStakesDetails.isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Loading your rewards...
                {userStakesDetails.isLoading && <span className="block text-xs mt-1">Fetching staked pools...</span>}
              </p>
            </div>
          ) : userRewardsData.error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-red-300 dark:text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Rewards</h3>
              <p className="text-red-500 dark:text-red-400 mb-4">
                {userRewardsData.error.message || 'Failed to load your rewards'}
              </p>
              <button
                onClick={() => userRewardsData.refetch()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (Array.isArray(userRewards) && userRewards.length === 0) && !userRewardsData.isLoading && !userStakesDetails.isLoading ? (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Rewards Available</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                You don't have any rewards to claim yet. Start staking to earn rewards!
              </p>
              <button
                onClick={() => setTab('offerings')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Start Staking
              </button>
            </div>
          ) : (
            <RewardsTable
              rewards={userRewards}
              onClaimClick={(poolId) => {
                setClaimingPoolId(poolId);
                setShowClaimModal(true);
              }}
              sortBy={rewardsSortBy}
              sortOrder={rewardsSortOrder}
              statusFilter={rewardsStatusFilter}
              onSortChange={(field) => {
                const newOrder = field === rewardsSortBy
                  ? (rewardsSortOrder === 'asc' ? 'desc' : 'asc')
                  : 'desc';
                setRewardsSortBy(field);
                setRewardsSortOrder(newOrder);
                rewardsPreferences.updatePreferences({ sortBy: field, sortOrder: newOrder });
              }}
              onStatusFilterChange={(status) => {
                setRewardsStatusFilter(status);
                rewardsPreferences.updatePreferences({ statusFilter: status });
              }}
              userAddress={address}
              totalClaimable={0}
              totalEarned={0}
              totalUsdValue={0}
            />
          )}
        </div>
      )}

      {tab === 'admin' && hasAdminAccess && (
        <AdminPanel
          contractPaused={contractPaused.data as boolean}
          emergencyWithdrawFee={emergencyWithdrawFee.data as bigint}
          allPools={allPools.data as any[]}
          isConnected={isConnected}
          isCorrectNetwork={isCorrectNetwork}
          isOwner={isOwner}
        />
      )}

      {/* Modals */}
      <Web3StakingModal
        isOpen={showStakingModal}
        onClose={() => setShowStakingModal(false)}
        selectedPoolId={selectedPoolId}
      />

      <Web3ClaimModal
        isOpen={showClaimModal}
        onClose={() => {
          setShowClaimModal(false);
          setClaimingPoolId(undefined);
        }}
        poolId={claimingPoolId}
      />

      <Web3UnstakeModal
        isOpen={showUnstakeModal}
        onClose={() => {
          setShowUnstakeModal(false);
          setSelectedStake(undefined);
        }}
        selectedStake={selectedStake}
      />
    </div>
  );
};
/* ----
------------------------------ */
interface OfferingGridProps {
  offerings: any[];
  onStakeClick: (poolId: number) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  statusFilter: string;
  onSortChange: (field: string) => void;
  onStatusFilterChange: (status: string) => void;
}

const OfferingGrid = ({
  offerings,
  onStakeClick,
  sortBy,
  sortOrder,
  statusFilter,
  onSortChange,
  onStatusFilterChange
}: OfferingGridProps) => (
  <div className="space-y-6">
    {/* Sorting and Filtering Controls */}
    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center">Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center">Sort by:</span>
        {[
          { key: 'apy', label: 'APY' },
          { key: 'asset', label: 'Asset' },
          { key: 'min', label: 'Min Stake' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onSortChange(key)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            {label}
            {sortBy === key && (
              sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Results Count */}
    <div className="text-sm text-gray-600 dark:text-gray-400">
      Showing {offerings.length} staking pools
    </div>

    {/* Offerings Grid */}
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {offerings.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No staking pools available.</p>
        </div>
      ) : (
        offerings.map(pool => (
          <div key={pool.poolId} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 sm:p-6 space-y-4 relative border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600">
            {/* Status Indicator */}
            <div className="absolute top-3 right-3 flex flex-col gap-1">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${pool.status === 'active'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                }`}>
                {pool.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
              </div>
              <div className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white text-center">
                POOL #{pool.poolId}
              </div>
            </div>

            {/* Header with Asset Info */}
            <div className="flex items-center gap-3 pt-2">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r ${pool.color} flex items-center justify-center text-white font-bold text-sm sm:text-base ring-2 ring-blue-100 dark:ring-blue-800`}>
                {pool.asset}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white">{pool.asset} Token</p>
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">🔒 Locked Staking</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Lock Period: {Math.floor(pool.lockPeriod / 86400)} days
                </p>
              </div>
            </div>

            {/* APY Highlight */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium">Annual Percentage Yield</span>
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {pool.apy.toFixed(2)}%
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Min. Stake</span>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  {contractUtils.formatTokenDisplay(pool.min.toString())}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Staked</span>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  {contractUtils.formatLargeNumber(pool.totalStaked)} W3E
                </p>
              </div>
            </div>

            {/* Pool Utilization */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 border border-green-100 dark:border-gray-600 rounded-lg p-4 space-y-3">
              <div className="text-green-900 dark:text-white">
                <div className="text-lg font-bold mb-1">
                  {pool.totalStaked >= 1000000
                    ? `${(pool.totalStaked / 1000000).toFixed(1)}M`
                    : pool.totalStaked >= 1000
                      ? `${(pool.totalStaked / 1000).toFixed(1)}K`
                      : pool.totalStaked.toFixed(0)
                  } / {pool.maxStakeLimit >= 1000000
                    ? `${(pool.maxStakeLimit / 1000000).toFixed(1)}M`
                    : pool.maxStakeLimit >= 1000
                      ? `${(pool.maxStakeLimit / 1000).toFixed(1)}K`
                      : pool.maxStakeLimit.toFixed(0)
                  } W3E
                </div>
                <div className="w-full bg-green-100 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-green-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(((pool.totalStaked / pool.maxStakeLimit) * 100), 100)}%` }}
                  ></div>
                </div>
                <div className="text-sm font-medium text-green-700 dark:text-gray-300">
                  {((pool.totalStaked / pool.maxStakeLimit) * 100).toFixed(2)}% / 100%
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => onStakeClick(pool.poolId)}
              className={`w-full py-3 rounded-lg font-semibold transition-all text-sm sm:text-base shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${pool.status === 'active'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02]'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              disabled={pool.status !== 'active'}
            >
              {pool.status === 'active' ? (
                <>
                  <Lock className="w-4 h-4" />
                  Stake Now
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Unavailable
                </>
              )}
            </button>
          </div>
        ))
      )}
    </section>
  </div>
);



/* ---------------------------------- */
interface RewardsTableProps {
  rewards: any[];
  onClaimClick: (poolId: number) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  statusFilter: string;
  onSortChange: (field: string) => void;
  onStatusFilterChange: (status: string) => void;
  userAddress?: string;
  totalClaimable: number;
  totalEarned: number;
  totalUsdValue: number;
}

const RewardsTableInner = ({
  rewards,
  onClaimClick,
  sortBy,
  sortOrder,
  statusFilter,
  onSortChange,
  onStatusFilterChange,
  userAddress
}: Omit<RewardsTableProps, 'totalClaimable' | 'totalEarned' | 'totalUsdValue'>) => {
  const { getTotals } = useRewardsContext();
  const { totalClaimable, totalEarned, totalUsdValue } = getTotals();

  // Get real rewards data from context
  const { rewardsData } = useRewardsContext();
  const realRewards = Array.from(rewardsData.values());

  // Use real rewards data if available, otherwise fall back to placeholder data
  const activeRewards = realRewards.length > 0 ? realRewards : rewards;

  // Apply filtering
  const filteredRewards = React.useMemo(() => {
    if (statusFilter === 'all') {
      return activeRewards;
    }
    return activeRewards.filter(reward => reward.status === statusFilter);
  }, [activeRewards, statusFilter]);

  // Apply sorting
  const sortedAndFilteredRewards = React.useMemo(() => {
    const sorted = [...filteredRewards].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case 'availableRewards':
          aValue = a.availableRewards;
          bValue = b.availableRewards;
          break;
        case 'totalEarned':
          aValue = a.totalEarned;
          bValue = b.totalEarned;
          break;
        case 'apy':
          aValue = a.apy;
          bValue = b.apy;
          break;
        case 'usdValue':
          aValue = a.usdValue;
          bValue = b.usdValue;
          break;
        default:
          aValue = a.availableRewards;
          bValue = b.availableRewards;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [filteredRewards, sortBy, sortOrder]);

  // Use the rewards data from the hook for summary calculations
  const claimableRewards = activeRewards.filter(r => r.status === 'claimable');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Claimable</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalClaimable.toFixed(4)} W3E
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {claimableRewards.length} pools available
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Earned</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalEarned.toFixed(4)} W3E
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            All time rewards
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">USD Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${totalUsdValue.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Claimable value
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filter rewards by status"
          >
            <option value="all">All Status ({activeRewards.length})</option>
            <option value="claimable">Claimable ({claimableRewards.length})</option>
            <option value="pending">Pending ({activeRewards.length - claimableRewards.length})</option>
          </select>
          {statusFilter !== 'all' && (
            <button
              onClick={() => onStatusFilterChange('all')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
          {[
            { key: 'availableRewards', label: 'Available' },
            { key: 'totalEarned', label: 'Total Earned' },
            { key: 'apy', label: 'APY' },
            { key: 'usdValue', label: 'USD Value' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSortChange(key)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              title={sortBy === key ? `Sorted by ${label} (${sortOrder === 'asc' ? 'ascending' : 'descending'})` : `Sort by ${label}`}
            >
              {label}
              {sortBy === key && (
                sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
              )}
            </button>
          ))}
          {sortBy !== 'availableRewards' && (
            <button
              onClick={() => onSortChange('availableRewards')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-2"
              title="Reset to default sort"
            >
              Reset sort
            </button>
          )}
        </div>
      </div>



      {/* Results Count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {sortedAndFilteredRewards.length} of {activeRewards.length} rewards
          {statusFilter !== 'all' && (
            <span className="ml-2 text-blue-600 dark:text-blue-400">
              (filtered by {statusFilter})
            </span>
          )}
          {sortBy !== 'availableRewards' && (
            <span className="ml-2 text-purple-600 dark:text-purple-400">
              (sorted by {sortBy === 'availableRewards' ? 'available rewards' :
                sortBy === 'totalEarned' ? 'total earned' :
                  sortBy === 'apy' ? 'APY' : 'USD value'} {sortOrder === 'asc' ? '↑' : '↓'})
            </span>
          )}
        </div>
        {sortedAndFilteredRewards.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total claimable: {claimableRewards.reduce((sum, r) => sum + r.availableRewards, 0).toFixed(4)} W3E
          </div>
        )}
      </div>

      {/* Rewards Table */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        {sortedAndFilteredRewards.length === 0 ? (
          <div className="text-center py-12">
            {activeRewards.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No rewards available. Start staking to earn rewards.</p>
            ) : (
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">No rewards match the current filter.</p>
                <button
                  onClick={() => onStatusFilterChange('all')}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Clear filters to see all rewards
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile view */}
            <div className="block lg:hidden">
              {sortedAndFilteredRewards.map((reward) => (
                <RewardsMobileCard
                  key={reward.poolId}
                  poolId={reward.poolId}
                  userAddress={userAddress}
                  onClaim={(poolId) => onClaimClick(poolId)}
                />
              ))}
            </div>

            {/* Desktop view */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {/* No bulk selection */}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pool</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Rewards</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Earned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APY</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedAndFilteredRewards.map((reward) => (
                    <RewardsRow
                      key={reward.poolId}
                      poolId={reward.poolId}
                      userAddress={userAddress}
                      onClaim={(poolId) => onClaimClick(poolId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

const RewardsTable = (props: RewardsTableProps) => {
  return (
    <RewardsProvider>
      <RewardsTableInner {...props} />
    </RewardsProvider>
  );
};

/* ---------------------------------- */
interface AdminPanelProps {
  contractPaused: boolean;
  emergencyWithdrawFee: bigint;
  allPools: any[];
  isConnected: boolean;
  isCorrectNetwork: boolean;
  isOwner: boolean;
}

const AdminPanel = ({ contractPaused, emergencyWithdrawFee, allPools, isConnected, isCorrectNetwork, isOwner }: AdminPanelProps) => {
  const { address } = useAccount();
  const [activeSection, setActiveSection] = useState('overview');

  // Helper function to calculate APY from reward rate string input
  const calculateAPYFromInput = (rewardRateStr: string): string => {
    try {
      const rewardRate = parseFloat(rewardRateStr);
      if (isNaN(rewardRate) || rewardRate <= 0) return '';

      // Convert reward rate per second to APY percentage
      // APY = (rewardRate * seconds_per_year) * 100
      const secondsPerYear = 365.25 * 24 * 60 * 60; // 31,557,600
      const apy = rewardRate * secondsPerYear * 100;

      return apy.toFixed(2);
    } catch {
      return '';
    }
  };

  // Import admin hooks
  const {
    useAddPool,
    useUpdatePool,
    useSetEmergencyWithdrawFee,
    useCollectFees,
    usePauseContract,
    useUnpauseContract,
    useEmergencyTokenRecovery,
    useTokenApprove,
    useTokenTransfer,
    useTokenBalance
  } = require('@/hooks/useContracts');

  const addPool = useAddPool();
  const updatePool = useUpdatePool();
  const setEmergencyFee = useSetEmergencyWithdrawFee();
  const collectFees = useCollectFees();
  const pauseContract = usePauseContract();
  const unpauseContract = useUnpauseContract();
  const emergencyRecovery = useEmergencyTokenRecovery();
  const tokenApprove = useTokenApprove();
  const tokenTransfer = useTokenTransfer();

  // Watch for transaction hashes from the hooks
  React.useEffect(() => {
    console.log('🔍 Add pool hook state:', {
      data: addPool.data,
      error: addPool.error,
      isPending: addPool.isPending,
      status: addPool.status
    });

    if (addPool.data && !pendingTx) {
      console.log('📝 Add pool transaction hash received:', addPool.data);
      setPendingTx({
        hash: addPool.data,
        type: 'addPool',
        message: 'Pool added successfully!'
      });
      setLoading('addPool', false); // Reset loading state when transaction is submitted
    }
    if (addPool.error) {
      console.error('❌ Add pool error:', addPool.error);
      setError(addPool.error.message || 'Failed to add pool');
      setLoading('addPool', false);
    }
  }, [addPool.data, addPool.error, addPool.isPending, addPool.status]);

  React.useEffect(() => {
    if (updatePool.data && !pendingTx) {
      setPendingTx({
        hash: updatePool.data,
        type: 'updatePool',
        message: 'Pool updated successfully!'
      });
      setLoading('updatePool', false);
    }
    if (updatePool.error) {
      setError(updatePool.error.message || 'Failed to update pool');
      setLoading('updatePool', false);
    }
  }, [updatePool.data, updatePool.error]);

  React.useEffect(() => {
    if (setEmergencyFee.data && !pendingTx) {
      setPendingTx({
        hash: setEmergencyFee.data,
        type: 'setEmergencyFee',
        message: 'Emergency withdraw fee updated successfully!'
      });
      setLoading('setEmergencyFee', false);
    }
  }, [setEmergencyFee.data]);

  React.useEffect(() => {
    if (collectFees.data && !pendingTx) {
      setPendingTx({
        hash: collectFees.data,
        type: 'collectFees',
        message: 'Fees collected successfully!'
      });
      setLoading('collectFees', false);
    }
  }, [collectFees.data]);

  React.useEffect(() => {
    if (pauseContract.data && !pendingTx) {
      setPendingTx({
        hash: pauseContract.data,
        type: 'pause',
        message: 'Contract paused successfully!'
      });
      setLoading('pauseToggle', false);
    }
  }, [pauseContract.data]);

  React.useEffect(() => {
    if (unpauseContract.data && !pendingTx) {
      setPendingTx({
        hash: unpauseContract.data,
        type: 'unpause',
        message: 'Contract unpaused successfully!'
      });
      setLoading('pauseToggle', false);
    }
  }, [unpauseContract.data]);

  React.useEffect(() => {
    if (emergencyRecovery.data && !pendingTx) {
      setPendingTx({
        hash: emergencyRecovery.data,
        type: 'emergencyRecovery',
        message: 'Emergency token recovery completed successfully!'
      });
      setLoading('emergencyRecovery', false);
    }
  }, [emergencyRecovery.data]);

  React.useEffect(() => {
    if (tokenApprove.data && !pendingTx) {
      setPendingTx({
        hash: tokenApprove.data,
        type: 'approve',
        message: 'Token approval successful! Now you can transfer the tokens.'
      });
      setLoading('rewardApprove', false);
    }
  }, [tokenApprove.data]);

  React.useEffect(() => {
    if (tokenTransfer.data && !pendingTx) {
      setPendingTx({
        hash: tokenTransfer.data,
        type: 'transfer',
        message: 'Reward tokens deposited successfully to the staking contract!'
      });
      setLoading('rewardTransfer', false);
    }
  }, [tokenTransfer.data]);

  // Form states
  const [newPoolForm, setNewPoolForm] = useState({
    stakingToken: '',
    maxStakeLimit: '',
    minStakeAmount: '',
    rewardRate: '',
    lockPeriod: ''
  });

  const [updatePoolForm, setUpdatePoolForm] = useState({
    poolId: '',
    maxStakeLimit: '',
    minStakeAmount: '',
    rewardRate: '',
    lockPeriod: '',
    isActive: true
  });

  const [feeForm, setFeeForm] = useState({
    newFee: ''
  });

  const [collectFeesForm, setCollectFeesForm] = useState({
    poolId: '',
    amount: ''
  });

  const [recoveryForm, setRecoveryForm] = useState({
    tokenAddress: '',
    amount: ''
  });

  const [rewardDepositForm, setRewardDepositForm] = useState({
    tokenAddress: '',
    amount: '',
    step: 'input' // 'input' | 'approve' | 'transfer' | 'success'
  });

  // Separate loading states for each action
  const [loadingStates, setLoadingStates] = useState({
    addPool: false,
    updatePool: false,
    setEmergencyFee: false,
    collectFees: false,
    pauseToggle: false,
    emergencyRecovery: false,
    rewardApprove: false,
    rewardTransfer: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingTx, setPendingTx] = useState<{
    hash: string;
    type: string;
    message: string;
  } | null>(null);

  // Helper functions to manage loading states
  const setLoading = (action: keyof typeof loadingStates, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [action]: loading }));
  };

  const isLoading = (action: keyof typeof loadingStates) => {
    return loadingStates[action];
  };

  // Transaction confirmation tracking
  const { data: txReceipt, isLoading: txLoading, isSuccess: txSuccess, isError: txError } = useWaitForTransactionReceipt({
    hash: pendingTx?.hash as `0x${string}`,
    query: {
      enabled: !!pendingTx?.hash,
    },
  });

  // Handle transaction confirmation
  React.useEffect(() => {
    if (pendingTx && txSuccess && txReceipt) {
      setSuccess(`${pendingTx.message} (Confirmed on blockchain)`);
      setPendingTx(null);
      // Reset all loading states since transaction is confirmed
      setLoadingStates({
        addPool: false,
        updatePool: false,
        setEmergencyFee: false,
        collectFees: false,
        pauseToggle: false,
        emergencyRecovery: false,
        rewardApprove: false,
        rewardTransfer: false,
      });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    }

    if (pendingTx && txError) {
      setError(`Transaction failed: ${pendingTx.message}`);
      setPendingTx(null);
      // Reset all loading states since transaction failed
      setLoadingStates({
        addPool: false,
        updatePool: false,
        setEmergencyFee: false,
        collectFees: false,
        pauseToggle: false,
        emergencyRecovery: false,
        rewardApprove: false,
        rewardTransfer: false,
      });
    }
  }, [pendingTx, txSuccess, txError, txReceipt]);

  // Auto-populate update pool form when pool ID is selected
  React.useEffect(() => {
    if (updatePoolForm.poolId && allPools && allPools.length > 0) {
      const poolIndex = parseInt(updatePoolForm.poolId);
      const selectedPool = allPools[poolIndex];

      if (selectedPool) {
        // Convert values from wei to readable format
        const maxStakeLimit = (Number(selectedPool.maxStakeLimit || 0) / 1e18).toString();
        const minStakeAmount = (Number(selectedPool.minStakeAmount || 0) / 1e18).toString();
        const rewardRate = (Number(selectedPool.rewardRate || 0) / 1e18).toString();
        const lockPeriod = Math.floor(Number(selectedPool.lockPeriod || 0) / (24 * 60 * 60)).toString(); // Convert seconds to days

        setUpdatePoolForm(prev => ({
          ...prev,
          maxStakeLimit,
          minStakeAmount,
          rewardRate,
          lockPeriod,
          isActive: Boolean(selectedPool.isActive)
        }));
      }
    } else if (!updatePoolForm.poolId) {
      // Clear form when no pool is selected
      setUpdatePoolForm(prev => ({
        ...prev,
        maxStakeLimit: '',
        minStakeAmount: '',
        rewardRate: '',
        lockPeriod: '',
        isActive: true
      }));
    }
  }, [updatePoolForm.poolId, allPools]);

  const handleAddPool = async () => {
    if (!newPoolForm.stakingToken || !newPoolForm.maxStakeLimit || !newPoolForm.minStakeAmount ||
      !newPoolForm.rewardRate || !newPoolForm.lockPeriod) {
      setError('Please fill in all fields');
      return;
    }

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Please switch to the correct network');
      return;
    }

    if (!isOwner) {
      setError('Only the contract owner can add pools');
      return;
    }

    setLoading('addPool', true);
    setError(null);
    setSuccess(null);

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading('addPool')) {
        setError('Transaction timeout - please try again');
        setLoading('addPool', false);
      }
    }, 30000); // 30 second timeout

    try {
      console.log('🚀 Submitting add pool transaction...');
      console.log('Form data:', newPoolForm);
      console.log('Contract address:', contractAddresses.stakingContract);

      const args = [
        newPoolForm.stakingToken as `0x${string}`,
        contractUtils.parseAmount(newPoolForm.maxStakeLimit),
        contractUtils.parseAmount(newPoolForm.minStakeAmount),
        contractUtils.parseAmount(newPoolForm.rewardRate),
        BigInt(parseInt(newPoolForm.lockPeriod) * 24 * 60 * 60) // Convert days to seconds
      ];

      console.log('Transaction args:', args);

      await addPool.writeContract({
        address: contractAddresses.stakingContract as `0x${string}`,
        abi: require('@/abi/staking/Staking.json'),
        functionName: 'addPool',
        args
      });

      console.log('✅ Transaction submitted successfully');

      // Clear form immediately after successful submission
      setNewPoolForm({
        stakingToken: '',
        maxStakeLimit: '',
        minStakeAmount: '',
        rewardRate: '',
        lockPeriod: ''
      });

      // Clear timeout since transaction was submitted successfully
      clearTimeout(timeoutId);

      // Transaction hash will be set by useEffect watching addPool.data

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('❌ Transaction failed:', err);
      setError(err.message || 'Failed to add pool');
      setLoading('addPool', false);
    }
  };

  const handleUpdatePool = async () => {
    if (!updatePoolForm.poolId || !updatePoolForm.maxStakeLimit || !updatePoolForm.minStakeAmount ||
      !updatePoolForm.rewardRate || !updatePoolForm.lockPeriod) {
      setError('Please fill in all fields');
      return;
    }

    setLoading('updatePool', true);
    setError(null);
    setSuccess(null);

    try {
      await updatePool.writeContract({
        address: contractAddresses.stakingContract as `0x${string}`,
        abi: require('@/abi/staking/Staking.json'),
        functionName: 'updatePool',
        args: [
          parseInt(updatePoolForm.poolId),
          contractUtils.parseAmount(updatePoolForm.maxStakeLimit),
          contractUtils.parseAmount(updatePoolForm.minStakeAmount),
          contractUtils.parseAmount(updatePoolForm.rewardRate),
          BigInt(parseInt(updatePoolForm.lockPeriod) * 24 * 60 * 60), // Convert days to seconds
          updatePoolForm.isActive
        ]
      });

      // Transaction hash will be set by useEffect watching updatePool.data

    } catch (err: any) {
      setError(err.message || 'Failed to update pool');
      setLoading('updatePool', false);
    }
  };

  const handleSetEmergencyFee = async () => {
    if (!feeForm.newFee) {
      setError('Please enter a fee percentage');
      return;
    }

    setLoading('setEmergencyFee', true);
    setError(null);
    setSuccess(null);

    try {
      const feeInBasisPoints = parseInt(feeForm.newFee) * 100; // Convert percentage to basis points
      await setEmergencyFee.writeContract({
        address: contractAddresses.stakingContract as `0x${string}`,
        abi: require('@/abi/staking/Staking.json'),
        functionName: 'setEmergencyWithdrawFee',
        args: [feeInBasisPoints]
      });

      setFeeForm({ newFee: '' });

      // Transaction hash will be set by useEffect watching setEmergencyFee.data
    } catch (err: any) {
      setError(err.message || 'Failed to update fee');
      setLoading('setEmergencyFee', false);
    }
  };

  const handleCollectFees = async () => {
    if (!collectFeesForm.poolId || !collectFeesForm.amount) {
      setError('Please fill in all fields');
      return;
    }

    setLoading('collectFees', true);
    setError(null);
    setSuccess(null);

    try {
      await collectFees.writeContract({
        address: contractAddresses.stakingContract as `0x${string}`,
        abi: require('@/abi/staking/Staking.json'),
        functionName: 'collectFees',
        args: [
          parseInt(collectFeesForm.poolId),
          contractUtils.parseAmount(collectFeesForm.amount)
        ]
      });

      setCollectFeesForm({ poolId: '', amount: '' });

      // Transaction hash will be set by useEffect watching collectFees.data
    } catch (err: any) {
      setError(err.message || 'Failed to collect fees');
      setLoading('collectFees', false);
    }
  };

  const handlePauseToggle = async () => {
    setLoading('pauseToggle', true);
    setError(null);
    setSuccess(null);

    try {
      if (contractPaused) {
        await unpauseContract.writeContract({
          address: contractAddresses.stakingContract as `0x${string}`,
          abi: require('@/abi/staking/Staking.json'),
          functionName: 'unpause',
          args: []
        });
      } else {
        await pauseContract.writeContract({
          address: contractAddresses.stakingContract as `0x${string}`,
          abi: require('@/abi/staking/Staking.json'),
          functionName: 'pause',
          args: []
        });
      }

      // Transaction hash will be set by useEffect watching pause/unpause contract data
    } catch (err: any) {
      setError(err.message || 'Failed to toggle pause state');
      setLoading('pauseToggle', false);
    }
  };

  const handleEmergencyRecovery = async () => {
    if (!recoveryForm.tokenAddress || !recoveryForm.amount) {
      setError('Please fill in all fields');
      return;
    }

    setLoading('emergencyRecovery', true);
    setError(null);
    setSuccess(null);

    try {
      await emergencyRecovery.writeContract({
        address: contractAddresses.stakingContract as `0x${string}`,
        abi: require('@/abi/staking/Staking.json'),
        functionName: 'emergencyTokenRecovery',
        args: [
          recoveryForm.tokenAddress as `0x${string}`,
          contractUtils.parseAmount(recoveryForm.amount)
        ]
      });

      setRecoveryForm({ tokenAddress: '', amount: '' });

      // Transaction hash will be set by useEffect watching emergencyRecovery.data
    } catch (err: any) {
      setError(err.message || 'Failed to recover tokens');
      setLoading('emergencyRecovery', false);
    }
  };

  const handleRewardDepositApprove = async () => {
    if (!rewardDepositForm.tokenAddress || !rewardDepositForm.amount) {
      setError('Please fill in all fields');
      return;
    }

    setLoading('rewardApprove', true);
    setError(null);
    setSuccess(null);

    try {
      await tokenApprove.writeContract({
        address: rewardDepositForm.tokenAddress as `0x${string}`,
        abi: require('@/abi/tokens/W3eToken.json'),
        functionName: 'approve',
        args: [
          contractAddresses.stakingContract as `0x${string}`,
          contractUtils.parseAmount(rewardDepositForm.amount)
        ]
      });

      // Move to transfer step after approval is confirmed
      setRewardDepositForm({ ...rewardDepositForm, step: 'transfer' });

      // Transaction hash will be set by useEffect watching tokenApprove.data
    } catch (err: any) {
      setError(err.message || 'Failed to approve tokens');
      setLoading('rewardApprove', false);
    }
  };

  const handleRewardDepositTransfer = async () => {
    if (!rewardDepositForm.tokenAddress || !rewardDepositForm.amount) {
      setError('Please fill in all fields');
      return;
    }

    setLoading('rewardTransfer', true);
    setError(null);
    setSuccess(null);

    try {
      await tokenTransfer.writeContract({
        address: rewardDepositForm.tokenAddress as `0x${string}`,
        abi: require('@/abi/tokens/W3eToken.json'),
        functionName: 'transfer',
        args: [
          contractAddresses.stakingContract as `0x${string}`,
          contractUtils.parseAmount(rewardDepositForm.amount)
        ]
      });

      setRewardDepositForm({ tokenAddress: '', amount: '', step: 'success' });

      // Transaction hash will be set by useEffect watching tokenTransfer.data
    } catch (err: any) {
      setError(err.message || 'Failed to transfer tokens');
      setLoading('rewardTransfer', false);
    }
  };

  const resetRewardDepositForm = () => {
    setRewardDepositForm({ tokenAddress: '', amount: '', step: 'input' });
    setError(null);
    setSuccess(null);
    setPendingTx(null);
  };

  const clearAllMessages = () => {
    setError(null);
    setSuccess(null);
    setPendingTx(null);
  };

  // Calculate required reward tokens for a pool
  const calculateRequiredRewards = (pool: any, durationDays: number = 30) => {
    if (!pool) return 0;

    const rewardRateWei = Number(pool.rewardRate || 0);
    const rewardRate = rewardRateWei / 1e18; // Convert from wei
    const maxStakeLimit = Number(pool.maxStakeLimit || 0) / 1e18;
    const durationSeconds = durationDays * 24 * 60 * 60;

    // Manual verification with example:
    // If rewardRate = 0.001 tokens/sec/token and maxStakeLimit = 1000 tokens
    // For 1 day (86400 seconds): 0.001 × 1000 × 86400 = 86,400 tokens
    // For 30 days: 0.001 × 1000 × 2,592,000 = 2,592,000 tokens

    const totalRewardsNeeded = rewardRate * maxStakeLimit * durationSeconds;

    return totalRewardsNeeded;
  };

  // Calculate APY from reward rate for better understanding
  const calculateAPY = (pool: any): number => {
    if (!pool) return 0;

    const rewardRate = Number(pool.rewardRate || 0) / 1e18;
    const secondsPerYear = 365 * 24 * 60 * 60;

    // APY = (rewardRate × secondsPerYear) × 100
    const apy = rewardRate * secondsPerYear * 100;

    return apy;
  };

  // Format reward rate for display (convert from wei and format as decimal)
  const formatRewardRate = (pool: any) => {
    if (!pool || !pool.rewardRate) return '0';

    const rewardRateWei = Number(pool.rewardRate);
    const rewardRate = rewardRateWei / 1e18;

    // Debug: Log the actual values
    console.log('Reward rate debug:', {
      rewardRateWei,
      rewardRate,
      poolRewardRate: pool.rewardRate
    });

    // Format based on the size of the number
    if (rewardRate >= 0.001) {
      return rewardRate.toFixed(6); // Show 6 decimal places for larger numbers
    } else if (rewardRate >= 0.000001) {
      return rewardRate.toFixed(9); // Show 9 decimal places for smaller numbers
    } else {
      return rewardRate.toFixed(12); // Show 12 decimal places for very small numbers
    }
  };

  // Create token balance hooks for each pool
  const poolTokenBalances = useMemo(() => {
    if (!allPools || !Array.isArray(allPools)) return {};

    const balances: { [key: string]: number } = {};
    // For now, we'll return 0 for all balances since we can't use hooks conditionally
    // In a real implementation, you'd need to create separate components or use a different approach
    allPools.forEach((pool: any, index: number) => {
      balances[pool.stakingToken] = 0; // Placeholder - would need separate hook calls
    });

    return balances;
  }, [allPools]);

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isOwner ? 'Contract Owner Access - Manage staking pools and contract settings' : 'Admin View - Monitor staking pools and contract status'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {!isOwner && (
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                👁️ View Only
              </div>
            )}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${contractPaused
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              }`}>
              {contractPaused ? '⏸️ Paused' : '▶️ Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Non-Owner Warning */}
      {!isOwner && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 text-blue-600 dark:text-blue-400">ℹ️</div>
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">Admin View Mode</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You have admin access to view contract information, but only the contract owner can execute management functions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {(error || success || pendingTx) && (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-800 dark:text-red-200">{error}</span>
                </div>
                <button
                  onClick={clearAllMessages}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-200">{success}</span>
                </div>
                <button
                  onClick={clearAllMessages}
                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {pendingTx && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <div className="flex-1">
                  <span className="text-blue-800 dark:text-blue-200">
                    Transaction submitted - waiting for blockchain confirmation...
                  </span>
                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    <span className="font-mono">
                      Tx Hash: {pendingTx.hash ? `${pendingTx.hash.slice(0, 10)}...${pendingTx.hash.slice(-8)}` : 'Pending...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'pools', label: 'Pool Management' },
            { id: 'rewards', label: 'Reward Deposits' },
            { id: 'fees', label: 'Fee Management' },
            { id: 'emergency', label: 'Emergency Controls' },
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                ${activeSection === section.id
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Admin Content */}
      {activeSection === 'overview' && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Contract Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${contractPaused ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                  {contractPaused ? '⏸️' : '▶️'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Contract Status</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {contractPaused ? 'Paused' : 'Active'}
                  </p>
                </div>
              </div>
              <button
                onClick={handlePauseToggle}
                disabled={isLoading('pauseToggle') || !!pendingTx}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${contractPaused
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
              >
                {isLoading('pauseToggle') || (pendingTx?.type === 'pause' || pendingTx?.type === 'unpause') ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {pendingTx ? 'Confirming...' : 'Submitting...'}
                  </div>
                ) : (
                  contractPaused ? 'Unpause Contract' : 'Pause Contract'
                )}
              </button>
            </div>

            {/* Total Pools */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Total Pools</h3>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {allPools?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency Fee */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Emergency Fee</h3>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {emergencyWithdrawFee ? Number(emergencyWithdrawFee) / 100 : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pool Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pool Analysis & Token Balances</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor contract token balances and calculate required reward deposits for each pool
              </p>
            </div>

            {allPools && Array.isArray(allPools) && allPools.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {allPools.map((pool: any, index: number) => {
                  // Debug: Log the actual pool data
                  console.log(`Pool ${index} data:`, pool);
                  const tokenAddress = pool.stakingToken;
                  const contractBalance = poolTokenBalances[tokenAddress] || 0;
                  const required30Days = calculateRequiredRewards(pool, 30);
                  const required90Days = calculateRequiredRewards(pool, 90);
                  const maxStakeLimit = Number(pool.maxStakeLimit || 0) / 1e18;
                  const totalStaked = Number(pool.totalStaked || 0) / 1e18;
                  const utilization = maxStakeLimit > 0 ? (totalStaked / maxStakeLimit) * 100 : 0;
                  const apy = calculateAPY(pool);

                  // Check for unrealistic APY values
                  const isUnrealisticAPY = apy > 1000; // More than 1000% APY is likely an error
                  const isVeryHighAPY = apy > 100; // More than 100% APY is suspicious

                  return (
                    <div key={index} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                            #{index}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">Pool {index}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {pool.isActive ? '🟢 Active' : '🔴 Inactive'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Utilization</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {utilization.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* APY Warning */}
                      {isUnrealisticAPY && (
                        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <div>
                              <h5 className="font-semibold text-red-800 dark:text-red-200">
                                ⚠️ Unrealistic Reward Rate Detected
                              </h5>
                              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                This pool has an APY of {apy.toFixed(0)}%, which is extremely high and likely incorrect.
                                Typical staking APYs range from 5-50%. Please verify the reward rate configuration.
                              </p>
                              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                                <p>• Current rate: {formatRewardRate(pool)} tokens/sec/token</p>
                                <p>• For 20% APY, rate should be: ~6.340e-9 tokens/sec/token</p>
                                <p>• Consider updating this pool with a more realistic reward rate</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isVeryHighAPY && !isUnrealisticAPY && (
                        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            <div>
                              <h5 className="font-semibold text-yellow-800 dark:text-yellow-200">
                                High APY Warning
                              </h5>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                This pool offers {apy.toFixed(1)}% APY, which is quite high.
                                Please ensure you have sufficient reward tokens to sustain this rate.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {/* Contract Token Balance */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Contract Balance
                            </span>
                          </div>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                            Check balance manually:
                          </p>
                          <div className="bg-white dark:bg-gray-800 rounded p-2">
                            <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                              Token: {tokenAddress}
                            </p>
                            <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                              Contract: {contractAddresses.stakingContract}
                            </p>
                          </div>
                        </div>

                        {/* Pool Capacity */}
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                              Pool Capacity
                            </span>
                          </div>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {maxStakeLimit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-purple-600 dark:text-purple-400">
                            Max stake limit
                          </p>
                        </div>

                        {/* 30-Day Requirement */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              30-Day Rewards
                            </span>
                          </div>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {required30Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Tokens needed
                          </p>
                        </div>

                        {/* 90-Day Requirement */}
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                              90-Day Rewards
                            </span>
                          </div>
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {required90Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Tokens needed
                          </p>
                        </div>
                      </div>

                      {/* Pool Details */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Token Address:</span>
                            <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                              {tokenAddress}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Reward Rate:</span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {formatRewardRate(pool)}/sec
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ≈ {calculateAPY(pool).toFixed(2)}% APY
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Lock Period:</span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {Math.floor(Number(pool.lockPeriod || 0) / 86400)} days
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Total Staked:</span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {totalStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reward Calculation Info */}
                      <div className="mt-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Gift className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Reward Calculation
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                            Calculations assume full pool utilization. Actual requirements may be lower based on staking activity.
                          </p>
                          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                            <p>• Formula: Reward Rate × Max Stake Limit × Duration (seconds)</p>
                            <p>• Current Rate: {formatRewardRate(pool)} tokens/sec/token (≈ {apy.toFixed(1)}% APY)</p>
                            <p>• Max Stake: {maxStakeLimit.toLocaleString()} tokens</p>
                            <p>• 30 days = 2,592,000 seconds</p>
                            <p>• Result: {required30Days.toLocaleString()} tokens needed</p>
                            <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                              <p className="font-medium">Realistic Rate Examples:</p>
                              <p>• 10% APY: 3.170e-9 tokens/sec/token</p>
                              <p>• 20% APY: 6.340e-9 tokens/sec/token</p>
                              <p>• 50% APY: 1.585e-8 tokens/sec/token</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">No pools created yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'pools' && (
        <div className="space-y-8">
          {/* Add New Pool */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 ${!isOwner ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Pool</h3>
              {!isOwner && (
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  Owner Only
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Staking Token Address
                </label>
                <input
                  type="text"
                  value={newPoolForm.stakingToken}
                  onChange={(e) => setNewPoolForm({ ...newPoolForm, stakingToken: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0x..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Stake Limit
                </label>
                <input
                  type="text"
                  value={newPoolForm.maxStakeLimit}
                  onChange={(e) => setNewPoolForm({ ...newPoolForm, maxStakeLimit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Stake Amount
                </label>
                <input
                  type="text"
                  value={newPoolForm.minStakeAmount}
                  onChange={(e) => setNewPoolForm({ ...newPoolForm, minStakeAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reward Rate (per second per token staked)
                </label>
                <input
                  type="text"
                  value={newPoolForm.rewardRate}
                  onChange={(e) => setNewPoolForm({ ...newPoolForm, rewardRate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.000000634"
                />
                {newPoolForm.rewardRate && calculateAPYFromInput(newPoolForm.rewardRate) && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Equivalent APY: {calculateAPYFromInput(newPoolForm.rewardRate)}%
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Examples: 10% APY = 3.170e-9, 20% APY = 6.340e-9, 50% APY = 1.585e-8
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lock Period (days)
                </label>
                <input
                  type="text"
                  value={newPoolForm.lockPeriod}
                  onChange={(e) => setNewPoolForm({ ...newPoolForm, lockPeriod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="30"
                />
              </div>
            </div>
            <button
              onClick={handleAddPool}
              disabled={!isOwner || isLoading('addPool') || !!pendingTx}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading('addPool') || pendingTx?.type === 'addPool' ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {pendingTx ? 'Confirming...' : 'Submitting...'}
                </div>
              ) : (
                'Add Pool'
              )}
            </button>
          </div>

          {/* Update Pool */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 ${!isOwner ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Update Pool</h3>
              {!isOwner && (
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  Owner Only
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pool ID
                </label>
                <select
                  value={updatePoolForm.poolId}
                  onChange={(e) => setUpdatePoolForm({ ...updatePoolForm, poolId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select Pool</option>
                  {allPools?.map((pool, index) => {
                    const apy = calculateAPY(pool);
                    const status = pool.isActive ? 'Active' : 'Inactive';
                    return (
                      <option key={index} value={index}>
                        Pool {index} - {apy.toFixed(1)}% APY ({status})
                      </option>
                    );
                  })}
                </select>
                {updatePoolForm.poolId && allPools && allPools[parseInt(updatePoolForm.poolId)] && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Pool {updatePoolForm.poolId} Information:
                    </p>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p>• APY: {calculateAPY(allPools[parseInt(updatePoolForm.poolId)]).toFixed(2)}%</p>
                      <p>• Status: {allPools[parseInt(updatePoolForm.poolId)].isActive ? 'Active' : 'Inactive'}</p>
                      <p>• Total Staked: {((Number(allPools[parseInt(updatePoolForm.poolId)].totalStaked || 0) / 1e18).toLocaleString())} tokens</p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Stake Limit
                </label>
                <input
                  type="text"
                  value={updatePoolForm.maxStakeLimit}
                  onChange={(e) => setUpdatePoolForm({ ...updatePoolForm, maxStakeLimit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Stake Amount
                </label>
                <input
                  type="text"
                  value={updatePoolForm.minStakeAmount}
                  onChange={(e) => setUpdatePoolForm({ ...updatePoolForm, minStakeAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reward Rate (per second per token staked)
                </label>
                <input
                  type="text"
                  value={updatePoolForm.rewardRate}
                  onChange={(e) => setUpdatePoolForm({ ...updatePoolForm, rewardRate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.000000634"
                />
                {updatePoolForm.rewardRate && calculateAPYFromInput(updatePoolForm.rewardRate) && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Equivalent APY: {calculateAPYFromInput(updatePoolForm.rewardRate)}%
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Examples: 10% APY = 3.170e-9, 20% APY = 6.340e-9, 50% APY = 1.585e-8
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lock Period (days)
                </label>
                <input
                  type="text"
                  value={updatePoolForm.lockPeriod}
                  onChange={(e) => setUpdatePoolForm({ ...updatePoolForm, lockPeriod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pool Status
                </label>
                <select
                  value={updatePoolForm.isActive.toString()}
                  onChange={(e) => setUpdatePoolForm({ ...updatePoolForm, isActive: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleUpdatePool}
              disabled={!isOwner || isLoading('updatePool') || !!pendingTx}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading('updatePool') || pendingTx?.type === 'updatePool' ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {pendingTx ? 'Confirming...' : 'Submitting...'}
                </div>
              ) : (
                'Update Pool'
              )}
            </button>
          </div>
        </div>
      )}

      {activeSection === 'rewards' && (
        <div className="space-y-8">
          {/* Reward Token Deposit */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deposit Reward Tokens</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Deposit reward tokens to the staking contract. This is a two-step process: first approve the contract to spend your tokens, then transfer them.
            </p>

            {rewardDepositForm.step === 'input' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reward Token Address
                    </label>
                    <input
                      type="text"
                      value={rewardDepositForm.tokenAddress}
                      onChange={(e) => setRewardDepositForm({ ...rewardDepositForm, tokenAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="0x... (Token contract address)"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter the contract address of the reward token (e.g., W3E token address)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount to Deposit
                    </label>
                    <input
                      type="text"
                      value={rewardDepositForm.amount}
                      onChange={(e) => setRewardDepositForm({ ...rewardDepositForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="1000"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Amount of tokens to deposit as rewards
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-1">Two-Step Process:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>First, approve the staking contract to spend your tokens</li>
                        <li>Then, transfer the tokens to the staking contract</li>
                      </ol>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleRewardDepositApprove}
                  disabled={isLoading('rewardApprove') || !!pendingTx || !rewardDepositForm.tokenAddress || !rewardDepositForm.amount}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading('rewardApprove') || pendingTx?.type === 'approve' ? (
                    <div className="flex items-center gap-2 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {pendingTx ? 'Confirming...' : 'Submitting...'}
                    </div>
                  ) : (
                    'Step 1: Approve Tokens'
                  )}
                </button>
              </div>
            )}

            {rewardDepositForm.step === 'transfer' && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-800 dark:text-green-200 font-medium">
                      Tokens approved successfully! Now proceed with the transfer.
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Token Address
                    </label>
                    <input
                      type="text"
                      value={rewardDepositForm.tokenAddress}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount
                    </label>
                    <input
                      type="text"
                      value={rewardDepositForm.amount}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRewardDepositTransfer}
                    disabled={isLoading('rewardTransfer') || !!pendingTx}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading('rewardTransfer') || pendingTx?.type === 'transfer' ? (
                      <div className="flex items-center gap-2 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {pendingTx ? 'Confirming...' : 'Submitting...'}
                      </div>
                    ) : (
                      'Step 2: Transfer Tokens'
                    )}
                  </button>
                  <button
                    onClick={resetRewardDepositForm}
                    disabled={Object.values(loadingStates).some(loading => loading) || !!pendingTx}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {rewardDepositForm.step === 'success' && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                    Reward Tokens Deposited Successfully!
                  </h4>
                  <p className="text-green-700 dark:text-green-300 mb-4">
                    {rewardDepositForm.amount} tokens have been transferred to the staking contract and are now available as rewards.
                  </p>
                  <button
                    onClick={resetRewardDepositForm}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Deposit More Tokens
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reward Token Balance Check */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Token Balance</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Check the token balance of the staking contract to monitor available reward tokens.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To check the contract's token balance, you can:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>Use a blockchain explorer (Etherscan, etc.) to view the contract's token holdings</li>
                <li>Call the token contract's <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">balanceOf</code> function with the staking contract address</li>
                <li>Monitor the contract's reward distribution through the pool statistics</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'fees' && (
        <div className="space-y-8">
          {/* Set Emergency Withdraw Fee */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Set Emergency Withdraw Fee</h3>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fee Percentage (0-10%)
              </label>
              <input
                type="text"
                value={feeForm.newFee}
                onChange={(e) => setFeeForm({ newFee: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="5"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Current fee: {emergencyWithdrawFee ? Number(emergencyWithdrawFee) / 100 : 0}%
              </p>
            </div>
            <button
              onClick={handleSetEmergencyFee}
              disabled={isLoading('setEmergencyFee') || !!pendingTx}
              className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading('setEmergencyFee') || pendingTx?.type === 'setEmergencyFee' ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {pendingTx ? 'Confirming...' : 'Submitting...'}
                </div>
              ) : (
                'Update Fee'
              )}
            </button>
          </div>

          {/* Collect Fees */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Collect Fees</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pool ID
                </label>
                <select
                  value={collectFeesForm.poolId}
                  onChange={(e) => setCollectFeesForm({ ...collectFeesForm, poolId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select Pool</option>
                  {allPools?.map((_, index) => (
                    <option key={index} value={index}>Pool {index}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="text"
                  value={collectFeesForm.amount}
                  onChange={(e) => setCollectFeesForm({ ...collectFeesForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="100"
                />
              </div>
            </div>
            <button
              onClick={handleCollectFees}
              disabled={isLoading('collectFees') || !!pendingTx}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading('collectFees') || pendingTx?.type === 'collectFees' ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {pendingTx ? 'Confirming...' : 'Submitting...'}
                </div>
              ) : (
                'Collect Fees'
              )}
            </button>
          </div>
        </div>
      )}

      {activeSection === 'emergency' && (
        <div className="space-y-8">
          {/* Emergency Token Recovery */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Emergency Token Recovery</h3>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              ⚠️ This function should only be used in critical situations. It allows recovery of tokens that are not part of active staking pools.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                  Token Address
                </label>
                <input
                  type="text"
                  value={recoveryForm.tokenAddress}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, tokenAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0x..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                  Amount
                </label>
                <input
                  type="text"
                  value={recoveryForm.amount}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="100"
                />
              </div>
            </div>
            <button
              onClick={handleEmergencyRecovery}
              disabled={isLoading('emergencyRecovery') || !!pendingTx}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading('emergencyRecovery') || pendingTx?.type === 'emergencyRecovery' ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {pendingTx ? 'Confirming...' : 'Submitting...'}
                </div>
              ) : (
                'Emergency Recovery'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};



export default StakingPage;