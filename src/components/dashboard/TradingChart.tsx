'use client';

import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface TradingChartProps {
  currentPrice: string;
  priceChange: string;
  isPositive: boolean;
}

const TradingChart = ({ 
  currentPrice = '$45,678.90', 
  priceChange = '2.54%', 
  isPositive = true 
}: TradingChartProps) => {
  const [activeTimeframe, setActiveTimeframe] = useState('1D');
  const timeframes = ['1H', '1D', '1W', '1M'];

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Trading Chart</h2>
        <div className="flex space-x-2">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setActiveTimeframe(timeframe)}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${
                activeTimeframe === timeframe
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-600 hover:text-white'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center mb-4">
        <p className="text-3xl font-bold mr-4 text-gray-900 dark:text-white">{currentPrice}</p>
        <div className={`flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          <TrendingUp className={`text-lg mr-1 ${isPositive ? '' : 'rotate-180'}`} />
          <p className="font-semibold text-lg">{priceChange}</p>
        </div>
      </div>
      
      <div className="chart-container flex-grow min-h-[300px] bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
        {/* Placeholder for actual chart implementation */}
        <div className="text-center text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Chart visualization will be implemented here</p>
          <p className="text-sm mt-2">Consider integrating TradingView, Chart.js, or similar</p>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;