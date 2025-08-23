'use client';

import React, { useState, useEffect } from 'react';
import { X, Gift, AlertCircle, CheckCircle, Loader2, ExternalLink, Clock, Coins } from 'lucide-react';
import { useAccount, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { useUserStakedPools, useClaimRewards, usePendingRewards } from '@/hooks/useContracts';
import { getCurrentNetworkConfig } from '@/config/contracts';

interface Web3ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId?: number; // Single pool ID to claim from
}

export function Web3ClaimModal({ isOpen, onClose, poolId }: Web3ClaimModalProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  // Contract hooks
  const userStakedPools = useUserStakedPools(address);
  const claimRewards = useClaimRewards();
  
  // Get current network config
  const currentNetwork = getCurrentNetworkConfig();
  const isCorrectNetwork = chainId === currentNetwork.chainId;

  const [step, setStep] = useState<'confirm' | 'claiming' | 'success'>('confirm');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Track claiming transaction confirmation
  const { 
    data: claimReceipt, 
    isLoading: isClaimPending, 
    isSuccess: isClaimConfirmed,
    isError: isClaimError 
  } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    query: {
      enabled: !!txHash && step === 'claiming',
    },
  });

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setTxHash('');
      setError('');
    }
  }, [isOpen]);

  // Handle claiming transaction confirmation
  useEffect(() => {
    if (isClaimConfirmed && claimReceipt) {
      setStep('success');
      setError('');
    } else if (isClaimError) {
      setError('Claiming transaction failed');
      setStep('confirm');
      setTxHash('');
    }
  }, [isClaimConfirmed, isClaimError, claimReceipt]);

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

  // Get pending rewards for the specific pool
  const pendingRewards = usePendingRewards(poolId ?? 0, address);
  
  // Calculate claimable rewards for this pool
  const totalClaimableRewards = React.useMemo(() => {
    if (!pendingRewards.data || poolId === undefined || poolId === null) return 0;
    return Number(formatEther(pendingRewards.data as bigint));
  }, [pendingRewards.data, poolId]);

  // Calculate total USD value (mock calculation)
  const totalUsdValue = React.useMemo(() => {
    return totalClaimableRewards * 2.5; // Mock USD conversion rate
  }, [totalClaimableRewards]);

  const handleClaim = async () => {
    if (poolId === undefined || poolId === null || totalClaimableRewards <= 0) return;
    
    try {
      setError('');
      setStep('claiming');
      
      const txHash = await claimRewards.writeContractAsync({
        address: currentNetwork.contracts.stakingContract as `0x${string}`,
        abi: [
          {
            inputs: [{ name: '_poolId', type: 'uint256' }],
            name: 'claimRewards',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          }
        ],
        functionName: 'claimRewards',
        args: [BigInt(poolId)]
      });
      
      setTxHash(txHash);
      // Step will be updated to 'success' by useEffect when transaction is confirmed
    } catch (err: any) {
      console.error('Claiming failed:', err);
      setError(err.message || 'Claiming failed');
      setStep('confirm');
    }
  };

  if (!isOpen) return null;

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

        {/* Content */}
        {!isConnected ? (
          <div className="text-center py-6">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Wallet Not Connected
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please connect your wallet to claim rewards.
            </p>
          </div>
        ) : !isCorrectNetwork ? (
          <div className="text-center py-6">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Wrong Network
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please switch to {currentNetwork.name} to claim rewards.
            </p>
          </div>
        ) : step === 'success' ? (
          <div className="text-center py-6">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Rewards Claimed!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Successfully claimed {totalClaimableRewards.toFixed(4)} tokens.
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
        ) : poolId === undefined || poolId === null || totalClaimableRewards <= 0 ? (
          <div className="text-center py-6">
            <Gift className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              No Rewards Selected
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please select rewards to claim from the rewards table.
            </p>
          </div>
        ) : (
          <>
            {/* Reward Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-center space-y-1">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Pool #{poolId} Selected
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300">
                  {totalClaimableRewards.toFixed(4)} tokens
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  ≈ ${totalUsdValue.toLocaleString()} USD
                </p>
              </div>
            </div>

            {/* Reward Details */}
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">#{poolId}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Pool #{poolId}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {totalClaimableRewards.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>W3E Token Rewards</span>
                  <span>≈ ${totalUsdValue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Claiming rewards will transfer them to your wallet. Gas fees apply.
                </p>
              </div>
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
                disabled={step === 'claiming'}
              >
                Cancel
              </button>
              <button 
                onClick={handleClaim}
                disabled={poolId === undefined || poolId === null || totalClaimableRewards <= 0 || step === 'claiming'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                  poolId !== undefined && poolId !== null && totalClaimableRewards > 0 && step === 'confirm'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {step === 'claiming' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" /> 
                    Claim {totalClaimableRewards.toFixed(4)} tokens
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}