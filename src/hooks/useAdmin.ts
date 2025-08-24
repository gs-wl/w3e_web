'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface AdminData {
  adminAddresses: string[];
  lastUpdated: string;
  version: string;
}

export function useAdmin() {
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadAdminList() {
      try {
        setIsLoading(true);
        
        // Add cache-busting parameter to prevent caching issues
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/admin-wallets?_t=${timestamp}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch admin wallets: ${response.status}`);
        }
        
        const adminList: AdminData = await response.json();
        setAdminData(adminList);
        
        console.log('🔍 Admin Check Debug:');
        console.log('  - isConnected:', isConnected);
        console.log('  - address:', address);
        console.log('  - admin addresses:', adminList.adminAddresses);
        console.log('  - timestamp:', new Date().toISOString());
        
        if (!isConnected || !address) {
          console.log('  - Result: Not connected or no address');
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        // Check if the connected wallet address is in the admin list
        const lowerCaseAdminList = adminList.adminAddresses.map(addr => addr.toLowerCase());
        const lowerCaseAddress = address.toLowerCase();
        const isAddressAdmin = lowerCaseAdminList.includes(lowerCaseAddress);
        
        console.log('  - Address (lowercase):', lowerCaseAddress);
        console.log('  - Admin list (lowercase):', lowerCaseAdminList);
        console.log('  - Is Admin:', isAddressAdmin);
        
        setIsAdmin(isAddressAdmin);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading admin list:', error);
        setIsAdmin(false);
        setIsLoading(false);
      }
    }

    // Always load admin list when hook is called
    loadAdminList();
  }, [address, isConnected, refreshTrigger]);

  const refreshAdminStatus = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    isAdmin,
    isLoading,
    adminData,
    refreshAdminStatus
  };
}