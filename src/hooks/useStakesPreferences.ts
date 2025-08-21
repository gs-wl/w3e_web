import { useState, useEffect } from 'react';
import type { SortConfig, FilterConfig } from '@/types/staking';
import { createDefaultFilters } from '@/utils/filtering';

interface StakesPreferences {
  sortConfig: SortConfig;
  filters: FilterConfig;
  viewMode: 'table' | 'cards';
  itemsPerPage: number;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
}

const DEFAULT_PREFERENCES: StakesPreferences = {
  sortConfig: { field: 'amount', order: 'desc' },
  filters: createDefaultFilters(),
  viewMode: 'table',
  itemsPerPage: 25,
  autoRefresh: false,
  refreshInterval: 30,
};

const STORAGE_KEY = 'kiro-stakes-preferences';

export const useStakesPreferences = () => {
  const [preferences, setPreferences] = useState<StakesPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load stakes preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save stakes preferences:', error);
    }
  }, [preferences, isLoaded]);

  const updateSortConfig = (sortConfig: SortConfig) => {
    setPreferences(prev => ({ ...prev, sortConfig }));
  };

  const updateFilters = (filters: FilterConfig) => {
    setPreferences(prev => ({ ...prev, filters }));
  };

  const updateViewMode = (viewMode: 'table' | 'cards') => {
    setPreferences(prev => ({ ...prev, viewMode }));
  };

  const updateItemsPerPage = (itemsPerPage: number) => {
    setPreferences(prev => ({ ...prev, itemsPerPage }));
  };

  const updateAutoRefresh = (autoRefresh: boolean) => {
    setPreferences(prev => ({ ...prev, autoRefresh }));
  };

  const updateRefreshInterval = (refreshInterval: number) => {
    setPreferences(prev => ({ ...prev, refreshInterval }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const exportPreferences = () => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stakes-preferences.json';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const importPreferences = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setPreferences({ ...DEFAULT_PREFERENCES, ...imported });
          resolve();
        } catch (error) {
          reject(new Error('Invalid preferences file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  return {
    preferences,
    isLoaded,
    updateSortConfig,
    updateFilters,
    updateViewMode,
    updateItemsPerPage,
    updateAutoRefresh,
    updateRefreshInterval,
    resetPreferences,
    exportPreferences,
    importPreferences,
  };
};

// Hook for auto-refresh functionality
export const useAutoRefresh = (
  enabled: boolean,
  interval: number,
  callback: () => void
) => {
  useEffect(() => {
    if (!enabled || interval <= 0) return;

    const intervalId = setInterval(callback, interval * 1000);
    return () => clearInterval(intervalId);
  }, [enabled, interval, callback]);
};