'use client'

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useWhitelist } from '@/hooks/useWhitelist';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, UserPlus } from 'lucide-react';

interface WhitelistGuardProps {
  children: React.ReactNode;
}

export function WhitelistGuard({ children }: WhitelistGuardProps) {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { isWhitelisted, isLoading } = useWhitelist();
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  useEffect(() => {
    // Show access denied if wallet is not connected OR if connected but not whitelisted
    if (!isConnected || (isConnected && !isLoading && !isWhitelisted)) {
      setShowAccessDenied(true);
    } else {
      setShowAccessDenied(false);
    }
  }, [isConnected, isLoading, isWhitelisted]);

  // Show loading state while checking whitelist
  if (isConnected && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Checking whitelist status...</p>
        </div>
      </div>
    );
  }

  // Show access denied if wallet not connected or not whitelisted
  if (showAccessDenied) {
    const isNotConnected = !isConnected;
    const isConnectedButNotWhitelisted = isConnected && !isWhitelisted;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-xl shadow-lg border border-red-200">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          
          {isNotConnected ? (
            <>
              <p className="text-gray-600 mb-6">You must connect your wallet and be whitelisted to access this application.</p>
              <div className="space-y-3">
                <Button 
                  onClick={() => window.open('https://w3-energy.org', '_blank')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Visit W3-Energy.org
                </Button>
              </div>
            </>
          ) : isConnectedButNotWhitelisted ? (
            <>
              <p className="text-gray-600 mb-2">Your wallet address is not whitelisted for this application.</p>
              <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-100 p-2 rounded break-all">
                {address}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/whitelist')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Whitelist
                </Button>
                <Button 
                  onClick={() => window.open('https://w3-energy.org', '_blank')}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Visit W3-Energy.org
                </Button>
              </div>
            </>
          ) : null}
          
          <p className="text-xs text-gray-400 mt-4">
            Need help? Contact our support team.
          </p>
        </div>
      </div>
    );
  }

  // Only render children if connected AND whitelisted
  if (isConnected && isWhitelisted) {
    return <>{children}</>;
  }
  
  // This should not be reached due to the showAccessDenied logic above
  return null;
}