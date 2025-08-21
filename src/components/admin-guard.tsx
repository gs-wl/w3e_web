'use client'

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAdmin } from '@/hooks/useAdmin';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isAdmin, isLoading } = useAdmin();

  useEffect(() => {
    // Redirect if wallet is connected but not admin
    if (isConnected && !isLoading && !isAdmin) {
      window.open('https://w3-energy.org', '_blank');
    }
  }, [isConnected, isLoading, isAdmin, router]);

  // Show loading state while checking admin status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need to connect your wallet to access the admin panel.</p>
          <button 
            onClick={() => window.open('https://w3-energy.org', '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Visit W3-Energy.org
          </button>
        </div>
      </div>
    );
  }

  // Show access denied if connected but not admin
  if (isConnected && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">Your wallet address is not authorized to access the admin panel.</p>
          <button 
            onClick={() => window.open('https://w3-energy.org', '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Visit W3-Energy.org
          </button>
        </div>
      </div>
    );
  }

  // Render children if admin
  return <>{children}</>;
}