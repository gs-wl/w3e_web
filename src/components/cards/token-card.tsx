import React from 'react';
import { Shield, Star, Coins, Lock, TrendingUp, TrendingDown, Users, Clock } from 'lucide-react';

interface TokenCardProps {
  token: {
    id: number;
    symbol: string;
    name: string;
    type: string;
    tvl: string;
    apy: string;
    price: string;
    change24h: string;
    marketCap: string;
    liquidity: string;
    chain: string;
    verified: boolean;
    yieldType: string;
    nextReward: string;
    holders: number;
  };
}

export const TokenCard = ({ token }: TokenCardProps) => {
  const isPositiveChange = token.change24h.startsWith('+');
  const changeValue = token.change24h.replace(/[+%]/g, '');
  
  const getChainColor = (chain: string) => {
    switch (chain) {
      case 'ethereum': return 'from-blue-500 to-blue-600';
      case 'polygon': return 'from-purple-500 to-purple-600';
      case 'arbitrum': return 'from-blue-400 to-blue-500';
      default: return 'from-indigo-500 to-indigo-600';
    }
  };

  return (
    <article className="group relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-6 hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Header Section */}
      <div className="relative flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className={`relative w-14 h-14 bg-gradient-to-br ${getChainColor(token.chain)} rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {token.symbol.slice(0, 3)}
            <div className="absolute -inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">{token.symbol}</h3>
              {token.verified && (
                <div className="relative">
                  <Shield className="w-5 h-5 text-green-500" />
                  <div className="absolute inset-0 bg-green-400 rounded-full blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{token.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 px-3 py-1.5 rounded-full text-xs font-semibold dark:from-emerald-900 dark:to-green-900 dark:text-emerald-200 shadow-sm">
            {token.type}
          </span>
          <button className="text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-300 hover:scale-110 transition-all duration-200" aria-label="Favorite">
            <Star className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Price and Performance Section */}
      <div className="relative mb-6">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Current Price</p>
            <div className="flex items-center justify-center gap-3">
              <p className="font-bold text-3xl text-gray-900 dark:text-white">{token.price}</p>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                isPositiveChange 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {isPositiveChange ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-semibold">{Math.abs(parseFloat(changeValue)).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* APY and Liquidity Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-100 dark:border-green-900/50">
          <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">APY Reward</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="font-bold text-lg text-green-600 dark:text-green-400">{token.apy}%</p>
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 border border-purple-100 dark:border-purple-900/50">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">Liquidity</p>
          <p className="font-bold text-lg text-purple-900 dark:text-purple-100">{token.liquidity}</p>
        </div>
      </div>
      
      {/* TVL and Chain Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Total Value Locked</p>
          <p className="font-bold text-lg text-blue-900 dark:text-blue-100">{token.tvl}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Network</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getChainColor(token.chain)} shadow-sm`} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">{token.chain}</span>
          </div>
        </div>
      </div>
      
      {/* Holders Info */}
      <div className="flex items-center justify-center mb-6 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">{token.holders.toLocaleString()} holders</span>
        </div>
      </div>
      
      {/* Yield Information */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Yield Strategy</p>
          <p className="font-semibold text-gray-900 dark:text-white">{token.yieldType}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Next Reward</p>
          <div className="flex items-center justify-end gap-1">
            <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            <p className="font-semibold text-gray-900 dark:text-white">{token.nextReward}</p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 group/btn">
          <Coins className="w-4 h-4 group-hover/btn:rotate-12 transition-transform duration-300" />
          <span>Trade</span>
        </button>
        <button className="flex-1 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:via-green-700 hover:to-teal-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 group/btn">
          <Lock className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-300" />
          <span>Stake</span>
        </button>
      </div>
    </article>
  );
};