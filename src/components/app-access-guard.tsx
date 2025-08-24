'use client'

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useWhitelist } from '@/hooks/useWhitelist';
import { useAdmin } from '@/hooks/useAdmin';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, UserPlus, Shield } from 'lucide-react';
import { WalletConnectButton } from './wallet-connect-button';

interface AppAccessGuardProps {
  children: React.ReactNode;
}

export function AppAccessGuard({ children }: AppAccessGuardProps) {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { isWhitelisted, isLoading: whitelistLoading } = useWhitelist();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  const isLoading = whitelistLoading || adminLoading;
  const hasAccess = isWhitelisted || isAdmin;

  useEffect(() => {
    // Show access denied if wallet is not connected OR if connected but neither whitelisted nor admin
    if (!isConnected || (isConnected && !isLoading && !hasAccess)) {
      setShowAccessDenied(true);
    } else {
      setShowAccessDenied(false);
    }
  }, [isConnected, isLoading, hasAccess]);

  // Show loading state while checking access
  if (isConnected && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if wallet not connected or no access
  if (showAccessDenied) {
    const isNotConnected = !isConnected;
    const isConnectedButNoAccess = isConnected && !hasAccess;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-xl shadow-lg border border-red-200">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          
          {isNotConnected ? (
            <>
              <p className="text-gray-600 mb-6">You must connect your wallet to access this application.</p>
              <div className="space-y-3">
                <WalletConnectButton />
              </div>
            </>
          ) : isConnectedButNoAccess ? (
            <>
              <p className="text-gray-600 mb-2">Your wallet address needs either whitelist or admin access.</p>
              <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-100 p-2 rounded break-all">
                {address}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Whitelist: {isWhitelisted ? '✅' : '❌'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Admin: {isAdmin ? '✅' : '❌'}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => router.push('/whitelist')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Apply for Whitelist
                </Button>
              </div>
            </>
          ) : null}
          
          <p className="text-xs text-gray-400 mt-4">
            Need access?{' '}
            <button 
              onClick={() => router.push('/whitelist')}
              className="text-green-600 hover:text-green-700 underline"
            >
              Apply for whitelist
            </button>
            {' '}or contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  // Only render children if connected AND (whitelisted OR admin)
  if (isConnected && hasAccess) {
    return <>{children}</>;
  }
  
  // This should not be reached due to the showAccessDenied logic above
  return null;
}