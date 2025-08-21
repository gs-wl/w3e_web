'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Plus, Edit, Trash2, Save, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useTheme } from '@/contexts/theme-context';
import { useAdmin } from '@/hooks/useAdmin';
import { useAnnouncements, type Announcement } from '@/hooks/useAnnouncements';

interface FloatingAnnouncementProps {
  className?: string;
}

const FloatingAnnouncement: React.FC<FloatingAnnouncementProps> = ({ 
  className = ''
}) => {
  const { theme } = useTheme();
  const { address } = useAccount();
  const { isAdmin } = useAdmin();
  const { 
    announcements, 
    loading, 
    error,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
  } = useAnnouncements();

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    type: 'info' as const,
    is_active: true
  });

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim() || !address) return;
    
    try {
      await createAnnouncement({
        ...newAnnouncement,
        admin_wallet: address
      });
      setNewAnnouncement({ title: '', message: '', type: 'info', is_active: true });
      setShowNewForm(false);
    } catch (error) {
      console.error('Failed to create announcement:', error);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement || !address) return;
    
    try {
      await updateAnnouncement({
        id: editingAnnouncement.id,
        title: editingAnnouncement.title,
        message: editingAnnouncement.message,
        type: editingAnnouncement.type,
        is_active: editingAnnouncement.is_active,
        admin_wallet: address
      });
      setEditingAnnouncement(null);
    } catch (error) {
      console.error('Failed to update announcement:', error);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?') || !address) return;
    
    try {
      await deleteAnnouncement(id, address);
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  // Get active announcements for display
  const activeAnnouncements = announcements.filter(a => a && a.is_active);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Auto-rotate announcements
  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeAnnouncements.length);
    }, 5000); // Change every 5 seconds
    
    return () => clearInterval(interval);
  }, [activeAnnouncements.length]);

  const currentAnnouncement = activeAnnouncements[currentIndex];

  const getAnnouncementBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'urgent': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className={`relative z-40 ${className}`}>
      {/* Announcement Bar - Show to all users if there are active announcements */}
      {activeAnnouncements.length > 0 && isVisible && currentAnnouncement && (
        <div className={`w-full border-b transition-all duration-300 ${getAnnouncementBg(currentAnnouncement.type)}`}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getAnnouncementIcon(currentAnnouncement.type)}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {currentAnnouncement.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {currentAnnouncement.message}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {/* Navigation dots for multiple announcements */}
                {activeAnnouncements.length > 1 && (
                  <div className="flex space-x-1">
                    {activeAnnouncements.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentIndex 
                            ? 'bg-gray-600 dark:bg-gray-300' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        aria-label={`Go to announcement ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
                
                {/* Close button */}
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Dismiss announcement"
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Button - Only show for admins and if panel is not open */}
      {isAdmin && !showAdminPanel && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setShowAdminPanel(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors"
            title="Manage Announcements"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Announcements</span>
          </button>
        </div>
      )}

      {/* Admin Panel - Only show for admins */}
      {isAdmin && showAdminPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Announcements</h3>
                <button
                  onClick={() => setShowAdminPanel(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Create New Announcement */}
              <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-white">Create New Announcement</h4>
                  <button
                    onClick={() => setShowNewForm(!showNewForm)}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    <Plus className="h-3 w-3" />
                    <span>New</span>
                  </button>
                </div>
                
                {showNewForm && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Announcement title"
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <textarea
                      placeholder="Announcement message"
                      value={newAnnouncement.message}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows={3}
                    />
                    <select
                      value={newAnnouncement.type}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button
                      onClick={handleCreateAnnouncement}
                      disabled={!newAnnouncement.title.trim() || !newAnnouncement.message.trim()}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      <span>Create Announcement</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Existing Announcements */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Existing Announcements</h4>
                {announcements.filter(announcement => announcement).map((announcement) => (
                  <div key={announcement.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {getAnnouncementIcon(announcement.type)}
                        <span className="font-medium text-gray-900 dark:text-white">{announcement.title}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          announcement.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {announcement.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{announcement.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Created: {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setEditingAnnouncement(announcement)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Only show for admins */}
      {isAdmin && editingAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Announcement</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Announcement title"
                value={editingAnnouncement.title}
                onChange={(e) => setEditingAnnouncement(prev => prev ? { ...prev, title: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <textarea
                placeholder="Announcement message"
                value={editingAnnouncement.message}
                onChange={(e) => setEditingAnnouncement(prev => prev ? { ...prev, message: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={3}
              />
              <select
                value={editingAnnouncement.type}
                onChange={(e) => setEditingAnnouncement(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="urgent">Urgent</option>
              </select>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editingAnnouncement.is_active}
                  onChange={(e) => setEditingAnnouncement(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-gray-900 dark:text-white">Active</span>
              </label>
              <div className="flex space-x-3">
                <button
                  onClick={handleUpdateAnnouncement}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setEditingAnnouncement(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingAnnouncement;