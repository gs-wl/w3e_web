import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'W3-Energy Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [sepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

// Contract addresses for Sepolia testnet
export const CONTRACT_ADDRESSES: Record<number, {
  stakingContract: string;
  rewardsContract: string;
  tokenContract: string;
}> = {
  [sepolia.id]: {
    stakingContract: '0x...',
    rewardsContract: '0x...',
    tokenContract: '0x...',
  },
};

// Supported tokens for staking (Sepolia testnet)
export const SUPPORTED_TOKENS: Array<{
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  color: string;
  addresses: Record<number, string>;
}> = [
  {
    symbol: 'SOLAR',
    name: 'Solar Energy Token',
    decimals: 18,
    logo: '/ada.svg',
    color: 'from-yellow-500 to-orange-600',
    addresses: {
      [sepolia.id]: '0x...',
    }
  },
  {
    symbol: 'WIND',
    name: 'Wind Energy Token',
    decimals: 18,
    logo: '/ont.svg',
    color: 'from-green-500 to-green-600',
    addresses: {
      [sepolia.id]: '0x...',
    }
  },
  {
    symbol: 'HYDRO',
    name: 'Hydroelectric Token',
    decimals: 18,
    logo: '/sol.svg',
    color: 'from-blue-500 to-cyan-600',
    addresses: {
      [sepolia.id]: '0x...',
    }
  },
  {
    symbol: 'CARBON',
    name: 'Carbon Credit Token',
    decimals: 18,
    logo: '/dot.svg',
    color: 'from-green-600 to-emerald-700',
    addresses: {
      [sepolia.id]: '0x...',
    }
  },
  {
    symbol: 'FOREST',
    name: 'Forestry W3E Token',
    decimals: 18,
    logo: '/xrp.svg',
    color: 'from-green-700 to-green-800',
    addresses: {
      [sepolia.id]: '0x...',
    }
  },
];