'use client'

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWhitelist } from '@/hooks/useWhitelist';

export default function DebugPage() {
  const { address, isConnected } = useAccount();
  const { isWhitelisted, isLoading, whitelistData } = useWhitelist();
  const [apiData, setApiData] = useState<any>(null);

  useEffect(() => {
    // Test the API directly
    fetch('/api/whitelist')
      .then(res => res.json())
      .then(data => setApiData(data))
      .catch(err => console.error('API Error:', err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Whitelist Debug Page</h1>
        
        <div className="mb-8">
          <ConnectButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wallet Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Wallet Status</h2>
            <div className="space-y-2">
              <p><strong>Connected:</strong> {isConnected ? 'YES' : 'NO'}</p>
              <p><strong>Address:</strong> {address || 'Not connected'}</p>
              <p><strong>Address (lowercase):</strong> {address?.toLowerCase() || 'Not connected'}</p>
            </div>
          </div>

          {/* Whitelist Status */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Whitelist Status</h2>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {isLoading ? 'YES' : 'NO'}</p>
              <p><strong>Whitelisted:</strong> {isWhitelisted ? 'YES' : 'NO'}</p>
              <p><strong>Data Available:</strong> {whitelistData ? 'YES' : 'NO'}</p>
            </div>
          </div>
        </div>

        {/* API Data */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">API Response</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(apiData, null, 2)}
          </pre>
        </div>

        {/* Whitelist Data */}
        {whitelistData && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Whitelist Data</h2>
            <p><strong>Last Updated:</strong> {whitelistData.lastUpdated}</p>
            <p><strong>Version:</strong> {whitelistData.version}</p>
            <p><strong>Total Addresses:</strong> {whitelistData.whitelistedAddresses.length}</p>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Addresses:</h3>
              <ul className="space-y-1">
                {whitelistData.whitelistedAddresses.map((addr, index) => (
                  <li key={index} className="font-mono text-sm">
                    {index + 1}. {addr}
                    {address && addr.toLowerCase() === address.toLowerCase() && (
                      <span className="ml-2 text-green-600 font-bold">← YOUR ADDRESS</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Check Result */}
        {isConnected && address && (
          <div className={`mt-6 p-6 rounded-lg shadow ${isWhitelisted ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h2 className="text-xl font-semibold mb-4">Final Result</h2>
            <p className="text-lg">
              Address <code className="font-mono">{address}</code> is{' '}
              <strong className={isWhitelisted ? 'text-green-600' : 'text-red-600'}>
                {isWhitelisted ? 'WHITELISTED' : 'NOT WHITELISTED'}
              </strong>
            </p>
            {isWhitelisted ? (
              <p className="mt-2 text-green-600">✅ Should show "Launch App" button on homepage</p>
            ) : (
              <p className="mt-2 text-red-600">❌ Should be redirected to whitelist</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}