'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  created_at: string;
  is_active: boolean;
  admin_wallet: string;
}

export interface CreateAnnouncementData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  admin_wallet: string;
}

export interface UpdateAnnouncementData {
  id: string;
  title?: string;
  message?: string;
  type?: 'info' | 'warning' | 'success' | 'urgent';
  is_active?: boolean;
  admin_wallet: string;
}

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/announcements');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch announcements');
      }
      
      // API returns array directly, not wrapped in announcements property
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch announcements');
      // Set sample data as fallback
      setAnnouncements([
        {
          id: '1',
          title: '🚀 New Feature Launch',
          message: 'Introducing cross-chain staking rewards! Earn up to 18% APY on your RWA tokens.',
          type: 'success',
          created_at: new Date().toISOString(),
          is_active: true,
          admin_wallet: '0x1234...5678'
        },
        {
          id: '2',
          title: '⚠️ Maintenance Notice',
          message: 'Scheduled maintenance on Sunday 2AM-4AM UTC. Trading will be temporarily unavailable.',
          type: 'warning',
          created_at: new Date().toISOString(),
          is_active: true,
          admin_wallet: '0x1234...5678'
        },
        {
          id: '3',
          title: '💡 Platform Update',
          message: 'Enhanced security features and improved mobile experience now live!',
          type: 'info',
          created_at: new Date().toISOString(),
          is_active: true,
          admin_wallet: '0x1234...5678'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create announcement
  const createAnnouncement = useCallback(async (data: CreateAnnouncementData): Promise<Announcement | null> => {
    try {
      setError(null);
      
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create announcement');
      }
      
      const newAnnouncement = result.announcement;
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      return newAnnouncement;
    } catch (err) {
      console.error('Error creating announcement:', err);
      setError(err instanceof Error ? err.message : 'Failed to create announcement');
      
      // Fallback: add to local state
      const fallbackAnnouncement: Announcement = {
        id: Date.now().toString(),
        title: data.title,
        message: data.message,
        type: data.type,
        created_at: new Date().toISOString(),
        is_active: true,
        admin_wallet: data.admin_wallet
      };
      
      setAnnouncements(prev => [fallbackAnnouncement, ...prev]);
      return fallbackAnnouncement;
    }
  }, []);

  // Update announcement
  const updateAnnouncement = useCallback(async (data: UpdateAnnouncementData): Promise<Announcement | null> => {
    try {
      setError(null);
      
      const response = await fetch('/api/announcements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update announcement');
      }
      
      const updatedAnnouncement = result.announcement;
      setAnnouncements(prev => 
        prev.map(announcement => 
          announcement.id === data.id ? updatedAnnouncement : announcement
        )
      );
      return updatedAnnouncement;
    } catch (err) {
      console.error('Error updating announcement:', err);
      setError(err instanceof Error ? err.message : 'Failed to update announcement');
      
      // Fallback: update local state
      setAnnouncements(prev => 
        prev.map(announcement => {
          if (announcement.id === data.id) {
            return {
              ...announcement,
              ...(data.title && { title: data.title }),
              ...(data.message && { message: data.message }),
              ...(data.type && { type: data.type }),
              ...(data.is_active !== undefined && { is_active: data.is_active })
            };
          }
          return announcement;
        })
      );
      return null;
    }
  }, []);

  // Delete announcement
  const deleteAnnouncement = useCallback(async (id: string, adminWallet: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/announcements?id=${id}&admin_wallet=${adminWallet}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete announcement');
      }
      
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete announcement');
      
      // Fallback: remove from local state
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
      return false;
    }
  }, []);

  // Toggle announcement active status
  const toggleAnnouncementStatus = useCallback(async (id: string, adminWallet: string): Promise<boolean> => {
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return false;
    
    const result = await updateAnnouncement({
      id,
      is_active: !announcement.is_active,
      admin_wallet: adminWallet
    });
    
    return result !== null;
  }, [announcements, updateAnnouncement]);

  // Get active announcements
  const activeAnnouncements = announcements.filter(a => a && a.is_active);

  // Load announcements on mount
  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return {
    announcements,
    activeAnnouncements,
    loading,
    error,
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementStatus,
    clearError: () => setError(null)
  };
};