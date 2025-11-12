'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/api';

export interface Notification {
  id: string;
  type: 'new_complaint' | 'complaint_assigned' | 'complaint_updated' | 'new_comment' | 'status_changed' | 'reminder_due';
  complaintId: string;
  title: string;
  message?: string;
  status?: string;
  submitterName?: string;
  submitterEmail?: string;
  commenterName?: string;
  timestamp: Date;
  read: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'notifications';
const MAX_NOTIFICATIONS = 100; // Keep last 100 notifications

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>, dbId?: string, readStatus?: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Load notifications from localStorage on mount
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        return parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load notifications from localStorage:', error);
    }
    return [];
  });

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
      } catch (error) {
        console.error('Failed to save notifications to localStorage:', error);
      }
    }
  }, [notifications]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>, dbId?: string, readStatus?: boolean) => {
    setNotifications((prev) => {
      // CRITICAL: Check if notifications were recently cleared
      // If they were cleared within the last 30 seconds, don't add new ones from database
      if (typeof window !== 'undefined' && dbId) {
        const clearedTimestamp = localStorage.getItem('notifications_cleared');
        if (clearedTimestamp) {
          const timestamp = parseInt(clearedTimestamp, 10);
          const now = Date.now();
          const timeSinceCleared = now - timestamp;
          const THIRTY_SECONDS = 30 * 1000;
          
          if (!isNaN(timestamp) && timeSinceCleared < THIRTY_SECONDS) {
            console.log(`📋 Notifications were cleared ${Math.round(timeSinceCleared / 1000)}s ago, skipping add from database`);
            return prev; // Don't add notifications if they were recently cleared
          }
        }
        
        // CRITICAL: Check if notifications were recently marked as read
        // If they were marked as read within the last 5 seconds, don't overwrite with unread status
        const markedReadTimestamp = localStorage.getItem('notifications_marked_read');
        if (markedReadTimestamp) {
          const timestamp = parseInt(markedReadTimestamp, 10);
          const now = Date.now();
          const timeSinceMarked = now - timestamp;
          const FIVE_SECONDS = 5 * 1000;
          
          if (!isNaN(timestamp) && timeSinceMarked < FIVE_SECONDS) {
            // If we're trying to add a notification with read=false, but we just marked all as read, skip it
            if (readStatus === false) {
              console.log(`📋 Notifications were marked as read ${Math.round(timeSinceMarked / 1000)}s ago, skipping unread notification from database`);
              return prev;
            }
          }
        }
      }

      // If this is a database notification with an ID, check if it already exists by ID first
      // This is the most reliable way to prevent duplicates from database
      if (dbId && /^[0-9a-fA-F]{24}$/.test(dbId)) {
        const existingIndex = prev.findIndex((n) => n.id === dbId);
        if (existingIndex !== -1) {
          // Notification exists - CRITICAL: Don't overwrite read=true with read=false
          // If local state has it as read=true, keep it as read=true even if database says false
          // This prevents race conditions where database hasn't updated yet
          if (readStatus !== undefined && prev[existingIndex].read !== readStatus) {
            // Only update if we're marking as read (true), not if we're marking as unread (false)
            // This prevents database fetches from overwriting our "mark all as read" action
            if (readStatus === true || prev[existingIndex].read === false) {
              console.log(`📋 Updating read status for notification ${dbId} to ${readStatus}`);
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], read: readStatus };
              return updated;
            } else {
              // Local state has read=true, database has read=false - keep local state (read=true)
              console.log(`📋 Keeping notification ${dbId} as read=true (database may be stale)`);
              return prev;
            }
          }
          console.log(`📋 Notification ${dbId} already exists, skipping`);
          return prev; // Already exists, don't add again
        }
      }

      // Check if an identical notification already exists (same type, complaintId, message, and commenter)
      // Use a shorter time window (1 minute) to catch duplicates that arrive almost simultaneously
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      
      const isDuplicate = prev.some((n) => {
        // Skip database ID check here since we already checked above
        const notificationTime = n.timestamp.getTime();
        const isRecent = notificationTime > oneMinuteAgo;
        const sameType = n.type === notification.type;
        const sameComplaint = n.complaintId === notification.complaintId;
        
        // For comments, check message and commenter name match exactly
        if (notification.type === 'new_comment') {
          const sameMessage = n.message === notification.message;
          const sameCommenter = n.commenterName === notification.commenterName;
          if (isRecent && sameType && sameComplaint && sameMessage && sameCommenter) {
            return true;
          }
        } else {
          // For other types, check type and complaintId
          if (isRecent && sameType && sameComplaint) {
            return true;
          }
        }
        
        return false;
      });

      if (isDuplicate) {
        return prev;
      }

      const newNotification: Notification = {
        ...notification,
        id: dbId || `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        read: readStatus !== undefined ? readStatus : false, // Use provided read status or default to false
      };
      return [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
    });
  };

  const markAsRead = async (id: string) => {
    // Update local state immediately for better UX
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Sync with database if this is a database notification (MongoDB ObjectId format: 24 hex chars)
    if (typeof window !== 'undefined' && /^[0-9a-fA-F]{24}$/.test(id)) {
      type ApiResponse = { status: number; statusText: string; json: () => Promise<any> };
      let response: ApiResponse | null = null;
      try {
        console.log('📤 Marking notification as read:', id);
        
        // Use apiRequest utility which handles authentication automatically
        // apiRequest throws on error, so we catch it and handle it
        try {
          response = await apiRequest('/api/notifications', {
            method: 'PUT',
            body: JSON.stringify({ notificationIds: [id] }),
          });
          
          // Success - parse and log response
          console.log('✅ Response is OK, status:', response.status);
          try {
            const result = await response.json();
            console.log('✅ Success response parsed:', result);
            if (result.count !== undefined) {
              console.log(`✅ Marked notification ${id} as read (count: ${result.count})`);
            }
            if (result.message) {
              console.log(`✅ Success message: ${result.message}`);
            }
          } catch (parseError) {
            console.warn('⚠️ Could not parse success response as JSON:', parseError);
          }
        } catch (apiError: any) {
          // apiRequest throws an error for non-OK responses (like 401 Unauthorized)
          console.error('❌ Failed to mark notification as read:', {
            error: apiError.message || apiError,
            notificationId: id,
            errorType: apiError.name,
          });
          
          // Revert local state if API call failed
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: false } : n))
          );
          
          // Don't continue with the old error handling code below
          return;
        }
        
      } catch (error: any) {
        console.error('❌ Network/fetch error when marking notification as read:', {
          error: error.message || error,
          errorName: error.name,
          notificationId: id,
          stack: error.stack,
          response: response ? {
            status: (response as any).status,
            statusText: (response as any).statusText,
          } : null,
        });
        // Revert local state if API call failed
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: false } : n))
        );
      }
    } else {
      console.log('⏭️ Skipping API call for non-database notification ID:', id);
    }
  };

  const markAllAsRead = async () => {
    console.log('🔄 markAllAsRead called');
    
    // CRITICAL: Set a flag to prevent database fetches from overwriting our changes
    if (typeof window !== 'undefined') {
      const timestamp = Date.now();
      localStorage.setItem('notifications_marked_read', timestamp.toString());
      console.log('📋 Set notifications_marked_read flag with timestamp:', timestamp);
    }
    
    // Update local state immediately for better UX
    let previousNotifications: Notification[] = [];
    let updatedNotifications: Notification[] = [];
    setNotifications((prev) => {
      previousNotifications = [...prev];
      updatedNotifications = prev.map((n) => ({ ...n, read: true }));
      console.log(`📋 Updated ${updatedNotifications.length} notifications to read=true`);
      return updatedNotifications;
    });
    
    // CRITICAL: Update localStorage immediately to prevent race conditions
    // The useEffect will also update it, but we do it here to ensure consistency
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedNotifications));
        console.log('📋 Updated localStorage with all notifications marked as read');
      } catch (error) {
        console.error('Failed to update localStorage:', error);
        throw new Error('Failed to update localStorage');
      }
    }
    
    // Sync with database - mark all database notifications as read
    if (typeof window !== 'undefined') {
      try {
        console.log('📤 Calling API to mark all notifications as read');
        // Use markAllAsRead flag to mark all unread notifications as read in database
        const response = await apiRequest('/api/notifications', {
          method: 'PUT',
          body: JSON.stringify({ markAllAsRead: true }),
        });
        
        const result = await response.json();
        console.log(`✅ Marked all notifications as read (count: ${result.count || 0})`);
        
        // Clear the flag after successful update (give it 5 seconds to prevent race conditions)
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('notifications_marked_read');
            console.log('📋 Cleared notifications_marked_read flag');
          }
        }, 5000);
      } catch (error: any) {
        console.error('❌ Failed to mark all notifications as read in database:', {
          error: error.message || error,
          errorType: error.name,
          stack: error.stack,
        });
        
        // Remove the flag if API call failed
        if (typeof window !== 'undefined') {
          localStorage.removeItem('notifications_marked_read');
        }
        
        // Revert local state if API call failed
        setNotifications(previousNotifications);
        
        // Revert localStorage if API call failed
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(previousNotifications));
          } catch (storageError) {
            console.error('Failed to revert localStorage:', storageError);
          }
        }
        
        // Re-throw the error so the UI can show it
        throw error;
      }
    }
  };

  const clearNotification = async (id: string) => {
    // Store the notification to restore if deletion fails
    let notificationToRestore: Notification | null = null;
    setNotifications((prev) => {
      notificationToRestore = prev.find((n) => n.id === id) || null;
      return prev.filter((n) => n.id !== id);
    });

    // Delete from database if this is a database notification (MongoDB ObjectId format: 24 hex chars)
    if (typeof window !== 'undefined' && /^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        await apiRequest('/api/notifications', {
          method: 'DELETE',
          body: JSON.stringify({ notificationIds: [id] }),
        });
        console.log(`✅ Deleted notification ${id} from database`);
      } catch (error: any) {
        console.error('❌ Failed to delete notification from database:', {
          error: error.message || error,
          notificationId: id,
        });
        // Re-add to local state if API call failed
        if (notificationToRestore) {
          setNotifications((prev) => [notificationToRestore!, ...prev]);
        }
        throw error; // Re-throw to let the caller handle it
      }
    }
  };

  const clearAll = async () => {
    console.log('🔄 clearAll called');
    
    // Store previous state in case we need to revert
    let previousNotifications: Notification[] = [];
    setNotifications((prev) => {
      previousNotifications = [...prev];
      console.log(`📋 Clearing ${previousNotifications.length} notifications from local state`);
      return [];
    });

    // CRITICAL: Also clear localStorage to prevent notifications from being restored on refresh
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
        console.log('📋 Cleared notifications from localStorage');
      } catch (error) {
        console.error('Failed to clear notifications from localStorage:', error);
        throw new Error('Failed to clear localStorage');
      }
      
      // Set a flag in localStorage to prevent re-fetching from database
      // Include timestamp so we can check if it's still valid
      const timestamp = Date.now();
      localStorage.setItem('notifications_cleared', timestamp.toString());
      console.log('📋 Set notifications_cleared flag with timestamp:', timestamp);
    }

    // Delete all from database
    if (typeof window !== 'undefined') {
      try {
        console.log('📤 Calling API to delete all notifications');
        // Delete all database notifications for this user using apiRequest
        const response = await apiRequest('/api/notifications', {
          method: 'DELETE',
          body: JSON.stringify({ deleteAll: true }),
        });
        
        const result = await response.json();
        console.log(`✅ Cleared all notifications (deleted ${result.count || 0} from database)`);
        
        // Keep the flag set - it will be cleared after 30 seconds in use-notifications.tsx
      } catch (error: any) {
        console.error('❌ Failed to delete all notifications from database:', {
          error: error.message || error,
          errorType: error.name,
          stack: error.stack,
        });
        
        // Revert local state if deletion failed
        setNotifications(previousNotifications);
        
        // Remove the flag if deletion failed
        if (typeof window !== 'undefined') {
          localStorage.removeItem('notifications_cleared');
          // Restore localStorage if deletion failed
          try {
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(previousNotifications));
          } catch (storageError) {
            console.error('Failed to restore notifications to localStorage:', storageError);
          }
        }
        
        // Re-throw the error so the UI can show it
        throw error;
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    // Return a no-op implementation if context is not available
    return {
      notifications: [],
      unreadCount: 0,
      addNotification: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearNotification: () => {},
      clearAll: () => {},
    };
  }
  return context;
}

