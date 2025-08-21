'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Wallet } from 'lucide-react';

interface AdminWallet {
  id: number;
  address: string;
  label?: string;
  is_active: boolean;
  added_at: string;
  added_by?: string;
}

interface AdminWalletData {
  adminAddresses: string[];
  adminWallets: AdminWallet[];
  lastUpdated: string;
  version: string;
}

export function AdminWalletManager() {
  const [adminData, setAdminData] = useState<AdminWalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchAdminWallets = async () => {
    try {
      const response = await fetch('/api/admin-wallets');
      if (response.ok) {
        const data = await response.json();
        setAdminData(data);
      }
    } catch (error) {
      console.error('Error fetching admin wallets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminWallets();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch('/api/admin-wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: newAddress.trim(),
          label: newLabel.trim() || undefined,
          added_by: 'admin_panel'
        }),
      });

      if (response.ok) {
        setNewAddress('');
        setNewLabel('');
        await fetchAdminWallets(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding admin wallet:', error);
      alert('Failed to add admin wallet');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (address: string) => {
    if (!confirm(`Are you sure you want to remove admin wallet: ${address}?`)) {
      return;
    }

    setRemovingId(address);
    try {
      const response = await fetch(`/api/admin-wallets?address=${encodeURIComponent(address)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAdminWallets(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error removing admin wallet:', error);
      alert('Failed to remove admin wallet');
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading admin wallets...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
            <Wallet className="h-5 w-5 text-green-600" />
            <span>Admin Wallet Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Admin Form */}
          <form onSubmit={handleAddAdmin} className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">Add New Admin Wallet</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Wallet Address *</label>
                <Input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label (Optional)</label>
                <Input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g., Main Admin, Developer"
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
            <Button type="submit" disabled={isAdding} className="w-full bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              {isAdding ? 'Adding...' : 'Add Admin Wallet'}
            </Button>
          </form>

          {/* Current Admin Wallets */}
          <div>
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Current Admin Wallets ({adminData?.adminWallets?.length || 0})</h3>
            {/* Desktop View */}
            <div className="hidden md:block space-y-2">
              {adminData?.adminWallets?.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex-1">
                    <div className="font-mono text-sm text-gray-900 dark:text-white">{wallet.address}</div>
                    {wallet.label && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{wallet.label}</div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Added: {new Date(wallet.added_at).toLocaleDateString()}
                      {wallet.added_by && ` by ${wallet.added_by}`}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveAdmin(wallet.address)}
                    disabled={removingId === wallet.address}
                    className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 disabled:opacity-50"
                  >
                    {removingId === wallet.address ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3">
              {adminData?.adminWallets?.map((wallet) => (
                <div
                  key={wallet.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  <div className="space-y-2">
                    <div className="font-mono text-sm text-gray-900 dark:text-white break-all">
                      {wallet.address}
                    </div>
                    {wallet.label && (
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{wallet.label}</div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Added: {new Date(wallet.added_at).toLocaleDateString()}
                      {wallet.added_by && ` by ${wallet.added_by}`}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAdmin(wallet.address)}
                      disabled={removingId === wallet.address}
                      className="w-full text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 disabled:opacity-50"
                    >
                      {removingId === wallet.address ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Admin
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {(!adminData?.adminWallets || adminData.adminWallets.length === 0) && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No admin wallets found</p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <strong>Note:</strong> Admin wallets have special privileges in the system. 
            Removing an admin wallet will deactivate it but keep the record for audit purposes.
            <br />
            Last updated: {adminData?.lastUpdated ? new Date(adminData.lastUpdated).toLocaleString() : 'Unknown'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}