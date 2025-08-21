'use client';

import React from 'react';
import { Fuel, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { useGasPrice } from '@/hooks/useGasPrice';

interface GasPriceDisplayProps {
  className?: string;
  compact?: boolean;
}

export function GasPriceDisplay({ className = '', compact = false }: GasPriceDisplayProps) {
  const { gasPrice, loading, error, refetch } = useGasPrice();

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-500 dark:text-red-400 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        {!compact && <span className="text-sm">Gas Error</span>}
      </div>
    );
  }

  if (loading || !gasPrice) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 dark:text-gray-400 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        {!compact && <span className="text-sm">Loading...</span>}
      </div>
    );
  }

  const formatGasPrice = (price: string) => {
    const num = parseFloat(price);
    if (num < 1) {
      return num.toFixed(3);
    } else if (num < 10) {
      return num.toFixed(1);
    } else {
      return Math.round(num).toString();
    }
  };

  if (compact) {
    return (
      <button
        onClick={refetch}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${className}`}
        title={`${gasPrice.networkInfo.name} Gas: ${formatGasPrice(gasPrice.gasPrice.standard)} ${gasPrice.networkInfo.unit}`}
      >
        <Fuel className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {formatGasPrice(gasPrice.gasPrice.standard)}
        </span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Fuel className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {gasPrice.networkInfo.symbol}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Gas
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600 dark:text-green-400">
              {formatGasPrice(gasPrice.gasPrice.safe)} {gasPrice.networkInfo.unit}
            </span>
            <span className="text-orange-600 dark:text-orange-400">
              {formatGasPrice(gasPrice.gasPrice.standard)}
            </span>
            <span className="text-red-600 dark:text-red-400">
              {formatGasPrice(gasPrice.gasPrice.fast)}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={refetch}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title="Refresh gas prices"
      >
        <RefreshCw className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );
}

export default GasPriceDisplay;