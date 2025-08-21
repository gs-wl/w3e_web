'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

interface PoolData {
  pool: string;
  asset: string;
  apy: string;
  duration: string;
  isPositive?: boolean;
}

interface EcosystemSummaryProps {
  pools?: PoolData[];
}

const defaultPools: PoolData[] = [
  { pool: 'Green Energy Pool', asset: 'GE-Token', apy: '18.5%', duration: '30 Days', isPositive: true },
  { pool: 'Solar Farm Fund', asset: 'SF-Token', apy: '12.2%', duration: '14 Days', isPositive: true },
  { pool: 'Eco Innovate', asset: 'EI-Token', apy: '22.1%', duration: '60 Days', isPositive: true },
  { pool: 'Wind Power Collective', asset: 'WP-Token', apy: '15.8%', duration: '45 Days', isPositive: true },
  { pool: 'Hydro Energy Vault', asset: 'HE-Token', apy: '19.3%', duration: '90 Days', isPositive: true },
  { pool: 'Carbon Credit Pool', asset: 'CC-Token', apy: '14.7%', duration: '21 Days', isPositive: true },
  { pool: 'Renewable Infrastructure', asset: 'RI-Token', apy: '16.9%', duration: '120 Days', isPositive: true },
  { pool: 'Clean Tech Ventures', asset: 'CT-Token', apy: '20.4%', duration: '75 Days', isPositive: true },
  { pool: 'Sustainable Mining', asset: 'SM-Token', apy: '13.6%', duration: '28 Days', isPositive: true },
  { pool: 'Ocean Energy Fund', asset: 'OE-Token', apy: '17.2%', duration: '50 Days', isPositive: true },
  { pool: 'Biomass Power Pool', asset: 'BP-Token', apy: '11.8%', duration: '35 Days', isPositive: true },
  { pool: 'Geothermal Collective', asset: 'GT-Token', apy: '21.5%', duration: '100 Days', isPositive: true },
  { pool: 'Smart Grid Network', asset: 'SG-Token', apy: '15.1%', duration: '42 Days', isPositive: true },
  { pool: 'Energy Storage Solutions', asset: 'ES-Token', apy: '18.9%', duration: '65 Days', isPositive: true },
  { pool: 'Green Hydrogen Fund', asset: 'GH-Token', apy: '23.7%', duration: '180 Days', isPositive: true },
];

const EcosystemSummary = ({ pools = defaultPools }: EcosystemSummaryProps) => {
  const [assetFilter, setAssetFilter] = useState('all');
  const [apyFilter, setApyFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter pools based on selected filters
  const filteredPools = pools.filter(pool => {
    const assetMatch = assetFilter === 'all' || pool.asset.toLowerCase().includes(assetFilter);
    
    let durationMatch = true;
    if (durationFilter !== 'all') {
      const durationDays = parseInt(pool.duration);
      if (durationFilter === 'short') {
        durationMatch = durationDays <= 30;
      } else if (durationFilter === 'medium') {
        durationMatch = durationDays > 30 && durationDays <= 90;
      } else if (durationFilter === 'long') {
        durationMatch = durationDays > 90;
      }
    }
    
    return assetMatch && durationMatch;
  }).sort((a, b) => {
    if (apyFilter === 'high') {
      return parseFloat(b.apy) - parseFloat(a.apy);
    } else if (apyFilter === 'low') {
      return parseFloat(a.apy) - parseFloat(b.apy);
    }
    return 0;
  });

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setShowScrollIndicator(!isAtBottom);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll(); // Check initial state
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [filteredPools]);

  useEffect(() => {
    // Reset scroll indicator when filters change
    setShowScrollIndicator(filteredPools.length > 6);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [assetFilter, apyFilter, durationFilter, filteredPools.length]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ecosystem Summary</h2>
        
        <div className="flex flex-wrap gap-3">
          {/* Asset Filter */}
          <div className="relative">
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="appearance-none bg-gray-600 dark:bg-gray-700 text-white px-4 py-2.5 pr-8 rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-500 dark:hover:bg-gray-600 transition-all"
            >
              <option value="all">Filter by Asset</option>
              <option value="ge">GE-Token</option>
              <option value="sf">SF-Token</option>
              <option value="ei">EI-Token</option>
              <option value="wp">WP-Token</option>
              <option value="he">HE-Token</option>
              <option value="cc">CC-Token</option>
              <option value="ri">RI-Token</option>
              <option value="ct">CT-Token</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-white" />
            </div>
          </div>
          
          {/* APY Filter */}
          <div className="relative">
            <select
              value={apyFilter}
              onChange={(e) => setApyFilter(e.target.value)}
              className="appearance-none bg-gray-600 dark:bg-gray-700 text-white px-4 py-2.5 pr-8 rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-500 dark:hover:bg-gray-600 transition-all"
            >
              <option value="all">Filter by APY</option>
              <option value="high">High to Low</option>
              <option value="low">Low to High</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-white" />
            </div>
          </div>
          
          {/* Duration Filter */}
          <div className="relative">
            <select
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
              className="appearance-none bg-gray-600 dark:bg-gray-700 text-white px-4 py-2.5 pr-8 rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-500 dark:hover:bg-gray-600 transition-all"
            >
              <option value="all">Filter by Duration</option>
              <option value="short">Short Term (≤30 days)</option>
              <option value="medium">Medium Term (31-90 days)</option>
              <option value="long">Long Term (&gt;90 days)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className="overflow-x-auto">
          <div 
            ref={scrollContainerRef}
            className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 scroll-smooth"
          >
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 rounded-l-lg">Pool</th>
                  <th scope="col" className="px-6 py-3">Asset</th>
                  <th scope="col" className="px-6 py-3">APY</th>
                  <th scope="col" className="px-6 py-3 rounded-r-lg">Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredPools.length > 0 ? (
                  filteredPools.map((pool, index) => (
                    <tr
                      key={index}
                      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {pool.pool}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {pool.asset}
                      </td>
                      <td className={`px-6 py-4 font-semibold ${
                        pool.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {pool.apy}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {pool.duration}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No pools match the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Scroll indicator */}
        {showScrollIndicator && filteredPools.length > 6 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none flex items-end justify-center pb-2">
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 animate-pulse">
              <span>Scroll for more</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EcosystemSummary;