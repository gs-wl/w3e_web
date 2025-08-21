import React, { useState, useEffect } from 'react';
import { X, Unlock, AlertTriangle, Calendar, Clock, TrendingDown, Coins } from 'lucide-react';

interface UnstakeModalProps {
  onClose?: () => void;
  stakeData?: {
    asset: string;
    amount: number;
    period: string;
    endDate: string;
    reward: number;
  };
}

const UnstakeModal = ({ 
  onClose = () => {}, 
  stakeData = {
    asset: 'ONT',
    amount: 300025.45,
    period: '6 Month',
    endDate: '2024-08-15',
    reward: 400025.015
  }
}: UnstakeModalProps) => {
  const [unstakeAmount, setUnstakeAmount] = useState(stakeData.amount.toString());
  const [confirmUnstake, setConfirmUnstake] = useState(false);
  
  const isEarlyUnstake = new Date(stakeData.endDate) > new Date();
  const penaltyRate = 5; // 5% penalty for early unstaking
  const penalty = isEarlyUnstake ? (parseFloat(unstakeAmount) * penaltyRate / 100) : 0;
  const finalAmount = parseFloat(unstakeAmount) - penalty;
  const estimatedGas = '0.0034';

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
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isEarlyUnstake 
                ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
                : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}>
              <Unlock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {isEarlyUnstake ? 'Early Unstake' : 'Unstake'}
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

        {/* Early Unstake Warning */}
        {isEarlyUnstake && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Early Unstaking Penalty</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Unstaking before {stakeData.endDate} will incur a {penaltyRate}% penalty fee. Consider waiting for maturity to avoid fees.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Unstake Amount */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Amount to Unstake ({stakeData.asset})
            </label>
            <input
              type="number"
              step="0.01"
              value={unstakeAmount}
              onChange={e => setUnstakeAmount(e.target.value)}
              max={stakeData.amount}
              className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter amount"
            />
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>Available: {stakeData.amount.toLocaleString()} {stakeData.asset}</span>
              <button 
                onClick={() => setUnstakeAmount(stakeData.amount.toString())}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
              >
                Max
              </button>
            </div>
          </div>
        </div>

        {/* Unstake Summary */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Unstake Summary</h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Staked Amount</span>
              <span className="font-medium text-gray-900 dark:text-white">{parseFloat(unstakeAmount).toLocaleString()} {stakeData.asset}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Staking Period</span>
              <span className="font-medium text-gray-900 dark:text-white">{stakeData.period}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Maturity Date</span>
              <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {stakeData.endDate}
              </span>
            </div>
            {isEarlyUnstake && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Early Penalty ({penaltyRate}%)</span>
                <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> -{penalty.toFixed(3)} {stakeData.asset}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Network Fee</span>
              <span className="font-medium text-gray-900 dark:text-white">{estimatedGas} ETH</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900 dark:text-white">You'll Receive</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">
                  {finalAmount.toFixed(3)} {stakeData.asset}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="confirm-unstake"
            checked={confirmUnstake}
            onChange={e => setConfirmUnstake(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="confirm-unstake" className="text-sm text-gray-700 dark:text-gray-300">
            I understand that {isEarlyUnstake ? `unstaking early will incur a ${penaltyRate}% penalty and ` : ''}
            this action cannot be undone. I want to proceed with unstaking.
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
          >
            Cancel
          </button>
          <button 
            disabled={!confirmUnstake}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              confirmUnstake
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            <Unlock className="w-5 h-5" /> Confirm Unstake
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnstakeModal;