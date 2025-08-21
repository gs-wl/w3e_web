// Contract addresses and configuration for different networks
export const CONTRACT_ADDRESSES = {
    // Ethereum Sepolia Testnet
    sepolia: {
        name: 'Sepolia Testnet',
        chainId: 11155111,
        rpcUrl: 'https://sepolia.infura.io/v3/93e77fdbc00749119977ef7d89e4bc25',
        blockExplorer: 'https://sepolia.etherscan.io',
        contracts: {
            rwaToken: '0x5cfeEc46ABeD58db87a1e2e1873efeecE26a6484',
            stakingContract: '0x3c122D7571F76a32bE8dbC33255E97156f3A9576',
            staking: '0x3c122D7571F76a32bE8dbC33255E97156f3A9576', // Alias for compatibility
        },
    },
    // Ethereum Mainnet (for future deployment)
    mainnet: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://mainnet.infura.io/v3/93e77fdbc00749119977ef7d89e4bc25',
        blockExplorer: 'https://etherscan.io',
        contracts: {
            rwaToken: '', // To be deployed
            stakingContract: '', // To be deployed
            staking: '', // Alias for compatibility
        },
    },
    // Local development
    localhost: {
        name: 'Localhost',
        chainId: 31337,
        rpcUrl: 'http://127.0.0.1:8545',
        blockExplorer: '',
        contracts: {
            rwaToken: '', // Set after local deployment
            stakingContract: '', // Set after local deployment
            staking: '', // Alias for compatibility
        },
    },
} as const;

// Current network configuration
export const CURRENT_NETWORK = 'sepolia';

// Get current network config
export const getCurrentNetworkConfig = () => {
    return CONTRACT_ADDRESSES[CURRENT_NETWORK as keyof typeof CONTRACT_ADDRESSES];
};

// Contract metadata
export const CONTRACT_METADATA = {
    rwaToken: {
        name: 'RWA Token',
        symbol: 'RWA',
        decimals: 18,
        initialSupply: '100000000', // 100M tokens
        maxSupply: '1000000000', // 1B tokens
        features: [
            'ERC20 Standard',
            'Pausable',
            'Burnable',
            'Voting (ERC20Votes)',
            'Transfer Fees',
            'Blacklist',
            'Minting Controls',
        ],
    },
    stakingContract: {
        name: 'Multi Pool Staking',
        features: [
            'Multiple Staking Pools',
            'Configurable Rewards',
            'Lock Periods',
            'Emergency Unstaking',
            'Pool Management',
        ],
        defaultPool: {
            id: 0,
            maxStakeLimit: '1000000', // 1M tokens
            minStakeAmount: '100', // 100 tokens
            rewardRate: '0.1', // 0.1 tokens per second
            lockPeriod: 86400, // 24 hours in seconds
            emergencyFee: 500, // 5% in basis points
        },
    },
} as const;

// Network configuration for wallet connections
export const NETWORK_CONFIG = {
    [CONTRACT_ADDRESSES.sepolia.chainId]: {
        chainName: 'Ethereum Sepolia',
        nativeCurrency: {
            name: 'Sepolia ETH',
            symbol: 'ETH',
            decimals: 18,
        },
        rpcUrls: [CONTRACT_ADDRESSES.sepolia.rpcUrl],
        blockExplorerUrls: [CONTRACT_ADDRESSES.sepolia.blockExplorer],
    },
    [CONTRACT_ADDRESSES.mainnet.chainId]: {
        chainName: 'Ethereum Mainnet',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        rpcUrls: [CONTRACT_ADDRESSES.mainnet.rpcUrl],
        blockExplorerUrls: [CONTRACT_ADDRESSES.mainnet.blockExplorer],
    },
    [CONTRACT_ADDRESSES.localhost.chainId]: {
        chainName: 'Localhost',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        rpcUrls: [CONTRACT_ADDRESSES.localhost.rpcUrl],
        blockExplorerUrls: [''],
    },
} as const;

// Helper functions
export const getContractAddress = (contractName: 'rwaToken' | 'stakingContract') => {
    return getCurrentNetworkConfig().contracts[contractName];
};

export const getBlockExplorerUrl = (address: string) => {
    const config = getCurrentNetworkConfig();
    return `${config.blockExplorer}/address/${address}`;
};

export const getTransactionUrl = (txHash: string) => {
    const config = getCurrentNetworkConfig();
    return `${config.blockExplorer}/tx/${txHash}`;
};

// Safe network config getter
export const getNetworkConfig = (chainId: number) => {
    return NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG];
};

// Check if chain ID is supported
export const isSupportedChain = (chainId: number): chainId is keyof typeof NETWORK_CONFIG => {
    return chainId in NETWORK_CONFIG;
};

// Token configuration for adding to wallet
export const TOKEN_CONFIG = {
    address: getContractAddress('rwaToken'),
    symbol: CONTRACT_METADATA.rwaToken.symbol,
    decimals: CONTRACT_METADATA.rwaToken.decimals,
    image: '', // Add token logo URL if available
};

export default CONTRACT_ADDRESSES;