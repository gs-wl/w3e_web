import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle, ArrowRight, ChevronDown } from 'lucide-react';

const assets = ['Ontology', 'Cardano', 'Solana', 'Polkadot', 'XRP'];
const periods = ['1 Month', '3 Months', '6 Months', '12 Months'];

interface StakingActivationModalProps {
  onClose?: () => void;
}

const StakingActivationModal = ({ onClose = () => {} }: StakingActivationModalProps) => {
  const [asset, setAsset] = useState('Ontology');
  const [period, setPeriod] = useState('6 Months');
  const [amount, setAmount] = useState('30035.64');
  
  const estAPY = 25.12;      // mocked
  const estInterest = (parseFloat(amount) * estAPY / 100).toFixed(3);

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
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[90vh] animate-fade-in"
           onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Staking Activation</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* left side – inputs */}
          <div className="space-y-6">
            {/* select asset */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Select Asset
              </label>
              <div className="relative">
                <select
                  value={asset}
                  onChange={e => setAsset(e.target.value)}
                  className="w-full appearance-none bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  {assets.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
              </div>
            </div>

            {/* lock-up period */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Lock-Up Period
              </label>
              <div className="relative">
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full appearance-none bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  {periods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
              </div>
            </div>

            {/* amount to stake */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Amount to Stake (ONT)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="Enter amount"
              />
            </div>
          </div>

          {/* right side – summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Summary</h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Stake Date</span>
                <span className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> 2024-02-15 05:32
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Stake End Date</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4" /> 2024-08-15 05:32
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Redemption Date</span>
                <span className="font-medium">2024-08-20</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Chain</span>
                <span className="font-medium">ETH</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Est. APY</span>
                <span className="font-medium text-green-600 dark:text-green-400">{estAPY}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Est. Interest</span>
                <span className="font-medium text-green-600 dark:text-green-400">{estInterest} ONT</span>
              </div>
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
          >
            Cancel Staking
          </button>
          <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all">
            <CheckCircle className="w-5 h-5" /> Approve Staking
          </button>
        </div>
      </div>
    </div>
  );
};

export default StakingActivationModal;