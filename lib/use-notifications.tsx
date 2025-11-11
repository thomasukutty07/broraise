'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/use-socket';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, UserCheck, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';

interface NotificationData {
  type: 'new_complaint' | 'complaint_assigned' | 'complaint_updated' | 'new_comment' | 'status_changed';
  complaintId: string;
  title: string;
  message?: string;
  status?: string;
  submitterName?: string;
  submitterEmail?: string;
  commenterName?: string;
  commenterId?: string; // Add commenter ID to filter out own comments
}

const POLL_INTERVAL = 5000; // 5 seconds fallback polling
const LAST_SEEN_KEY = 'lastSeenComplaint';

export function useNotifications() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { addNotification } = useNotificationContext();
  const lastSeenRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const fetchedDBNotificationsRef = useRef(false);
  // Track recently processed events to prevent duplicates
  const processedEventsRef = useRef<Map<string, number>>(new Map());

  // Initialize last seen from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      lastSeenRef.current = localStorage.getItem(LAST_SEEN_KEY);
    }
  }, []);

  // Reset fetch flag when user changes
  useEffect(() => {
    fetchedDBNotificationsRef.current = false;
  }, [user?.id]);

  // Fetch unread notifications from database when user logs in
  useEffect(() => {
    if (!user || fetchedDBNotificationsRef.current) {
      return;
    }

    const fetchDatabaseNotifications = async () => {
      try {
        const response = await apiRequest('/api/notifications?unreadOnly=true&limit=100', {
          method: 'GET',
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const dbNotifications = data.notifications || [];

        if (dbNotifications.length > 0) {
          
          // Filter out notifications where user is the commenter (for comment notifications)
          const filteredNotifications = dbNotifications.filter((n: any) => {
            if (n.type === 'new_comment' && n.commenterId && n.commenterId === user.id) {
              return false; // Skip own comments
            }
            return true;
          });

          // Add each notification to the context
          filteredNotifications.forEach((notification: any) => {
            addNotification({
              type: notification.type,
              complaintId: notification.complaintId,
              title: notification.title,
              message: notification.message,
              status: notification.status,
              submitterName: notification.submitterName,
              submitterEmail: notification.submitterEmail,
              commenterName: notification.commenterName,
            });
          });

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
    
    // Only show notifications to admin and students, not staff
    if (user.role === 'staff') {
      return;
    }

    // Don't show notification if the current user is the one who made the comment
    if (data.commenterId && data.commenterId === user.id) {
      return;
    }

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
      toast.info(
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
      if (user.role === 'admin' || user.role === 'management') {
        
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
      }
    };

    // Handle complaint assigned notification (for staff)
    const handleComplaintAssigned = (data: NotificationData) => {
      if (user.role === 'staff' && data.complaintId) {
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
      }
    };

    // Handle complaint status update notification
    const handleComplaintUpdated = (data: NotificationData) => {
      if (data.status) {
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
      }
    };

    // Add a test listener to verify socket is working
    const testHandler = (data: any) => {
      toast.info('Test notification received!');
    };

    // Function to register listeners
    const registerListeners = () => {
      if (!socket || !socket.connected) {
        return;
      }

      // Remove any existing listeners first to avoid duplicates
      socket.off('new_complaint');
      socket.off('complaint_assigned');
      socket.off('complaint_updated');
      socket.off('new_comment');
      socket.off('test_event');
      
      // Register new listeners
      socket.on('new_complaint', handleNewComplaint);
      socket.on('complaint_assigned', handleComplaintAssigned);
      socket.on('complaint_updated', handleComplaintUpdated);
      
      socket.on('new_comment', handleNewComment);
      
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
        socket.off('test_event', testHandler);
      };
    }

    // Cleanup for when socket is already connected
    const cleanup = () => {
      socket.off('new_complaint', handleNewComplaint);
      socket.off('complaint_assigned', handleComplaintAssigned);
      socket.off('complaint_updated', handleComplaintUpdated);
      socket.off('new_comment', handleNewComment);
      socket.off('test_event', testHandler);
    };

    return cleanup;
  }, [socket, user?.id, user?.role, handleNewComment, addNotification]);

  return null;
}

