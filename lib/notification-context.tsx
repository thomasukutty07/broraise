'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Notification {
  id: string;
  type: 'new_complaint' | 'complaint_assigned' | 'complaint_updated' | 'new_comment' | 'status_changed';
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
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
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

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications((prev) => {
      // Check if an identical notification already exists (same type, complaintId, message, and commenter)
      // Use a shorter time window (1 minute) to catch duplicates that arrive almost simultaneously
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      
      const isDuplicate = prev.some((n) => {
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
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        read: false,
      };
      return [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
    });
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Sync with database if this is a database notification (MongoDB ObjectId format: 24 hex chars)
    if (typeof window !== 'undefined' && /^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notificationIds: [id] }),
        });
      } catch (error) {
        console.error('Failed to mark notification as read in database:', error);
      }
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      
      // Sync with database - mark all database notifications as read
      if (typeof window !== 'undefined') {
        const dbNotificationIds = prev
          .filter((n) => /^[0-9a-fA-F]{24}$/.test(n.id))
          .map((n) => n.id);
        
        if (dbNotificationIds.length > 0) {
          fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ notificationIds: dbNotificationIds }),
          }).catch((error) => {
            console.error('Failed to mark notifications as read in database:', error);
          });
        }
        
        // Also mark all as read in database (for any notifications we might have missed)
        fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ markAllAsRead: true }),
        }).catch((error) => {
          console.error('Failed to mark all notifications as read in database:', error);
        });
      }
      
      return updated;
    });
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
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

