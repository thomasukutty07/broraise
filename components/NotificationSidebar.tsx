'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// ScrollArea component - using div with overflow for now
import { useNotificationContext } from '@/lib/notification-context';
import { Bell, FileText, UserCheck, MessageSquare, CheckCircle2, X, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function NotificationSidebar() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotificationContext();
  const [open, setOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_complaint':
        return <FileText className="size-4 text-blue-600" />;
      case 'complaint_assigned':
        return <UserCheck className="size-4 text-green-600" />;
      case 'complaint_updated':
        return <CheckCircle2 className="size-4 text-purple-600" />;
      case 'new_comment':
        return <MessageSquare className="size-4 text-orange-600" />;
      default:
        return <FileText className="size-4" />;
    }
  };

  const getNotificationTitle = (notification: any) => {
    switch (notification.type) {
      case 'new_complaint':
        return 'New Complaint Received';
      case 'complaint_assigned':
        return 'Complaint Assigned';
      case 'complaint_updated':
        return 'Complaint Updated';
      case 'new_comment':
        return 'New Comment';
      default:
        return 'Notification';
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Only mark as read, don't close the sidebar so user can see all notifications
    markAsRead(notification.id);
    // Don't close sidebar - let user browse through notifications
    // setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8 sm:size-9 md:size-10 shrink-0" aria-label="Notifications">
          <Bell className="size-4 sm:size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 text-[10px] font-bold"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Notifications</SheetTitle>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isMarkingAll) return;
                      setIsMarkingAll(true);
                      try {
                        
                        await markAllAsRead();
                        toast.success('All notifications marked as read');
                      } catch (error: any) {
                        
                        toast.error(error?.message || 'Failed to mark all notifications as read');
                      } finally {
                        setIsMarkingAll(false);
                      }
                    }}
                    className="text-xs h-8"
                    disabled={unreadCount === 0 || isMarkingAll}
                  >
                    <CheckCheck className="size-3 mr-1" />
                    {isMarkingAll ? 'Marking...' : 'Mark all read'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isClearingAll) return;
                      setIsClearingAll(true);
                      try {
                        
                        await clearAll();
                        toast.success('All notifications cleared');
                      } catch (error: any) {
                        
                        toast.error(error?.message || 'Failed to clear all notifications');
                      } finally {
                        setIsClearingAll(false);
                      }
                    }}
                    className="text-xs h-8 text-destructive"
                    disabled={isClearingAll}
                  >
                    <X className="size-3 mr-1" />
                    {isClearingAll ? 'Clearing...' : 'Clear all'}
                  </Button>
                </>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Bell className="size-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm font-medium mb-1">No notifications</p>
              <p className="text-xs text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={`/complaints/${notification.complaintId}`}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'block px-6 py-4 hover:bg-muted/50 transition-colors group',
                    !notification.read && 'bg-blue-50/50 dark:bg-blue-950/10'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-medium', !notification.read && 'font-semibold')}>
                          {getNotificationTitle(notification)}
                        </p>
                        {!notification.read && (
                          <div className="size-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {notification.title}
                      </p>
                      {notification.type === 'new_complaint' && notification.submitterName && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>Student: <span className="font-medium">{notification.submitterName}</span></p>
                          {notification.submitterEmail && (
                            <p>Email: <span className="font-medium">{notification.submitterEmail}</span></p>
                          )}
                        </div>
                      )}
                      {notification.type === 'new_comment' && notification.commenterName && (
                        <p className="text-xs text-muted-foreground">
                          From: <span className="font-medium">{notification.commenterName}</span>
                        </p>
                      )}
                      {notification.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                      )}
                      {notification.status && (
                        <p className="text-xs text-muted-foreground">
                          Status: <span className="font-medium capitalize">{notification.status.replace('-', ' ')}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(notification.timestamp, 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

