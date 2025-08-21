'use client';

import React, { useState, useEffect } from 'react';
import { X, Unlock, AlertCircle, CheckCircle, Loader2, ExternalLink, Clock, AlertTriangle, Calendar, TrendingDown } from 'lucide-react';
import { useAccount, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { useUserStakedPools, useUnstake, useEmergencyUnstake, useEmergencyWithdrawFee } from '@/hooks/useContracts';
import { getCurrentNetworkConfig } from '@/config/contracts';
import { contractUtils } from '@/utils/contracts';

interface Web3UnstakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStake?: any; // The selected stake object
}

export function Web3UnstakeModal({ isOpen, onClose, selectedStake }: Web3UnstakeModalProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  // Contract hooks
  const unstakeTokens = useUnstake();
  const emergencyUnstake = useEmergencyUnstake();
  const emergencyWithdrawFee = useEmergencyWithdrawFee();
  
  // Get current network config
  const currentNetwork = getCurrentNetworkConfig();
  const isCorrectNetwork = chainId === currentNetwork.chainId;

  const [step, setStep] = useState<'confirm' | 'unstaking' | 'success'>('confirm');
  const [txHash, setTxHash] = useState<string>('');
  const [confirmUnstake, setConfirmUnstake] = useState(false);
  const [error, setError] = useState<string>('');

  // Track unstaking transaction confirmation
  const { 
    data: unstakeReceipt, 
    isLoading: isUnstakePending, 
    isSuccess: isUnstakeConfirmed,
    isError: isUnstakeError 
  } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    query: {
      enabled: !!txHash && step === 'unstaking',
    },
  });

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setTxHash('');
      setConfirmUnstake(false);
      setError('');
    }
  }, [isOpen]);

  // Handle unstaking transaction confirmation
  useEffect(() => {
    if (isUnstakeConfirmed && unstakeReceipt) {
      setStep('success');
      setError('');
    } else if (isUnstakeError) {
      setError('Unstaking transaction failed');
      setStep('confirm');
      setTxHash('');
    }
  }, [isUnstakeConfirmed, isUnstakeError, unstakeReceipt]);

  // Handle backdrop click
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

  // Check if stake is matured (lock period has passed)
  const isMatured = React.useMemo(() => {
    if (!selectedStake) return false;
    const now = Math.floor(Date.now() / 1000);
    const stakeTime = selectedStake.rawLastStakeTime 
      ? Number(selectedStake.rawLastStakeTime)
      : Math.floor(selectedStake.startDate.getTime() / 1000);
    const lockPeriod = selectedStake.rawLockPeriod 
      ? Number(selectedStake.rawLockPeriod)
      : selectedStake.lockPeriod;
    return now >= (stakeTime + lockPeriod);
  }, [selectedStake]);

  // Calculate time remaining
  const timeRemaining = React.useMemo(() => {
    if (!selectedStake || isMatured) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const stakeTime = selectedStake.rawLastStakeTime 
      ? Number(selectedStake.rawLastStakeTime)
      : Math.floor(selectedStake.startDate.getTime() / 1000);
    const lockPeriod = selectedStake.rawLockPeriod 
      ? Number(selectedStake.rawLockPeriod)
      : selectedStake.lockPeriod;
    const unlockTime = stakeTime + lockPeriod;
    const remaining = unlockTime - now;
    
    if (remaining <= 0) return null;
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [selectedStake, isMatured]);

  // Calculate emergency fee percentage
  const emergencyFeePercentage = React.useMemo(() => {
    if (!emergencyWithdrawFee.data) return 5; // fallback to 5% if not loaded
    const feeInBasisPoints = Number(emergencyWithdrawFee.data);
    return feeInBasisPoints / 100; // Convert basis points to percentage (1000 = 10%)
  }, [emergencyWithdrawFee.data]);

  const handleUnstake = async () => {
    if (!selectedStake) return;
    
    try {
      setError('');
      setStep('unstaking');
      
      let txHash: string;
      
      if (isMatured) {
        // Normal unstake
        txHash = await unstakeTokens.writeContractAsync({
          address: currentNetwork.contracts.stakingContract as `0x${string}`,
          abi: [
            {
              inputs: [
                { name: '_poolId', type: 'uint256' },
                { name: '_amount', type: 'uint256' }
              ],
              name: 'unstake',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            }
          ],
          functionName: 'unstake',
          args: [BigInt(selectedStake.poolId), selectedStake.rawStakedAmount || BigInt(Math.floor(selectedStake.stakedAmount * 1e18))]
        });
      } else {
        // Emergency unstake (with fee) - only takes poolId parameter
        txHash = await emergencyUnstake.writeContractAsync({
          address: currentNetwork.contracts.stakingContract as `0x${string}`,
          abi: [
            {
              inputs: [
                { name: '_poolId', type: 'uint256' }
              ],
              name: 'emergencyUnstake',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            }
          ],
          functionName: 'emergencyUnstake',
          args: [BigInt(selectedStake.poolId)]
        });
      }
      
      setTxHash(txHash);
      // Step will be updated to 'success' by useEffect when transaction is confirmed
    } catch (err: any) {
      console.error('Unstaking failed:', err);
      setError(err.message || 'Unstaking failed');
      setStep('confirm');
    }
  };

  if (!isOpen || !selectedStake) return null;

  // Debug log to see what data we're receiving
  console.log('🔍 Debug UnstakeModal - selectedStake data:', {
    poolId: selectedStake.poolId,
    stakedAmount: selectedStake.stakedAmount,
    rawStakedAmount: selectedStake.rawStakedAmount?.toString(),
    pendingRewards: selectedStake.pendingRewards,
    rawPendingRewards: selectedStake.rawPendingRewards?.toString(),
    lockPeriod: selectedStake.lockPeriod,
    rawLockPeriod: selectedStake.rawLockPeriod?.toString(),
    emergencyFeeData: emergencyWithdrawFee.data?.toString(),
    emergencyFeePercentage,
  });

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 animate-fade-in"
           onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              !isMatured 
                ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
                : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}>
              <Unlock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {!isMatured ? 'Early Unstake' : 'Unstake'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isConnected ? (
          <div className="text-center py-6">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Wallet Not Connected
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please connect your wallet to unstake tokens.
            </p>
          </div>
        ) : !isCorrectNetwork ? (
          <div className="text-center py-6">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Wrong Network
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please switch to {currentNetwork.name} to unstake.
            </p>
          </div>
        ) : step === 'success' ? (
          <div className="text-center py-6">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Unstaking Successful!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {selectedStake.rawStakedAmount 
                ? (Number(selectedStake.rawStakedAmount) / 1e18).toLocaleString()
                : selectedStake.stakedAmount.toLocaleString()
              } tokens unstaked from Pool #{selectedStake.poolId !== undefined ? Number(selectedStake.poolId) : 'N/A'}.
            </p>
            {txHash && (
              <a
                href={`${currentNetwork.blockExplorer}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs mb-4"
              >
                View Transaction <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Early Unstake Warning */}
            {!isMatured && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Early unstaking incurs {emergencyFeePercentage}% fee. Wait {timeRemaining} to avoid fees.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Unstake Summary */}
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Pool</span>
                    <span className="font-medium text-gray-900 dark:text-white">#{selectedStake.poolId !== undefined ? Number(selectedStake.poolId) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <span className={`font-medium text-xs ${
                      isMatured 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {isMatured ? 'Unlocked' : `${timeRemaining} left`}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">Staked Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedStake.rawStakedAmount 
                      ? (Number(selectedStake.rawStakedAmount) / 1e18).toLocaleString()
                      : selectedStake.stakedAmount.toLocaleString()
                    } tokens
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Pending Rewards</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +{selectedStake.rawPendingRewards 
                      ? contractUtils.formatRewardDisplay((Number(selectedStake.rawPendingRewards) / 1e18).toString(), '')
                      : contractUtils.formatRewardDisplay(selectedStake.pendingRewards.toString(), '')
                    } tokens
                  </span>
                </div>
                {!isMatured && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Emergency Fee ({emergencyFeePercentage}%)</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -{(() => {
                        const stakedAmount = selectedStake.rawStakedAmount 
                          ? Number(selectedStake.rawStakedAmount) / 1e18
                          : selectedStake.stakedAmount;
                        const feeAmount = (stakedAmount * emergencyFeePercentage) / 100;
                        return feeAmount.toLocaleString(undefined, { maximumFractionDigits: 4 });
                      })()} tokens
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-white">You'll Receive</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      {(() => {
                        const stakedAmount = selectedStake.rawStakedAmount 
                          ? Number(selectedStake.rawStakedAmount) / 1e18
                          : selectedStake.stakedAmount;
                        const pendingRewards = selectedStake.rawPendingRewards 
                          ? Number(selectedStake.rawPendingRewards) / 1e18
                          : selectedStake.pendingRewards;
                        
                        let totalReceived = stakedAmount + pendingRewards;
                        
                        // Subtract emergency fee if unstaking early
                        if (!isMatured) {
                          const emergencyFee = (stakedAmount * emergencyFeePercentage) / 100;
                          totalReceived = totalReceived - emergencyFee;
                        }
                        
                        return totalReceived.toLocaleString(undefined, { maximumFractionDigits: 4 });
                      })()} tokens
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="confirm-unstake"
                checked={confirmUnstake}
                onChange={e => setConfirmUnstake(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="confirm-unstake" className="text-xs text-gray-700 dark:text-gray-300">
                I understand this action cannot be undone{!isMatured ? ' and will incur fees' : ''}.
              </label>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs text-red-800 dark:text-red-300">{error}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium text-sm"
                disabled={step === 'unstaking'}
              >
                Cancel
              </button>
              
              {step === 'confirm' ? (
                <button 
                  onClick={handleUnstake}
                  disabled={!confirmUnstake}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                    confirmUnstake
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Unlock className="w-4 h-4" />
                  {isMatured ? 'Unstake' : 'Emergency Unstake'}
                </button>
              ) : step === 'unstaking' ? (
                <div className="flex-1 flex flex-col gap-1">
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-lg font-semibold opacity-50 text-sm"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming...
                  </button>
                  {txHash && (
                    <a
                      href={`${currentNetwork.blockExplorer}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 text-center flex items-center justify-center gap-1"
                    >
                      View Transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}