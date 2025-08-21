import { useState, useEffect } from 'react';

interface RewardsPreferences {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  statusFilter: string;
}

const DEFAULT_PREFERENCES: RewardsPreferences = {
  sortBy: 'availableRewards',
  sortOrder: 'desc',
  statusFilter: 'all',
};

const STORAGE_KEY = 'kiro-rewards-preferences';

export const useRewardsPreferences = () => {
  const [preferences, setPreferences] = useState<RewardsPreferences>(DEFAULT_PREFERENCES);
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
      console.warn('Failed to load rewards preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage when they change
  const updatePreferences = (updates: Partial<RewardsPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.warn('Failed to save rewards preferences:', error);
    }
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to reset rewards preferences:', error);
    }
  };

  return {
    preferences,
    isLoaded,
    updatePreferences,
    resetPreferences,
  };
};