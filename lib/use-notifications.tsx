'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, UserCheck, MessageSquare, CheckCircle2, Bell } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface NotificationData {
  type: 'new_complaint' | 'complaint_assigned' | 'complaint_updated' | 'new_comment' | 'status_changed' | 'reminder_due';
  complaintId: string;
  title: string;
  message?: string;
  status?: string;
  submitterName?: string;
  submitterEmail?: string;
  commenterName?: string;
  commenterId?: string; // Add commenter ID to filter out own comments
  reminderId?: string; // Optional reminder id to allow suppression after delete/dismiss
}

const POLL_INTERVAL = 5000; // 5 seconds fallback polling
const LAST_SEEN_KEY = 'lastSeenComplaint';

// Create a reusable audio context (will be initialized on first user interaction)
let audioContextInstance: AudioContext | null = null;
let audioContextInitialized = false;

// Initialize audio context on user interaction
const initAudioContext = () => {
  if (!audioContextInstance && typeof window !== 'undefined') {
    try {
      audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextInitialized = true;
    } catch (error) {
      console.error('Failed to create audio context:', error);
    }
  }
};

// Initialize audio context on any user interaction
if (typeof window !== 'undefined') {
  const initOnInteraction = () => {
    initAudioContext();
    // Remove listeners after initialization
    window.removeEventListener('click', initOnInteraction);
    window.removeEventListener('keydown', initOnInteraction);
    window.removeEventListener('touchstart', initOnInteraction);
  };
  window.addEventListener('click', initOnInteraction, { once: true });
  window.addEventListener('keydown', initOnInteraction, { once: true });
  window.addEventListener('touchstart', initOnInteraction, { once: true });
}

// Function to play beep sound
const playBeepSound = async () => {
  try {
    // Initialize audio context if not already done
    if (!audioContextInstance) {
      initAudioContext();
    }

    if (!audioContextInstance) {
      console.warn('Audio context not available');
      return;
    }

    // Resume audio context if suspended (required by browser autoplay policies)
    if (audioContextInstance.state === 'suspended') {
      await audioContextInstance.resume();
    }

    const playBeep = (delay: number = 0) => {
      setTimeout(() => {
        try {
          const oscillator = audioContextInstance!.createOscillator();
          const gainNode = audioContextInstance!.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContextInstance!.destination);

          // Configure beep sound (800Hz frequency, 0.2 seconds duration)
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContextInstance!.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextInstance!.currentTime + 0.2);

          oscillator.start(audioContextInstance!.currentTime);
          oscillator.stop(audioContextInstance!.currentTime + 0.2);
        } catch (error) {
          console.error('Failed to play beep:', error);
        }
      }, delay);
    };

    // Play beep 3 times with slight delay
    playBeep(0);
    playBeep(250);
    playBeep(500);
  } catch (error) {
    console.error('Failed to play beep sound:', error);
  }
};

