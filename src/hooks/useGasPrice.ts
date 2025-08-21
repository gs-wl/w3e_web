'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';

interface GasPriceData {
  network: string;
  networkInfo: {
    name: string;
    symbol: string;
    unit: string;
  };
  gasPrice: {
    safe: string;
    standard: string;
    fast: string;
  };
  timestamp: number;
}

interface UseGasPriceReturn {
  gasPrice: GasPriceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Map chain IDs to network names
const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  1: 'ethereum',     // Ethereum Mainnet
  56: 'bsc',         // BNB Smart Chain
  137: 'polygon',    // Polygon
  42161: 'arbitrum', // Arbitrum One
  10: 'optimism',    // Optimism
  8453: 'base'       // Base
};

export function useGasPrice(): UseGasPriceReturn {
  const [gasPrice, setGasPrice] = useState<GasPriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isConnected } = useAccount();
  const chainId = useChainId();

  const fetchGasPrice = useCallback(async (networkName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/gas-price?network=${networkName}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch gas price: ${response.statusText}`);
      }
      
      const data: GasPriceData = await response.json();
      setGasPrice(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch gas price';
      setError(errorMessage);
      console.error('Gas price fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (isConnected && chainId) {
      const networkName = CHAIN_ID_TO_NETWORK[chainId] || 'ethereum';
      fetchGasPrice(networkName);
    } else {
      // Default to Ethereum when not connected
      fetchGasPrice('ethereum');
    }
  }, [isConnected, chainId, fetchGasPrice]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  return {
    gasPrice,
    loading,
    error,
    refetch
  };
}