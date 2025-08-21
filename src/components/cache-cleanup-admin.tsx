'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Play, Square, RefreshCw, Clock } from 'lucide-react';

interface SchedulerStatus {
  isRunning: boolean;
  intervalHours: number;
}

interface CleanupResult {
  cleaned: boolean;
  message: string;
  cacheStatus?: string;
  cacheAgeHours?: number;
}

export function CacheCleanupAdmin() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch scheduler status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news/cache/scheduler');
      const data = await response.json();
      
      if (data.success) {
        setSchedulerStatus(data.scheduler);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch scheduler status');
    } finally {
      setLoading(false);
    }
  };

  // Control scheduler
  const controlScheduler = async (action: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/news/cache/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      
      if (data.success) {
        if (data.cleanup) {
          setCleanupResult(data.cleanup);
        }
        await fetchStatus(); // Refresh status
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to control scheduler');
    } finally {
      setLoading(false);
    }
  };

  // Check cache status and cleanup
  const checkCacheStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news/cache/cleanup');
      const data = await response.json();
      
      if (data.success) {
        setCleanupResult(data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to check cache status');
    } finally {
      setLoading(false);
    }
  };

  // Load initial status
  useEffect(() => {
    fetchStatus();
    checkCacheStatus();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Clock className="h-5 w-5" />
            Cache Cleanup Scheduler
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Manage the background cleanup job that removes expired cache files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
          
          {schedulerStatus && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  schedulerStatus.isRunning 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {schedulerStatus.isRunning ? 'Running' : 'Stopped'}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Interval: {schedulerStatus.intervalHours} hours
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={schedulerStatus.isRunning ? 'destructive' : 'default'}
                  onClick={() => controlScheduler(schedulerStatus.isRunning ? 'stop' : 'start')}
                  disabled={loading}
                  className={schedulerStatus.isRunning ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                >
                  {schedulerStatus.isRunning ? (
                    <><Square className="h-4 w-4 mr-1" /> Stop</>
                  ) : (
                    <><Play className="h-4 w-4 mr-1" /> Start</>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => controlScheduler('trigger')}
                  disabled={loading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Manual Cleanup
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchStatus}
                  disabled={loading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {cleanupResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Cache Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">Last Cleanup Result:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                cleanupResult.cleaned 
                  ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' 
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
              }`}>
                {cleanupResult.cleaned ? 'Files Deleted' : 'No Action Needed'}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {cleanupResult.message}
            </div>
            
            {cleanupResult.cacheStatus && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Status:</strong> {cleanupResult.cacheStatus}
              </div>
            )}
            
            {cleanupResult.cacheAgeHours !== undefined && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Cache Age:</strong> {cleanupResult.cacheAgeHours} hours
                {cleanupResult.cacheAgeHours > 24 && (
                  <span className="text-red-600 dark:text-red-400 ml-2">(Expired)</span>
                )}
              </div>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={checkCacheStatus}
              disabled={loading}
              className="mt-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Check Cache Status
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}