export function useNotifications() {
  const { user, token } = useAuth();
  const { socket, isConnected } = useSocket();
  const { addNotification } = useNotificationContext();
  const lastSeenRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const fetchedDBNotificationsRef = useRef(false);
  // Track recently processed events to prevent duplicates
  const processedEventsRef = useRef<Map<string, number>>(new Map());
  
  // Debug: Log user and socket info
  useEffect(() => {
    if (user) {
      console.log('🔔 useNotifications initialized - User ID:', user.id, 'Socket connected:', isConnected, 'Socket ID:', socket?.id);
      console.log('🔔 Expected socket room:', `user:${user.id}`);
    }
  }, [user?.id, isConnected, socket?.id]);
  // State for reminder dialog
  const [reminderDialog, setReminderDialog] = useState<{
    open: boolean;
    title: string;
    message?: string;
    complaintId: string;
    reminderId?: string;
  }>({
    open: false,
    title: '',
    message: '',
    complaintId: '',
  });

  // Local suppression of already handled/deleted reminders
  const getSuppressedReminderIds = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('suppressed_reminders');
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  };
  const suppressReminderId = (id?: string) => {
    if (!id || typeof window === 'undefined') return;
    const set = getSuppressedReminderIds();
    set.add(id);
    localStorage.setItem('suppressed_reminders', JSON.stringify(Array.from(set)));
  };

  // Initialize last seen from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      lastSeenRef.current = localStorage.getItem(LAST_SEEN_KEY);
    }
  }, []);

  // Reset fetch flag when user changes
  // BUT: Don't reset if notifications were recently cleared
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const clearedTimestamp = localStorage.getItem('notifications_cleared');
      if (clearedTimestamp) {
        const timestamp = parseInt(clearedTimestamp, 10);
        const now = Date.now();
        const timeSinceCleared = now - timestamp;
        const THIRTY_SECONDS = 30 * 1000;
        
        // If notifications were cleared recently, don't reset the flag
        if (!isNaN(timestamp) && timeSinceCleared < THIRTY_SECONDS) {
          console.log('📋 Notifications were cleared, keeping fetch flag set');
          fetchedDBNotificationsRef.current = true;
          return;
        }
      }
    }
    fetchedDBNotificationsRef.current = false;
  }, [user?.id]);

  // Fetch unread notifications from database when user logs in
  useEffect(() => {
    if (!user || fetchedDBNotificationsRef.current) {
      return;
    }

    // Check if notifications were cleared BEFORE fetching
    // This check must happen synchronously to prevent race conditions
    if (typeof window !== 'undefined') {
      const clearedTimestamp = localStorage.getItem('notifications_cleared');
      if (clearedTimestamp) {
        // Check if the timestamp is still valid (within last 30 seconds)
        const timestamp = parseInt(clearedTimestamp, 10);
        const now = Date.now();
        const timeSinceCleared = now - timestamp;
        const THIRTY_SECONDS = 30 * 1000;
        
        if (!isNaN(timestamp) && timeSinceCleared < THIRTY_SECONDS) {
          console.log('📋 Notifications were cleared', Math.round(timeSinceCleared / 1000), 'seconds ago, skipping fetch');
          // Notifications were cleared recently, don't re-fetch
          fetchedDBNotificationsRef.current = true;
          
          // Clear the flag after the remaining time (or immediately if > 30 seconds)
          const remainingTime = Math.max(0, THIRTY_SECONDS - timeSinceCleared);
          if (remainingTime > 0) {
            setTimeout(() => {
              localStorage.removeItem('notifications_cleared');
              console.log('📋 Cleared notifications_cleared flag after timeout');
            }, remainingTime);
          } else {
            // Already past 30 seconds, clear immediately
            localStorage.removeItem('notifications_cleared');
          }
          return; // Don't fetch if notifications were cleared
        } else {
          // Timestamp is invalid or expired, remove it
          localStorage.removeItem('notifications_cleared');
        }
      }
    }

    const fetchDatabaseNotifications = async () => {
      try {
        // Double-check the flag before making the API call (in case it was set between checks)
        if (typeof window !== 'undefined') {
          const clearedTimestamp = localStorage.getItem('notifications_cleared');
          if (clearedTimestamp) {
            const timestamp = parseInt(clearedTimestamp, 10);
            const now = Date.now();
            const timeSinceCleared = now - timestamp;
            const THIRTY_SECONDS = 30 * 1000;
            
            if (!isNaN(timestamp) && timeSinceCleared < THIRTY_SECONDS) {
              console.log('📋 Notifications were cleared, skipping fetch (double-check)');
              fetchedDBNotificationsRef.current = true;
              return;
            }
          }
          
          // CRITICAL: Check if notifications were recently marked as read
          // Don't fetch if we just marked all as read (within last 5 seconds)
          const markedReadTimestamp = localStorage.getItem('notifications_marked_read');
          if (markedReadTimestamp) {
            const timestamp = parseInt(markedReadTimestamp, 10);
            const now = Date.now();
            const timeSinceMarked = now - timestamp;
            const FIVE_SECONDS = 5 * 1000;
            
            if (!isNaN(timestamp) && timeSinceMarked < FIVE_SECONDS) {
              console.log('📋 Notifications were marked as read, skipping fetch to prevent overwrite');
              fetchedDBNotificationsRef.current = true;
              return;
            }
          }
        }
        
        // Fetch ALL notifications (not just unread) to sync read status
        // We need all notifications to update their read status in local state
        const response = await apiRequest('/api/notifications?limit=100', {
          method: 'GET',
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const dbNotifications = data.notifications || [];

        console.log(`📥 Fetched ${dbNotifications.length} notifications from database`);

        if (dbNotifications.length > 0) {
          
          // Filter out notifications where user is the commenter (for comment notifications)
          const filteredNotifications = dbNotifications.filter((n: any) => {
            if (n.type === 'new_comment' && n.commenterId && n.commenterId === user.id) {
              return false; // Skip own comments
            }
            return true;
          });

          console.log(`📥 Adding ${filteredNotifications.length} filtered notifications to context`);

          // Add each notification to the context, but only if it doesn't already exist
          // This prevents re-adding notifications that were cleared
          // IMPORTANT: Use the database ID as the notification ID to ensure uniqueness
          filteredNotifications.forEach((notification: any) => {
            // Pass the database ID as the second parameter and read status as the third
            // The addNotification function will check if a notification with this ID already exists
            // CRITICAL: Pass the read status from database to preserve it
            addNotification({
              type: notification.type,
              complaintId: notification.complaintId,
              title: notification.title,
              message: notification.message,
              status: notification.status,
              submitterName: notification.submitterName,
              submitterEmail: notification.submitterEmail,
              commenterName: notification.commenterName,
            }, notification.id, notification.read); // Pass the database ID and read status
          });

        } else {
          console.log('📥 No notifications found in database');
        }

        fetchedDBNotificationsRef.current = true;
      } catch (error: any) {
        console.error('❌ Error fetching database notifications:', error.message);
        // Don't block the app if fetching fails
      }
    };

    // Fetch after a short delay to ensure user context is fully loaded
    const timeoutId = setTimeout(fetchDatabaseNotifications, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user, addNotification]);

  // Fallback polling mechanism when Socket.io is not available
  // ONLY for admin/management roles - students don't need polling
  useEffect(() => {
    // Only use polling if Socket.io is not connected AND user is admin/management
    // Students should only use Socket.io, not polling
    if (!user) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Skip polling for students - they only use Socket.io
    if (user.role === 'student' || user.role === 'staff') {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Only use polling if Socket.io is not connected AND user is admin/management
    if (isConnected) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }


    const checkNewComplaints = async () => {
      try {
        // Use fetch directly to avoid SSL issues with apiRequest
        const response = await fetch('/api/complaints?limit=1', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          return;
        }
        
        const data = await response.json();
        
        if (data.complaints && data.complaints.length > 0) {
          const latestComplaint = data.complaints[0];
          const latestId = latestComplaint._id || latestComplaint.id;

          // Skip on first load
          if (!isInitializedRef.current) {
            lastSeenRef.current = latestId;
            if (typeof window !== 'undefined') {
              localStorage.setItem(LAST_SEEN_KEY, latestId);
            }
            isInitializedRef.current = true;
            return;
          }

          // Check if this is a new complaint
          if (lastSeenRef.current && latestId !== lastSeenRef.current) {
            const createdAt = new Date(latestComplaint.createdAt).getTime();
            const now = Date.now();
            const fiveMinutesAgo = now - 5 * 60 * 1000;

            if (createdAt > fiveMinutesAgo) {
              const submitterName = latestComplaint.submittedBy?.name || 'Unknown';
              const submitterEmail = latestComplaint.submittedBy?.email || '';
              
              // Add to notification context
              addNotification({
                type: 'new_complaint',
                complaintId: latestId,
                title: latestComplaint.title,
                submitterName,
                submitterEmail,
              });
              
              toast.success(
                <div className="flex flex-col gap-1.5">
                  <div className="font-semibold">New Complaint Received</div>
                  <div className="text-sm font-medium">{latestComplaint.title}</div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Student: <span className="font-medium">{submitterName}</span></div>
                    {submitterEmail && (
                      <div>Email: <span className="font-medium">{submitterEmail}</span></div>
                    )}
                  </div>
                </div>,
                {
                  icon: <FileText className="size-4" />,
                  action: {
                    label: 'View',
                    onClick: () => window.location.href = `/complaints/${latestId}`,
                  },
                  duration: 7000,
                }
              );
            }
            
            lastSeenRef.current = latestId;
            if (typeof window !== 'undefined') {
              localStorage.setItem(LAST_SEEN_KEY, latestId);
            }
          }
        }
      } catch (error: any) {
        // Silently fail - don't spam console with polling errors
        // Only log if it's not an SSL/network error
        if (error?.message && !error.message.includes('SSL') && !error.message.includes('network')) {
        }
      }
    };

    // Initial check
    const initialTimeout = setTimeout(checkNewComplaints, 2000);
    
    // Set up polling
    pollingIntervalRef.current = setInterval(checkNewComplaints, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user, isConnected]);

  // Create stable handler functions using useCallback
  const handleNewComment = useCallback((data: NotificationData) => {
    if (!user) {
      console.error('❌ handleNewComment: No user available');
      return;
    }
    
    // Create a unique key for this event to prevent duplicate processing
    const eventKey = `${data.complaintId}-${data.message || ''}-${data.commenterName || ''}`;
    const now = Date.now();
    
    // Check if we've processed this exact event in the last 2 seconds
    const lastProcessed = processedEventsRef.current.get(eventKey);
    if (lastProcessed && (now - lastProcessed) < 2000) {
      return;
    }
    
    // Mark this event as processed
    processedEventsRef.current.set(eventKey, now);
    
    // Clean up old entries (older than 10 seconds)
    for (const [key, timestamp] of processedEventsRef.current.entries()) {
      if (now - timestamp > 10000) {
        processedEventsRef.current.delete(key);
      }
    }
    
    // Only show notifications to admin, management, and students, not staff
    if (user.role === 'staff') {
      return;
    }

    // Don't show notification if the current user is the one who made the comment
    if (data.commenterId && data.commenterId === user.id) {
      return;
    }

    // Log for debugging
    console.log('📨 New comment notification received:', {
      commenterId: data.commenterId,
      userId: user.id,
      role: user.role,
      complaintId: data.complaintId,
    });

    // Add to notification context
    try {
      addNotification({
        type: 'new_comment',
        complaintId: data.complaintId,
        title: data.title,
        message: data.message,
        commenterName: data.commenterName,
      });
    } catch (error) {
      console.error('❌ Failed to add notification to context:', error);
    }

    try {
      toast.success(
        <div className="flex flex-col gap-1.5">
          <div className="font-semibold">New Comment</div>
          <div className="text-sm font-medium">{data.title}</div>
          {data.commenterName && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">From:</span> {data.commenterName}
            </div>
          )}
          {data.message && (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{data.message}</div>
          )}
        </div>,
        {
          icon: <MessageSquare className="size-4" />,
          action: {
            label: 'View',
            onClick: () => window.location.href = `/complaints/${data.complaintId}`,
          },
          duration: 7000,
        }
      );
    } catch (error) {
      console.error('❌ Failed to show toast:', error);
    }
  }, [user, addNotification]);

  // Create stable handler for reminder due using useCallback
  const handleReminderDue = useCallback((data: NotificationData) => {
    console.log('🔔 handleReminderDue called with data:', data);
    
    // Skip if this reminder was suppressed (deleted/dismissed)
    if (data.reminderId) {
      const suppressed = getSuppressedReminderIds();
      if (suppressed.has(data.reminderId)) {
        console.log('🔕 Reminder suppressed, skipping:', data.reminderId);
        return;
      }
    }

    // Create a unique key for this event to prevent duplicate processing
    const eventKey = `${data.reminderId || data.complaintId}-reminder_due-${data.message || ''}`;
    const now = Date.now();
    
    // Check if we've processed this exact event in the last 2 seconds
    const lastProcessed = processedEventsRef.current.get(eventKey);
    if (lastProcessed && (now - lastProcessed) < 2000) {
      console.log('📋 Duplicate reminder_due event detected, skipping');
      return;
    }
    
    // Mark this event as processed
    processedEventsRef.current.set(eventKey, now);
    
    // Clean up old entries (older than 10 seconds)
    for (const [key, timestamp] of processedEventsRef.current.entries()) {
      if (now - timestamp > 10000) {
        processedEventsRef.current.delete(key);
      }
    }

    // Add to notification context
    addNotification({
      type: 'reminder_due',
      complaintId: data.complaintId,
      title: data.title,
      message: data.message,
    });
    
    console.log('🔔 Setting reminder dialog state:', {
      open: true,
      title: data.title,
      message: data.message,
      complaintId: data.complaintId,
    });
    
    // Initialize audio context if needed (dialog opening counts as user interaction)
    if (!audioContextInstance) {
      initAudioContext();
    }
    
    // Play beep sound
    playBeepSound();
    
    // Show dialog popup - use functional update to ensure we get latest state
    setReminderDialog(prev => {
      const newState = {
        open: true,
        title: data.title || 'Reminder Due',
        message: data.message,
        complaintId: data.complaintId,
        reminderId: data.reminderId,
      };
      console.log('🔔 Setting dialog state from', prev, 'to', newState);
      return newState;
    });
    
    console.log('🔔 Reminder dialog state set, should be visible now');
    
    // Also show toast notification
    toast.warning(
      <div className="flex flex-col gap-1">
        <div className="font-semibold">Reminder Due</div>
        <div className="text-sm text-muted-foreground">{data.title}</div>
        {data.message && (
          <div className="text-xs text-muted-foreground">{data.message}</div>
        )}
      </div>,
      {
        icon: <Bell className="size-4" />,
        action: {
          label: 'View',
          onClick: () => window.location.href = `/complaints/${data.complaintId}`,
        },
        duration: 10000, // Show for 10 seconds
      }
    );
  }, [addNotification]);

  // Staff fallback: poll for due reminders and trigger dialog (in case server-side checker isn't running)
  useEffect(() => {
    if (!user || user.role !== 'staff') {
      return;
    }
    let isCancelled = false;

    const checkDueReminders = async () => {
      try {
        if (!token) {
          return;
        }
        const response = await fetch('/api/reminders', {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
        if (!response.ok) return;
        const reminders = await response.json();
        const now = Date.now();
        // Expect array; guard if API shape differs
        if (!Array.isArray(reminders)) return;

        for (const r of reminders) {
          // Skip if suppressed locally
          const suppressed = getSuppressedReminderIds();
          if (r._id && suppressed.has(String(r._id))) {
            continue;
          }
          // Only consider not completed reminders
          if (r.isCompleted) continue;
          if (r.status && r.status !== 'pending') continue;
          const reminderTime = new Date(r.reminderDate).getTime();
          if (isNaN(reminderTime)) continue;
          if (reminderTime > now) continue;

          // Prevent duplicates for the same reminder id
          const key = `reminder_poll_${r._id}`;
          const lastProcessed = processedEventsRef.current.get(key);
          if (lastProcessed && now - lastProcessed < 60_000) {
            continue;
          }
          processedEventsRef.current.set(key, now);

          // Build handler payload
          const complaintId =
            (r.complaint && (r.complaint._id || r.complaint.id)) || r.complaintId || '';
          const complaintTitle =
            (r.complaint && (r.complaint.title || r.complaint.name)) || 'Complaint';

          if (!isCancelled) {
            handleReminderDue({
              type: 'reminder_due',
              complaintId,
              title: `Reminder: ${complaintTitle}`,
              message: r.message,
              reminderId: String(r._id || ''),
            } as NotificationData);
          }
        }
      } catch {
        // Silent fail
      }
    };

    // Initial run quickly, then poll
    const initial = setTimeout(checkDueReminders, 2000);
    const interval = setInterval(checkDueReminders, 15_000);
    return () => {
      isCancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [user, handleReminderDue]);

  // Socket.io real-time notifications
  useEffect(() => {
    if (!socket || !user) {
      if (!socket) {
      }
      return;
    }


    // Define handlers outside registerListeners so they're accessible for cleanup
    // Handle new complaint notification (for admins and management)
    const handleNewComplaint = (data: NotificationData) => {
      if (user.role !== 'admin' && user.role !== 'management') {
        return;
      }

      // Create a unique key for this event to prevent duplicate processing
      const eventKey = `${data.complaintId}-new_complaint`;
      const now = Date.now();
      
      // Check if we've processed this exact event in the last 2 seconds
      const lastProcessed = processedEventsRef.current.get(eventKey);
      if (lastProcessed && (now - lastProcessed) < 2000) {
        console.log('📋 Duplicate new_complaint event detected, skipping');
        return;
      }
      
      // Mark this event as processed
      processedEventsRef.current.set(eventKey, now);
      
      // Clean up old entries (older than 10 seconds)
      for (const [key, timestamp] of processedEventsRef.current.entries()) {
        if (now - timestamp > 10000) {
          processedEventsRef.current.delete(key);
        }
      }
        
      // Add to notification context
      addNotification({
        type: 'new_complaint',
        complaintId: data.complaintId,
        title: data.title,
        submitterName: data.submitterName,
        submitterEmail: data.submitterEmail,
      });
      
      toast.success(
        <div className="flex flex-col gap-1.5">
          <div className="font-semibold">New Complaint Received</div>
          <div className="text-sm font-medium">{data.title}</div>
          {data.submitterName && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Student: <span className="font-medium">{data.submitterName}</span></div>
              {data.submitterEmail && (
                <div>Email: <span className="font-medium">{data.submitterEmail}</span></div>
              )}
            </div>
          )}
        </div>,
        {
          icon: <FileText className="size-4" />,
          action: {
            label: 'View',
            onClick: () => window.location.href = `/complaints/${data.complaintId}`,
          },
          duration: 7000,
        }
      );
    };

    // Handle complaint assigned notification (for staff)
    const handleComplaintAssigned = (data: NotificationData) => {
      if (user.role !== 'staff' || !data.complaintId) {
        return;
      }

      // Create a unique key for this event to prevent duplicate processing
      const eventKey = `${data.complaintId}-complaint_assigned`;
      const now = Date.now();
      
      // Check if we've processed this exact event in the last 2 seconds
      const lastProcessed = processedEventsRef.current.get(eventKey);
      if (lastProcessed && (now - lastProcessed) < 2000) {
        console.log('📋 Duplicate complaint_assigned event detected, skipping');
        return;
      }
      
      // Mark this event as processed
      processedEventsRef.current.set(eventKey, now);
      
      // Clean up old entries (older than 10 seconds)
      for (const [key, timestamp] of processedEventsRef.current.entries()) {
        if (now - timestamp > 10000) {
          processedEventsRef.current.delete(key);
        }
      }

      // Add to notification context
      addNotification({
        type: 'complaint_assigned',
        complaintId: data.complaintId,
        title: data.title,
      });
      
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-semibold">New Complaint Assigned</div>
          <div className="text-sm text-muted-foreground">{data.title}</div>
        </div>,
        {
          icon: <UserCheck className="size-4" />,
          action: {
            label: 'View',
            onClick: () => window.location.href = `/complaints/${data.complaintId}`,
          },
          duration: 5000,
        }
      );
    };

    // Handle complaint status update notification
    const handleComplaintUpdated = (data: NotificationData) => {
      if (!data.status) {
        return;
      }

      // Create a unique key for this event to prevent duplicate processing
      const eventKey = `${data.complaintId}-complaint_updated-${data.status}`;
      const now = Date.now();
      
      // Check if we've processed this exact event in the last 2 seconds
      const lastProcessed = processedEventsRef.current.get(eventKey);
      if (lastProcessed && (now - lastProcessed) < 2000) {
        console.log('📋 Duplicate complaint_updated event detected, skipping');
        return;
      }
      
      // Mark this event as processed
      processedEventsRef.current.set(eventKey, now);
      
      // Clean up old entries (older than 10 seconds)
      for (const [key, timestamp] of processedEventsRef.current.entries()) {
        if (now - timestamp > 10000) {
          processedEventsRef.current.delete(key);
        }
      }

      // Add to notification context
      addNotification({
        type: 'complaint_updated',
        complaintId: data.complaintId,
        title: data.title,
        status: data.status,
      });
      
      const statusMessages: Record<string, string> = {
        'in-progress': 'Complaint is now in progress',
        'resolved': 'Complaint has been resolved',
        'closed': 'Complaint has been closed',
        'open': 'Complaint has been reopened',
      };

      toast.info(
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Complaint Updated</div>
          <div className="text-sm text-muted-foreground">{data.title}</div>
          <div className="text-xs text-muted-foreground">{statusMessages[data.status] || `Status: ${data.status}`}</div>
        </div>,
        {
          icon: <CheckCircle2 className="size-4" />,
          action: {
            label: 'View',
            onClick: () => window.location.href = `/complaints/${data.complaintId}`,
          },
          duration: 5000,
        }
      );
    };

    // handleReminderDue is now defined outside useEffect using useCallback

    // Add a test listener to verify socket is working
    const testHandler = (data: any) => {
      toast.info('Test notification received!');
    };

    // Function to register listeners
    const registerListeners = () => {
      if (!socket || !socket.connected) {
        console.log('📡 Cannot register listeners - socket not connected');
        return;
      }

      // Remove any existing listeners first to avoid duplicates
      socket.off('new_complaint');
      socket.off('complaint_assigned');
      socket.off('complaint_updated');
      socket.off('new_comment');
      // Remove all reminder_due listeners
      socket.removeAllListeners('reminder_due');
      socket.off('test_event');
      
      console.log('📡 Registering socket listeners for user:', user?.id);
      console.log('📡 Socket connected:', socket.connected);
      console.log('📡 Socket ID:', socket.id);
      
      // Register new listeners
      socket.on('new_complaint', handleNewComplaint);
      socket.on('complaint_assigned', handleComplaintAssigned);
      socket.on('complaint_updated', handleComplaintUpdated);
      socket.on('new_comment', handleNewComment);
      socket.on('reminder_due', (data) => {
        console.log('🔔🔔🔔 reminder_due event received on socket:', data);
        console.log('🔔🔔🔔 Current user ID:', user?.id);
        console.log('🔔🔔🔔 Handler function:', handleReminderDue);
        
        // Handle broadcast fallback
        if (data._broadcast && data._targetUserId) {
          if (String(user?.id) !== String(data._targetUserId)) {
            console.log('🔔🔔🔔 Ignoring broadcast - not for this user');
            return;
          }
          console.log('🔔🔔🔔 Processing broadcast fallback event');
        }
        
        try {
          handleReminderDue(data);
        } catch (error) {
          console.error('❌ Error in handleReminderDue:', error);
        }
      });
      
      // Also listen for broadcast events
      socket.onAny((eventName, ...args) => {
        if (eventName === 'reminder_due') {
          console.log('🔔🔔🔔 Received reminder_due via onAny:', args);
        }
      });
      socket.on('test_event', testHandler);
      
    };

    // Register listeners immediately if socket is already connected
    if (socket.connected) {
      registerListeners();
    } else {
      // Wait for connection
      const onConnect = () => {
        registerListeners();
      };
      socket.on('connect', onConnect);
      
      // Also try after a short delay in case connect event already fired
      const timeoutId = setTimeout(() => {
        if (socket.connected) {
          registerListeners();
        }
      }, 100);

      // Cleanup
      return () => {
        clearTimeout(timeoutId);
        socket.off('connect', onConnect);
        socket.off('new_complaint', handleNewComplaint);
        socket.off('complaint_assigned', handleComplaintAssigned);
        socket.off('complaint_updated', handleComplaintUpdated);
        socket.off('new_comment', handleNewComment);
        // Remove all reminder_due listeners
      socket.removeAllListeners('reminder_due');
        socket.off('test_event', testHandler);
      };
    }

    // Cleanup for when socket is already connected
    const cleanup = () => {
      socket.off('new_complaint', handleNewComplaint);
      socket.off('complaint_assigned', handleComplaintAssigned);
      socket.off('complaint_updated', handleComplaintUpdated);
      socket.off('new_comment', handleNewComment);
      // Remove all reminder_due listeners
      socket.removeAllListeners('reminder_due');
      socket.off('test_event', testHandler);
    };

    return cleanup;
  }, [socket, user?.id, user?.role, handleNewComment, handleReminderDue, addNotification]);

  // Debug: Log dialog state changes
  useEffect(() => {
    console.log('🔔 Reminder dialog state changed:', reminderDialog);
  }, [reminderDialog]);

  // Expose test function to window for manual testing (dev only)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).testReminderDialog = () => {
        console.log('🧪 Testing reminder dialog manually');
        console.log('🧪 Current dialog state:', reminderDialog);
        const testData = {
          open: true,
          title: 'Test Reminder: Sample Complaint',
          message: 'This is a test reminder message to verify the dialog popup is working correctly.',
          complaintId: 'test-complaint-id',
        };
        console.log('🧪 Setting dialog state to:', testData);
        setReminderDialog(testData);
        playBeepSound();
        // Force a re-check after a moment
        setTimeout(() => {
          console.log('🧪 Dialog state after setting:', reminderDialog);
        }, 100);
      };
      console.log('🧪 testReminderDialog function exposed to window. Call window.testReminderDialog() to test.');
    }
  }, []);

  // Force render check
  console.log('🔔 Rendering reminder dialog with state:', reminderDialog);

  return (
    <>
      {/* Reminder Dialog Popup */}
      <Dialog open={reminderDialog.open} onOpenChange={(open) => {
        console.log('🔔 Dialog onOpenChange called:', open, 'Current state:', reminderDialog);
        setReminderDialog(prev => {
          const newState = { ...prev, open };
          console.log('🔔 Setting new dialog state:', newState);
          return newState;
        });
      }}>
        <DialogContent className="sm:max-w-[500px] z-[100]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-orange-500/10">
                <Bell className="size-6 text-orange-600 animate-pulse" />
              </div>
              <DialogTitle className="text-xl font-bold">Reminder Due!</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              {reminderDialog.title || 'You have a reminder'}
            </DialogDescription>
          </DialogHeader>
          {reminderDialog.message && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">{reminderDialog.message}</p>
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
          onClick={() => {
            // Suppress this reminder locally to prevent re-trigger
            suppressReminderId(reminderDialog.reminderId);
            setReminderDialog({ ...reminderDialog, open: false });
          }}
            >
              Dismiss
            </Button>
            <Button
              onClick={() => {
                window.location.href = `/complaints/${reminderDialog.complaintId}`;
            suppressReminderId(reminderDialog.reminderId);
                setReminderDialog({ ...reminderDialog, open: false });
              }}
            >
              View Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

