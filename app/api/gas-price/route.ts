import { NextRequest, NextResponse } from 'next/server';

// Gas price API endpoints for different networks
const GAS_PRICE_APIS = {
  ethereum: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken',
  bsc: 'https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken',
  polygon: 'https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken',
  arbitrum: 'https://api.arbiscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken',
  optimism: 'https://api-optimistic.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken',
  base: 'https://api.basescan.org/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken'
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
      // Note: For production, you should use actual API keys
      const response = await fetch(GAS_PRICE_APIS[networkKey].replace('YourApiKeyToken', 'demo'), {
        next: { revalidate: 30 } // Cache for 30 seconds
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === '1' && data.result) {
          gasData = {
            safe: data.result.SafeGasPrice,
            standard: data.result.ProposeGasPrice,
            fast: data.result.FastGasPrice
          };
        } else {
          throw new Error('Invalid API response');
        }
      } else {
        throw new Error('API request failed');
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