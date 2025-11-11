'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { useNotifications } from '@/lib/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, AlertCircle, TrendingUp, ArrowRight, Bell, BellRing } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  // Enable notifications for admin and staff
  useNotifications();

  useEffect(() => {
    fetchDashboardData();
    if (user?.role === 'admin' || user?.role === 'staff') {
      fetchUpcomingReminders();
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Build complaints URL with proper filtering for staff
      let complaintsUrl = '/api/complaints?limit=5';
      if (user?.role === 'staff') {
        complaintsUrl += '&assignedTo=me';
      }
      
      const [complaintsRes, analyticsRes] = await Promise.all([
        apiRequest(complaintsUrl),
        user?.role === 'admin' || user?.role === 'management' || user?.role === 'staff'
          ? apiRequest('/api/analytics')
          : null,
      ]);

      const complaintsData = await complaintsRes.json();
      setRecentComplaints(complaintsData.complaints || []);

      if (analyticsRes) {
        const analyticsData = await analyticsRes.json();
        // For staff, use analytics which now filters by assignedTo
        // For admin/management, use full analytics
        setStats(analyticsData.overview);
      } else {
        // For students, calculate from their own complaints
        const userComplaints = complaintsData.complaints || [];
        setStats({
          total: userComplaints.length,
          open: userComplaints.filter((c: any) => c.status === 'open').length,
          inProgress: userComplaints.filter((c: any) => c.status === 'in-progress').length,
          resolved: userComplaints.filter((c: any) => c.status === 'resolved').length,
          closed: userComplaints.filter((c: any) => c.status === 'closed').length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingReminders = async () => {
    try {
      setLoadingReminders(true);
      const response = await apiRequest('/api/reminders?upcoming=true');
      const data = await response.json();
      setUpcomingReminders(data.slice(0, 5) || []); // Show only top 5
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoadingReminders(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="size-4 text-yellow-600" />;
      case 'in-progress':
        return <Clock className="size-4 text-blue-600" />;
      case 'resolved':
        return <CheckCircle className="size-4 text-green-600" />;
      case 'closed':
        return <CheckCircle className="size-4 text-gray-600" />;
      default:
        return <FileText className="size-4 text-gray-600" />;
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

  const statCards = [
    {
      title: 'Total',
      value: stats?.total || 0,
      icon: FileText,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Open',
      value: stats?.open || 0,
      icon: AlertCircle,
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
    },
    {
      title: 'In Progress',
      value: stats?.inProgress || 0,
      icon: Clock,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Resolved',
      value: stats?.resolved || 0,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6 w-full max-w-full overflow-x-hidden box-border">
          <div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome back, {user?.name}! Here's an overview of your complaints.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="size-4 rounded" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <div className={`size-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                          <Icon className="size-4" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Complaints</CardTitle>
                      <CardDescription>
                        {user?.role === 'staff' 
                          ? 'Your recently assigned complaints' 
                          : user?.role === 'student'
                          ? 'Your latest complaint submissions'
                          : 'Recent complaint submissions'}
                      </CardDescription>
                    </div>
                    <Button variant="outline" asChild>
                      <Link href="/complaints">
                        View All
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentComplaints.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="mx-auto size-12 mb-4 opacity-50" />
                      <p>No complaints yet</p>
                      {user?.role === 'student' && (
                        <Button asChild className="mt-4">
                          <Link href="/complaints/new">Create Your First Complaint</Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentComplaints.map((complaint: any) => (
                        <Link
                          key={complaint._id}
                          href={`/complaints/${complaint._id}`}
                          className="block"
                        >
                          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4 flex-1">
                              {getStatusIcon(complaint.status)}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{complaint.title}</p>
                                <div className="text-sm text-muted-foreground space-y-0.5">
                                  <p className="truncate">{complaint.category?.name || 'Uncategorized'}</p>
                                  {(user?.role === 'admin' || user?.role === 'management' || user?.role === 'staff') && complaint.submittedBy && (
                                    <div className="text-xs space-y-0.5">
                                      <p className="truncate">
                                        <span className="font-medium">Student:</span> {complaint.submittedBy.name || 'Unknown'}
                                      </p>
                                      {complaint.submittedBy.email && (
                                        <p className="truncate">
                                          <span className="font-medium">Email:</span> {complaint.submittedBy.email}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className={getStatusBadge(complaint.status)}>
                              {complaint.status}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Reminders Widget - Admin/Staff only */}
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BellRing className="size-5" />
                          Upcoming Reminders
                        </CardTitle>
                        <CardDescription>Your upcoming follow-up reminders</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingReminders ? (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : upcomingReminders.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="mx-auto size-12 mb-4 opacity-50" />
                        <p>No upcoming reminders</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingReminders.map((reminder: any) => {
                          const isOverdue = new Date(reminder.reminderDate) < new Date() && !reminder.isCompleted;
                          return (
                            <div
                              key={reminder._id}
                              className={`p-3 border rounded-md ${
                                isOverdue ? 'bg-red-500/10 border-red-500/50' : 'bg-muted/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Bell className={`size-4 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                                    <Link
                                      href={`/complaints/${reminder.complaint?._id || reminder.complaint}`}
                                      className="text-sm font-medium hover:underline"
                                    >
                                      {reminder.complaint?.title || 'Complaint'}
                                    </Link>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{reminder.message}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(reminder.reminderDate).toLocaleString()}
                                    {isOverdue && <span className="text-red-600 font-medium ml-2">⚠️ Overdue</span>}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/complaints">
                            View All Complaints
                            <ArrowRight className="ml-2 size-4" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
