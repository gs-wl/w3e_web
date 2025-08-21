'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, AlertCircle, CheckCircle, Loader2, ExternalLink, Calendar, Clock, ChevronDown } from 'lucide-react';
import { useAccount, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useAllPools, useStake, useTokenApprove, useTokenBalance } from '@/hooks/useContracts';
import { getCurrentNetworkConfig } from '@/config/contracts';

interface Web3StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPoolId?: number;
}

export function Web3StakingModal({ isOpen, onClose, selectedPoolId = 0 }: Web3StakingModalProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  // Get pool data
  const allPools = useAllPools();
  const selectedPool = allPools.data && Array.isArray(allPools.data) ? allPools.data[selectedPoolId] : null;
  
  // Contract hooks
  const stakeTokens = useStake();
  const tokenApprove = useTokenApprove();
  const tokenBalance = useTokenBalance(address);

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approve' | 'approving' | 'stake' | 'staking' | 'success'>('input');
  const [approvalTxHash, setApprovalTxHash] = useState<string>('');
  const [stakeTxHash, setStakeTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Track approval transaction confirmation
  const { 
    data: approvalReceipt, 
    isLoading: isApprovalPending, 
    isSuccess: isApprovalConfirmed,
    isError: isApprovalError 
  } = useWaitForTransactionReceipt({
    hash: approvalTxHash as `0x${string}`,
    query: {
      enabled: !!approvalTxHash && step === 'approving',
    },
  });

  // Track staking transaction confirmation
  const { 
    data: stakeReceipt, 
    isLoading: isStakePending, 
    isSuccess: isStakeConfirmed,
    isError: isStakeError 
  } = useWaitForTransactionReceipt({
    hash: stakeTxHash as `0x${string}`,
    query: {
      enabled: !!stakeTxHash && step === 'staking',
    },
  });

  // Get current network config
  const currentNetwork = getCurrentNetworkConfig();
  const isCorrectNetwork = chainId === currentNetwork.chainId;

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setStep('input');
      setApprovalTxHash('');
      setStakeTxHash('');
      setError('');
    }
  }, [isOpen]);

  // Handle approval transaction confirmation
  useEffect(() => {
    if (isApprovalConfirmed && approvalReceipt) {
      setStep('stake');
      setError('');
    } else if (isApprovalError) {
      setError('Approval transaction failed');
      setStep('input');
      setApprovalTxHash('');
    }
  }, [isApprovalConfirmed, isApprovalError, approvalReceipt]);

  // Handle staking transaction confirmation
  useEffect(() => {
    if (isStakeConfirmed && stakeReceipt) {
      setStep('success');
      setError('');
    } else if (isStakeError) {
      setError('Staking transaction failed');
      setStep('stake');
      setStakeTxHash('');
    }
  }, [isStakeConfirmed, isStakeError, stakeReceipt]);

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

  // Calculate estimated rewards based on pool data
  const estimatedRewards = React.useMemo(() => {
    if (!amount || !selectedPool) return 0;
    const rewardRate = Number(selectedPool.rewardRate || 0) / 1e18;
    const lockPeriod = Number(selectedPool.lockPeriod || 0);
    const stakeAmount = parseFloat(amount);
    
    // Calculate total rewards over lock period
    return (rewardRate * stakeAmount * lockPeriod);
  }, [amount, selectedPool]);

  // Calculate APY from pool data
  const poolAPY = React.useMemo(() => {
    if (!selectedPool) return 0;
    const rewardRate = Number(selectedPool.rewardRate || 0) / 1e18;
    const secondsPerYear = 365.25 * 24 * 60 * 60;
    return (rewardRate * secondsPerYear * 100);
  }, [selectedPool]);

  const handleApprove = async () => {
    if (!amount || !selectedPool) return;
    
    try {
      setError('');
      setStep('approving');
      
      const amountWei = parseEther(amount);
      const txHash = await tokenApprove.writeContractAsync({
        address: selectedPool.stakingToken as `0x${string}`,
        abi: [
          {
            inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
            name: 'approve',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function',
          }
        ],
        functionName: 'approve',
        args: [currentNetwork.contracts.stakingContract as `0x${string}`, amountWei]
      });
      
      setApprovalTxHash(txHash);
      // Step will be updated to 'stake' by useEffect when transaction is confirmed
    } catch (err: any) {
      console.error('Approval failed:', err);
      setError(err.message || 'Approval failed');
      setStep('input');
    }
  };

  const handleStake = async () => {
    if (!amount || !selectedPool) return;
    
    try {
      setError('');
      setStep('staking');
      
      const amountWei = parseEther(amount);
      const txHash = await stakeTokens.writeContractAsync({
        address: currentNetwork.contracts.stakingContract as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: '_poolId', type: 'uint256' },
              { name: '_amount', type: 'uint256' }
            ],
            name: 'stake',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          }
        ],
        functionName: 'stake',
        args: [BigInt(selectedPoolId), amountWei]
      });
      
      setStakeTxHash(txHash);
      // Step will be updated to 'success' by useEffect when transaction is confirmed
    } catch (err: any) {
      console.error('Staking failed:', err);
      setError(err.message || 'Staking failed');
      setStep('stake');
    }
  };

  const handleMaxClick = () => {
    if (tokenBalance.data && selectedPool) {
      // Leave a small amount for gas fees
      const maxAmount = Math.max(0, Number(formatEther(tokenBalance.data as bigint)) - 0.01);
      setAmount(maxAmount.toString());
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[90vh] animate-fade-in"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Stake in Pool #{selectedPoolId}
            </h2>
            {selectedPool && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                APY: {poolAPY.toFixed(2)}% • Lock Period: {Math.floor(Number(selectedPool.lockPeriod || 0) / 86400)} days
              </p>
            )}
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
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Wallet Not Connected
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to stake tokens.
            </p>
          </div>
        ) : step === 'success' ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Staking Successful!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your {amount} tokens have been staked in Pool #{selectedPoolId}.
            </p>
            {stakeTxHash && (
              <a
                href={`${currentNetwork.blockExplorer}/tx/${stakeTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                View Staking Transaction <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              Close
            </button>
          </div>
        ) : !selectedPool ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Pool Not Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              The selected pool could not be loaded.
            </p>
          </div>
        ) : !isCorrectNetwork ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Wrong Network
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please switch to {currentNetwork.name} to stake.
            </p>
          </div>
        ) : (
          <>
            {/* Pool Information */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Min Stake:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {(Number(selectedPool.minStakeAmount || 0) / 1e18).toLocaleString()} tokens
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Max Pool Limit:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {(Number(selectedPool.maxStakeLimit || 0) / 1e18).toLocaleString()} tokens
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Staked:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {(Number(selectedPool.totalStaked || 0) / 1e18).toLocaleString()} tokens
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Available Space:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {((Number(selectedPool.maxStakeLimit || 0) - Number(selectedPool.totalStaked || 0)) / 1e18).toLocaleString()} tokens
                  </p>
                </div>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Left side - inputs */}
              <div className="space-y-6">
                {/* Balance Display */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Available Balance</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {tokenBalance.data ? Number(formatEther(tokenBalance.data as bigint)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0'} tokens
                    </span>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Amount to Stake
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Min: ${(Number(selectedPool.minStakeAmount || 0) / 1e18).toLocaleString()}`}
                      className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      disabled={step !== 'input'}
                    />
                    <button
                      onClick={handleMaxClick}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 hover:text-green-700 text-sm font-medium"
                      disabled={step !== 'input'}
                    >
                      MAX
                    </button>
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm mt-2">{error}</p>
                  )}
                </div>

              </div>

              {/* Right side - summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Staking Summary</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Pool ID</span>
                    <span className="font-medium text-gray-900 dark:text-white">#{selectedPoolId}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Lock Period</span>
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {Math.floor(Number(selectedPool.lockPeriod || 0) / 86400)} days
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Unlock Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(Date.now() + Number(selectedPool.lockPeriod || 0) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Network</span>
                    <span className="font-medium text-gray-900 dark:text-white">{currentNetwork.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">APY</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{poolAPY.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Est. Rewards</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {estimatedRewards.toFixed(4)} tokens
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
                disabled={step === 'approving' || step === 'staking'}
              >
                Cancel
              </button>
              
              {step === 'input' ? (
                <button
                  onClick={handleApprove}
                  disabled={!amount || !tokenBalance.data || parseFloat(amount) < (Number(selectedPool.minStakeAmount || 0) / 1e18)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  Approve Tokens
                </button>
              ) : step === 'approving' ? (
                <div className="flex flex-col gap-2">
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold opacity-50"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming Approval...
                  </button>
                  {approvalTxHash && (
                    <a
                      href={`${currentNetwork.blockExplorer}/tx/${approvalTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 text-center flex items-center justify-center gap-1"
                    >
                      View Transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : step === 'stake' ? (
                <button
                  onClick={handleStake}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirm Stake
                </button>
              ) : step === 'staking' ? (
                <div className="flex flex-col gap-2">
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold opacity-50"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming Stake...
                  </button>
                  {stakeTxHash && (
                    <a
                      href={`${currentNetwork.blockExplorer}/tx/${stakeTxHash}`}
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