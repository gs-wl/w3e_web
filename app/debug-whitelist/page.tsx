'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Clock, XCircle, Search } from 'lucide-react';

interface WhitelistStatus {
  address: string;
  isWhitelisted: boolean;
  whitelistDetails: any;
  requests: any[];
  hasActiveRequest: boolean;
  latestRequest: any;
}

export default function DebugWhitelistPage() {
  const { address, isConnected } = useAccount();
  const [checkAddress, setCheckAddress] = useState('');
  const [status, setStatus] = useState<WhitelistStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkStatus = async (addressToCheck: string) => {
    if (!addressToCheck) return;
    
    setLoading(true);
    setError('');
    setStatus(null);

    try {
      const response = await fetch(`/api/whitelist-status?address=${encodeURIComponent(addressToCheck)}`);
      const data = await response.json();

      if (response.ok) {
        setStatus(data);
      } else {
        setError(data.error || 'Failed to check status');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error checking status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckConnected = () => {
    if (address) {
      setCheckAddress(address);
      checkStatus(address);
    }
  };

  const handleCheckCustom = () => {
    checkStatus(checkAddress);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-teal-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Whitelist Status Checker</h1>
          <p className="text-gray-600">Debug tool to check whitelist request status and resolve issues</p>
        </div>

        {/* Wallet Connection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connected Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {isConnected ? (
                  <div>
                    <p className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">{address}</p>
                    <p className="text-sm text-gray-600 mt-1">Wallet connected</p>
                  </div>
                ) : (
                  <p className="text-gray-600">No wallet connected</p>
                )}
              </div>
              <div className="space-x-2">
                <ConnectButton />
                {isConnected && (
                  <Button onClick={handleCheckConnected} disabled={loading}>
                    Check My Status
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Address Check */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Check Any Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter wallet address (0x...)"
                value={checkAddress}
                onChange={(e) => setCheckAddress(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCheckCustom} disabled={loading || !checkAddress}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Checking...' : 'Check Status'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Results */}
        {status && (
          <div className="space-y-6">
            {/* Whitelist Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {status.isWhitelisted ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-gray-400" />
                  )}
                  <span>Whitelist Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">{status.address}</p>
                  <p className={`font-semibold ${status.isWhitelisted ? 'text-green-600' : 'text-gray-600'}`}>
                    {status.isWhitelisted ? '✅ WHITELISTED' : '❌ NOT WHITELISTED'}
                  </p>
                  {status.whitelistDetails && (
                    <div className="text-sm text-gray-600">
                      <p>Added: {new Date(status.whitelistDetails.added_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Request History */}
            <Card>
              <CardHeader>
                <CardTitle>Request History ({status.requests.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {status.requests.length === 0 ? (
                  <p className="text-gray-600">No whitelist requests found</p>
                ) : (
                  <div className="space-y-4">
                    {status.requests.map((request, index) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(request.status)}
                            <span className="font-semibold capitalize">{request.status}</span>
                            {index === 0 && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Latest</span>}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(request.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>ID:</strong> {request.id}</p>
                          <p><strong>Email:</strong> {request.email}</p>
                          {request.nickname && <p><strong>Nickname:</strong> {request.nickname}</p>}
                          {request.name && <p><strong>Name:</strong> {request.name}</p>}
                          {request.participate_airdrops !== undefined && (
                            <p><strong>Airdrops:</strong> {request.participate_airdrops ? 'Yes' : 'No'}</p>
                          )}
                          {request.join_competitions !== undefined && (
                            <p><strong>Competitions:</strong> {request.join_competitions ? 'Yes' : 'No'}</p>
                          )}
                          {request.bug_bounty_interest !== undefined && (
                            <p><strong>Bug Bounty:</strong> {request.bug_bounty_interest ? 'Yes' : 'No'}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            {status.hasActiveRequest && (
              <Card className="border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-yellow-600">
                    <Clock className="h-5 w-5" />
                    <span>You have an active pending request. Please wait for admin review.</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}