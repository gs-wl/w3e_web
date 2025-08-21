'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Building, 
  Wallet,
  Calendar,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CacheCleanupAdmin } from '@/components/cache-cleanup-admin';
import { AdminWalletManager } from '@/components/admin/AdminWalletManager';

interface WhitelistRequest {
  id: string;
  walletAddress?: string;
  name: string;
  email: string;
  company: string;
  reason: string;
  defiExperience: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface WhitelistRequestsData {
  requests: WhitelistRequest[];
  lastUpdated: string;
  version: string;
}

export function AdminAppPage() {
  const { address } = useAccount();
  const [requests, setRequests] = useState<WhitelistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whitelist-requests');
      if (response.ok) {
        const data: WhitelistRequestsData = await response.json();
        console.log('📋 Admin: Loaded requests data:', data);
        setRequests(data.requests);
        
        // Calculate stats
        const total = data.requests.length;
        const pending = data.requests.filter(req => req.status === 'pending').length;
        const approved = data.requests.filter(req => req.status === 'approved').length;
        const rejected = data.requests.filter(req => req.status === 'rejected').length;
        
        setStats({ total, pending, approved, rejected });
      } else {
        console.error('Failed to load requests:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (requestId: string, walletAddress?: string) => {
    if (!walletAddress) {
      console.error('Cannot approve request without wallet address');
      return;
    }
    
    try {
      setProcessingId(requestId);
      console.log('🔄 Approving request:', requestId, 'for wallet:', walletAddress);
      
      const response = await fetch('/api/whitelist-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          requestId,
          walletAddress
        })
      });
      
      const result = await response.json();
      console.log('✅ Approve response:', result);
      
      if (response.ok) {
        await loadRequests(); // Reload the data
      } else {
        console.error('Failed to approve request:', result);
      }
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      console.log('🔄 Rejecting request:', requestId);
      
      const response = await fetch('/api/whitelist-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          requestId
        })
      });
      
      const result = await response.json();
      console.log('❌ Reject response:', result);
      
      if (response.ok) {
        await loadRequests(); // Reload the data
      } else {
        console.error('Failed to reject request:', result);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200`;
      case 'approved':
        return `${baseClasses} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200`;
      case 'rejected':
        return `${baseClasses} bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200`;
      default:
        return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Manage whitelist requests and platform access</p>
          <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
            Connected as: {address}
          </p>
        </div>
        <Button 
          onClick={loadRequests} 
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cache Cleanup Management */}
      <CacheCleanupAdmin />

      {/* Admin Wallet Management */}
      <AdminWalletManager />

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Users className="h-5 w-5" />
            Whitelist Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No whitelist requests found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Applicant</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Wallet Address</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Company</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Experience</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Submitted</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            <span className={getStatusBadge(request.status)}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{request.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {request.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <Wallet className="h-3 w-3 text-gray-400" />
                            <span className="font-mono text-sm text-gray-900 dark:text-gray-300">
                              {request.walletAddress ? `${request.walletAddress.slice(0, 6)}...${request.walletAddress.slice(-4)}` : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-300">{request.company}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm capitalize text-gray-900 dark:text-gray-300">{request.defiExperience}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-300">{formatDate(request.submittedAt)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {request.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request.id, request.walletAddress)}
                                disabled={processingId === request.id || !request.walletAddress}
                                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request.id)}
                                disabled={processingId === request.id}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <span className={getStatusBadge(request.status)}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(request.submittedAt)}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{request.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {request.email}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Wallet className="h-3 w-3 text-gray-400" />
                        <span className="font-mono text-xs text-gray-900 dark:text-gray-300">
                          {request.walletAddress ? `${request.walletAddress.slice(0, 8)}...${request.walletAddress.slice(-6)}` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-gray-300">{request.company}</span>
                        </div>
                        <span className="text-sm capitalize text-gray-600 dark:text-gray-400">{request.defiExperience}</span>
                      </div>
                    </div>
                    
                    {request.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id, request.walletAddress)}
                          disabled={processingId === request.id || !request.walletAddress}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1 disabled:opacity-50"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          className="border-red-300 text-red-600 hover:bg-red-50 flex-1"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}