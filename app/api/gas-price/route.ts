import { NextRequest, NextResponse } from 'next/server';

// Get API keys from environment variables
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || 'YourApiKeyToken';
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || 'YourApiKeyToken';
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || 'YourApiKeyToken';
const OPTIMISM_API_KEY = process.env.OPTIMISM_API_KEY || 'YourApiKeyToken';
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || 'YourApiKeyToken';

// Gas price API endpoints for different networks
const GAS_PRICE_APIS = {
  ethereum: `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`,
  bsc: `https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=${BSCSCAN_API_KEY}`,
  polygon: `https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=${POLYGONSCAN_API_KEY}`,
  arbitrum: `https://api.arbiscan.io/api?module=gastracker&action=gasoracle&apikey=${ARBISCAN_API_KEY}`,
  optimism: `https://api-optimistic.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${OPTIMISM_API_KEY}`,
  base: `https://api.basescan.org/api?module=gastracker&action=gasoracle&apikey=${BASESCAN_API_KEY}`
};

// Fallback gas prices (in Gwei) when API fails
const FALLBACK_GAS_PRICES = {
  ethereum: { SafeGasPrice: '20', ProposeGasPrice: '25', FastGasPrice: '30' },
  bsc: { SafeGasPrice: '3', ProposeGasPrice: '5', FastGasPrice: '8' },
  polygon: { SafeGasPrice: '30', ProposeGasPrice: '35', FastGasPrice: '40' },
  arbitrum: { SafeGasPrice: '0.1', ProposeGasPrice: '0.2', FastGasPrice: '0.3' },
  optimism: { SafeGasPrice: '0.001', ProposeGasPrice: '0.002', FastGasPrice: '0.003' },
  base: { SafeGasPrice: '0.001', ProposeGasPrice: '0.002', FastGasPrice: '0.003' }
};

// Network display names and symbols
const NETWORK_INFO = {
  ethereum: { name: 'Ethereum', symbol: 'ETH', unit: 'Gwei' },
  bsc: { name: 'BNB Chain', symbol: 'BNB', unit: 'Gwei' },
  polygon: { name: 'Polygon', symbol: 'MATIC', unit: 'Gwei' },
  arbitrum: { name: 'Arbitrum', symbol: 'ETH', unit: 'Gwei' },
  optimism: { name: 'Optimism', symbol: 'ETH', unit: 'Gwei' },
  base: { name: 'Base', symbol: 'ETH', unit: 'Gwei' }
};

interface GasPriceResponse {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network')?.toLowerCase() || 'ethereum';

    // Validate network
    if (!GAS_PRICE_APIS[network as keyof typeof GAS_PRICE_APIS]) {
      return NextResponse.json(
        { error: 'Unsupported network. Supported networks: ethereum, bsc, polygon, arbitrum, optimism, base' },
        { status: 400 }
      );
    }

    const networkKey = network as keyof typeof GAS_PRICE_APIS;
    let gasData;

    try {
      // Try to fetch from the respective blockchain explorer API
      const apiUrl = GAS_PRICE_APIS[networkKey];
      console.log(`Fetching gas price for ${network} from: ${apiUrl.replace(/apikey=.*/, 'apikey=***')}`);
      
      const response = await fetch(apiUrl, {
        next: { revalidate: 30 }, // Cache for 30 seconds
        headers: {
          'User-Agent': 'w3energy-defi-platform/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`API response for ${network}:`, JSON.stringify(data, null, 2));

      // Check if the response has the expected structure
      if (data && data.status === '1' && data.result) {
        // Validate that all required fields exist
        const result = data.result;
        if (result.SafeGasPrice && result.ProposeGasPrice && result.FastGasPrice) {
          gasData = {
            safe: result.SafeGasPrice,
            standard: result.ProposeGasPrice,
            fast: result.FastGasPrice
          };
        } else {
          throw new Error(`Invalid API response structure: missing gas price fields. Got: ${JSON.stringify(result)}`);
        }
      } else {
        throw new Error(`Invalid API response: status=${data?.status}, message=${data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.warn(`Gas price API failed for ${network}, using fallback:`, error);
      // Use fallback data
      const fallback = FALLBACK_GAS_PRICES[networkKey];
      gasData = {
        safe: fallback.SafeGasPrice,
        standard: fallback.ProposeGasPrice,
        fast: fallback.FastGasPrice
      };
    }

    const response: GasPriceResponse = {
      network: networkKey,
      networkInfo: NETWORK_INFO[networkKey],
      gasPrice: gasData,
      timestamp: Date.now()
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error('Gas price API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gas price' },
      { status: 500 }
    );
  }
}