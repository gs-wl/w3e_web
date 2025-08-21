'use client';

import React, { useState } from 'react';

interface AssetData {
  name: string;
  symbol: string;
  percentage: number;
  color: string;
}

interface AssetPerformancePieChartProps {
  assets?: AssetData[];
}

const defaultAssets: AssetData[] = [
  { name: 'Solar Energy', symbol: 'SOL', percentage: 45, color: '#3F51B5' },
  { name: 'Wind Power', symbol: 'WIND', percentage: 30, color: '#03A9F4' },
  { name: 'Hydro Electric', symbol: 'HYDRO', percentage: 15, color: '#4CAF50' },
  { name: 'Battery Storage', symbol: 'BATT', percentage: 10, color: '#FFC107' },
];

const AssetPerformancePieChart = ({ assets = defaultAssets }: AssetPerformancePieChartProps) => {
  const [selectedAsset, setSelectedAsset] = useState(0);

  // Calculate cumulative percentages for the conic gradient
  const gradientStops = assets.reduce((acc, asset, index) => {
    const prevPercentage = index === 0 ? 0 : acc[index - 1].end;
    const currentEnd = prevPercentage + asset.percentage;
    acc.push({
      color: asset.color,
      start: prevPercentage,
      end: currentEnd
    });
    return acc;
  }, [] as { color: string; start: number; end: number }[]);

  const gradientString = gradientStops
    .map(stop => `${stop.color} ${stop.start}% ${stop.end}%`)
    .join(', ');

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Asset Performance</h2>
      </div>
      
      <div className="flex-grow flex flex-col md:flex-row items-center justify-center gap-8">
        {/* Pie Chart */}
        <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
          <div 
            className="relative w-full h-full rounded-full cursor-pointer transition-transform hover:scale-105"
            style={{
              background: `conic-gradient(${gradientString})`
            }}
          >
            {/* Center circle with selected asset info */}
            <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-full flex flex-col items-center justify-center shadow-inner">
              <p className="text-sm text-gray-600 dark:text-gray-400">{assets[selectedAsset].name}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{assets[selectedAsset].percentage}%</p>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="space-y-3 text-sm">
          {assets.map((asset, index) => (
            <div
              key={asset.symbol}
              onClick={() => setSelectedAsset(index)}
              className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                selectedAsset === index
                  ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-blue-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: asset.color }}
              ></span>
              <span className="text-gray-900 dark:text-white">
                {asset.name} ({asset.symbol}) - {asset.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssetPerformancePieChart;