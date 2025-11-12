'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MessageSquare, Star, Send, ArrowLeft, Clock, CheckCircle, AlertCircle, Paperclip, Download, X, History, User, FileEdit, UserPlus, UserMinus, Bell, BellOff, Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    assignedTo: '',
    message: '',
    reminderDate: '',
  });

  useEffect(() => {
    if (params.id) {
      fetchComplaint();
      fetchComments();
      fetchFeedback();
      fetchActivityLogs();
      fetchReminders();
      if (user?.role === 'admin' || user?.role === 'staff') {
        fetchUsers();
      }
    }
  }, [params.id]);

  const fetchComplaint = async () => {
    try {
      const response = await apiRequest(`/api/complaints/${params.id}`);
      const data = await response.json();
      setComplaint(data);
      setStatus(data.status);
      setAssignedTo(data.assignedTo?._id || '');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch complaint');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await apiRequest(`/api/complaints/${params.id}/comments`);
      const data = await response.json();
      
      // Deduplicate comments by _id to prevent duplicates in the UI
      const uniqueComments = data.reduce((acc: any[], comment: any) => {
        const existing = acc.find((c) => c._id === comment._id);
        if (!existing) {
          acc.push(comment);
        }
        return acc;
      }, []);
      
      // Sort by createdAt to maintain order
      uniqueComments.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      });
      
      setComments(uniqueComments);
    } catch (error: any) {
      console.error('Failed to fetch comments:', error);
      // If unauthorized, the token might be expired - try to refresh or show a message
      if (error.message === 'Unauthorized' || error.message?.includes('Unauthorized')) {
        // Don't show error toast for auth issues, just log it
      }
    }
  };

  const fetchFeedback = async () => {
    try {
      const response = await apiRequest(`/api/complaints/${params.id}/feedback`);
      const data = await response.json();
      // API returns null if feedback doesn't exist (which is normal)
      if (data) {
        setFeedback(data);
        if (data.rating) setRating(data.rating);
        if (data.comment) setFeedbackComment(data.comment);
      } else {
        setFeedback(null);
      }
    } catch (error: any) {
      // Only log if it's not a 404 (which is expected when feedback doesn't exist)
      if (error.message && !error.message.includes('not found') && !error.message.includes('404')) {
        console.error('Error fetching feedback:', error);
      }
      setFeedback(null);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiRequest('/api/users?role=staff');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLoadingActivity(true);
      const response = await apiRequest(`/api/complaints/${params.id}/activity`);
      const data = await response.json();
      setActivityLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const fetchReminders = async () => {
    try {
      setLoadingReminders(true);
      const response = await apiRequest(`/api/reminders?complaintId=${params.id}`);
      const data = await response.json();
      setReminders(data || []);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert datetime-local to ISO string with timezone
      // datetime-local format: "YYYY-MM-DDTHH:mm" (local time, no timezone)
      // We need to create a Date object that represents this time in the user's local timezone
      // Then convert to UTC for storage
      
      // Parse the datetime-local string (format: "YYYY-MM-DDTHH:mm")
      const [datePart, timePart] = reminderForm.reminderDate.split('T');
      if (!datePart || !timePart) {
        toast.error('Invalid reminder date format');
        return;
      }
      
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // Create a Date object using the Date constructor with local time components
      // This creates a date in the user's local timezone
      const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      // Validate the date is valid
      if (isNaN(localDate.getTime())) {
        toast.error('Invalid reminder date');
        return;
      }
      
      // Conversion verified locally
      
      // Convert to ISO string (UTC) - this is what MongoDB expects
      const reminderDateISO = localDate.toISOString();
      
      await apiRequest('/api/reminders', {
        method: 'POST',
        body: JSON.stringify({
          complaintId: params.id,
          assignedTo: reminderForm.assignedTo,
          message: reminderForm.message,
          reminderDate: reminderDateISO,
        }),
      });
      toast.success('Reminder created successfully');
      setShowReminderForm(false);
      setReminderForm({ assignedTo: '', message: '', reminderDate: '' });
      fetchReminders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create reminder');
    }
  };

  const handleToggleReminder = async (reminderId: string, isCompleted: boolean) => {
    try {
      await apiRequest(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCompleted }),
      });
      toast.success(isCompleted ? 'Reminder marked as completed' : 'Reminder reopened');
      fetchReminders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update reminder');
    }
  };
  const handleUpdateReminderStatus = async (reminderId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      await apiRequest(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      const msg = newStatus === 'in_progress' ? 'Reminder marked In Progress' : newStatus === 'completed' ? 'Reminder marked Completed' : 'Reminder set to Pending';
      toast.success(msg);
      fetchReminders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update reminder status');
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await apiRequest(`/api/reminders/${reminderId}`, {
        method: 'DELETE',
      });
      toast.success('Reminder deleted');
      fetchReminders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete reminder');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;

    // Prevent double submission
    if (submittingComment) {
      return;
    }

    const commentContent = commentText.trim();
    setSubmittingComment(true);
    
    try {
      const response = await apiRequest(`/api/complaints/${params.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentContent }),
      });
      
      const newComment = await response.json();
      
      // Clear the input immediately
      setCommentText('');
      
      // Refresh comments to get the latest list
      await fetchComments();
      
      toast.success('Comment added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add comment');
      // Don't clear the input on error so user can retry
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await apiRequest(`/api/complaints/${params.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: feedbackComment }),
      });
      toast.success('Feedback submitted');
      fetchFeedback();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      const updateData: any = { status };
      // Only admins can assign complaints
      if (assignedTo && user?.role === 'admin') {
        updateData.assignedTo = assignedTo;
      }

      await apiRequest(`/api/complaints/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      toast.success('Complaint updated');
      fetchComplaint();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update complaint');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      'in-progress': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      resolved: 'bg-green-500/10 text-green-700 dark:text-green-400',
      closed: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
    };
    return variants[status] || variants.closed;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!complaint) {
    return (
      <ProtectedRoute>
        <Layout>
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Complaint not found</p>
            </CardContent>
          </Card>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6 w-full overflow-x-hidden box-border">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 size-4" />
            Back to complaints
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Complaint Details */}
            <div className="space-y-6">
              <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl mb-2 break-words">{complaint.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {complaint.category?.name || 'Uncategorized'} •{' '}
                    {format(parseISO(complaint.createdAt), 'PPp')}
                  </CardDescription>
                </div>
                <Badge variant="outline" className={`${getStatusBadge(complaint.status)} flex-shrink-0`}>
                  {complaint.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{complaint.description}</p>
              </div>

              {complaint.attachments && complaint.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Paperclip className="size-4" />
                      Attachments ({complaint.attachments.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {complaint.attachments.map((url: string, index: number) => {
                        // Check if URL is an image
                        // Check for image extensions in URL
                        const hasImageExtension = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
                        // Check if it's a Cloudinary image URL (contains /image/upload/ and not /raw/upload/)
                        const isCloudinaryImage = url.includes('cloudinary.com') && 
                                                  url.includes('/image/upload/') && 
                                                  !url.includes('/raw/upload/') &&
                                                  !url.includes('.pdf');
                        const isImage = hasImageExtension || isCloudinaryImage;
                        const fileName = url.split('/').pop()?.split('?')[0] || `attachment-${index + 1}`;
                        
                        return (
                          <div key={index} className="border rounded-lg overflow-hidden bg-muted/50">
                            {isImage ? (
                              <div className="relative group">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={url}
                                    alt={fileName}
                                    className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              </div>
                            ) : (
                              <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Paperclip className="size-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm truncate">{fileName}</span>
                                </div>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80"
                                >
                                  <Download className="size-4" />
                                </a>
                              </div>
                            )}
                            <div className="p-2 border-t">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline truncate block"
                              >
                                {fileName}
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {(user?.role === 'admin' || user?.role === 'staff') && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold">Manage Complaint</h3>
                    <div className={`grid gap-4 ${user?.role === 'admin' ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {user?.role === 'admin' && (
                        <div className="space-y-2">
                          <Label>Assign To</Label>
                          <Select
                                value={assignedTo || 'unassigned'} 
                                onValueChange={(value) => setAssignedTo(value === 'unassigned' ? '' : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {users.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.name}
                                    </SelectItem>
                                  ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <Button onClick={handleStatusUpdate}>Update</Button>
                  </div>
                </>
              )}

              {complaint.resolution && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Resolution</h3>
                    <p className="text-muted-foreground">{complaint.resolution}</p>
                  </div>
                </>
              )}

              {/* Reminders Section */}
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Bell className="size-5" />
                        Reminders
                      </h3>
                      {!showReminderForm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowReminderForm(true)}
                        >
                          <Plus className="mr-2 size-4" />
                          Add Reminder
                        </Button>
                      )}
                    </div>

                    {showReminderForm && (
                      <form onSubmit={handleCreateReminder} className="space-y-3 p-3 border rounded-md bg-muted/50">
                        <div className="space-y-2">
                          <Label>Assign To</Label>
                          <Select
                            value={reminderForm.assignedTo}
                            onValueChange={(value) => setReminderForm({ ...reminderForm, assignedTo: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea
                            value={reminderForm.message}
                            onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })}
                            placeholder="Reminder message..."
                            rows={2}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reminder Date</Label>
                          <Input
                            type="datetime-local"
                            value={reminderForm.reminderDate}
                            onChange={(e) => setReminderForm({ ...reminderForm, reminderDate: e.target.value })}
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm">Create</Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowReminderForm(false);
                              setReminderForm({ assignedTo: '', message: '', reminderDate: '' });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}

                    {loadingReminders ? (
                      <Skeleton className="h-20 w-full" />
                    ) : reminders.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No reminders set</p>
                    ) : (
                      <div className="space-y-2">
                        {reminders.map((reminder: any) => {
                          const isOverdue = new Date(reminder.reminderDate) < new Date() && !reminder.isCompleted;
                          return (
                            <div
                              key={reminder._id}
                              className={`p-3 border rounded-md ${
                                reminder.isCompleted || reminder.status === 'completed'
                                  ? 'bg-muted/50 opacity-60'
                                  : isOverdue
                                  ? 'bg-red-500/10 border-red-500/50'
                                  : 'bg-background'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Bell className={`size-4 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                                    <span className="text-sm font-medium">{reminder.message}</span>
                                    {reminder.status && (
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                          reminder.status === 'in_progress'
                                            ? 'bg-blue-500/10 text-blue-700 border-blue-200'
                                            : reminder.status === 'completed'
                                            ? 'bg-green-500/10 text-green-700 border-green-200'
                                            : 'bg-yellow-500/10 text-yellow-700 border-yellow-200'
                                        }`}
                                      >
                                        {reminder.status.replace('_', ' ')}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <p>
                                      Assigned to: {reminder.assignedTo?.name || 'Unknown'} •{' '}
                                      {(() => {
                                        // Handle date conversion properly - MongoDB dates come as ISO strings (UTC)
                                        let date: Date;
                                        if (typeof reminder.reminderDate === 'string') {
                                          // ISO string from MongoDB is in UTC (ends with 'Z')
                                          // new Date() correctly parses UTC ISO strings
                                          date = new Date(reminder.reminderDate);
                                        } else if (reminder.reminderDate instanceof Date) {
                                          date = reminder.reminderDate;
                                        } else {
                                          // Fallback: create from the value
                                          date = new Date(reminder.reminderDate);
                                        }
                                        
                                        // format() automatically converts UTC to local timezone for display
                                        return format(date, 'PPp');
                                      })()}
                                    </p>
                                    {isOverdue && (
                                      <p className="text-red-600 font-medium">⚠️ Overdue</p>
                                    )}
                                    {(reminder.isCompleted || reminder.status === 'completed') && reminder.completedAt && (
                                      <p className="text-green-600">
                                        ✓ Completed on {(() => {
                                          let date: Date;
                                          if (typeof reminder.completedAt === 'string') {
                                            date = parseISO(reminder.completedAt);
                                          } else if (reminder.completedAt instanceof Date) {
                                            date = reminder.completedAt;
                                          } else {
                                            date = new Date(reminder.completedAt);
                                          }
                                          return format(date, 'PPp');
                                        })()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  {reminder.status !== 'in_progress' && reminder.status !== 'completed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUpdateReminderStatus(reminder._id, 'in_progress')}
                                    >
                                      In Progress
                                    </Button>
                                  )}
                                  {reminder.status !== 'completed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUpdateReminderStatus(reminder._id, 'completed')}
                                    >
                                      <CheckCircle className="size-4" />
                                    </Button>
                                  )}
                                  {(reminder.isCompleted || reminder.status === 'completed') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleReminder(reminder._id, false)}
                                    >
                                      <BellOff className="size-4" />
                                    </Button>
                                  )}
                                  {(reminder.createdBy?._id === user?.id || user?.role === 'admin') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteReminder(reminder._id)}
                                    >
                                      <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Feedback Section */}
              {complaint.status === 'resolved' &&
                user?.role === 'student' &&
                complaint.submittedBy?._id === user?.id &&
                !feedback && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="size-5" />
                        Rate Your Experience
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Rating</Label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={cn(
                                  'text-2xl transition-colors',
                                  star <= rating ? 'text-yellow-500' : 'text-muted-foreground'
                                )}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Additional Comments</Label>
                          <Textarea
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder="Share your thoughts..."
                            rows={4}
                          />
                        </div>
                        <Button type="submit" disabled={submittingFeedback || rating === 0}>
                          {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

              {feedback && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="size-5" />
                      Your Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={cn(
                            'text-xl',
                            star <= feedback.rating ? 'text-yellow-500' : 'text-muted-foreground'
                          )}
                        >
                          ★
                        </span>
                      ))}
                      <span className="text-sm text-muted-foreground">({feedback.rating}/5)</span>
                    </div>
                    {feedback.comment && <p className="text-sm">{feedback.comment}</p>}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
            </div>

            {/* Right Column - Comments */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="size-5" />
                    Comments
                  </CardTitle>
                </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No comments yet</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div key={comment._id} className="flex gap-4">
                      <Avatar>
                        {comment.author?.avatar && <AvatarImage src={comment.author.avatar} alt={comment.author?.name || 'User'} />}
                        <AvatarFallback>{getInitials(comment.author?.name || 'U')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comment.author?.name || 'Unknown'}</span>
                          {comment.isInternal && (
                            <Badge variant="outline" className="text-xs">
                              Internal
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(comment.createdAt), 'PPp')}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {user?.role !== 'staff' && (
                <>
                  <Separator />
                  <form onSubmit={handleCommentSubmit} className="space-y-2">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      disabled={user?.role === 'staff'}
                    />
                    <Button type="submit" disabled={submittingComment || !commentText.trim() || user?.role === 'staff'}>
                      <Send className="mr-2 size-4" />
                      {submittingComment ? 'Sending...' : 'Send Comment'}
                    </Button>
                  </form>
                </>
              )}
              {user?.role === 'staff' && (
                <div className="text-sm text-muted-foreground text-center py-4 border-t">
                  Comments are disabled for staff members. Please use internal notes or update the complaint status instead.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : activityLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No activity recorded yet</p>
              ) : (
                <div className="space-y-4">
                  {activityLogs.map((log: any, index: number) => {
                    const getActionIcon = (action: string) => {
                      if (action.includes('created')) return <FileEdit className="size-4 text-green-600" />;
                      if (action.includes('assign')) return <UserPlus className="size-4 text-blue-600" />;
                      if (action.includes('status')) return <CheckCircle className="size-4 text-purple-600" />;
                      if (action.includes('comment')) return <MessageSquare className="size-4 text-orange-600" />;
                      return <History className="size-4 text-gray-600" />;
                    };

                    const getActionText = (action: string, oldValue?: any, newValue?: any) => {
                      if (action === 'complaint_created') {
                        return 'Complaint created';
                      }
                      if (action.includes('status')) {
                        return `Status changed from ${oldValue?.status || 'N/A'} to ${newValue?.status || 'N/A'}`;
                      }
                      if (action.includes('assign')) {
                        if (newValue?.assignedTo) {
                          return `Assigned to staff member`;
                        } else {
                          return 'Unassigned';
                        }
                      }
                      if (action.includes('comment')) {
                        return 'Comment added';
                      }
                      return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                    };

                    return (
                      <div key={log._id || index} className="flex gap-4 relative">
                        {index < activityLogs.length - 1 && (
                          <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-border" />
                        )}
                        <div className="relative z-10 flex-shrink-0">
                          <div className="flex items-center justify-center size-8 rounded-full bg-muted">
                            {getActionIcon(log.action)}
                          </div>
                        </div>
                        <div className="flex-1 space-y-1 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{getActionText(log.action, log.oldValue, log.newValue)}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(log.createdAt), 'PPp')}
                            </span>
                          </div>
                          {log.performedBy && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="size-3" />
                              <span>{log.performedBy.name || 'Unknown'} ({log.performedBy.role || 'N/A'})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
