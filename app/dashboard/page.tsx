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
        <div className="space-y-8 w-full max-w-full overflow-x-hidden box-border">
          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-base text-muted-foreground">
              Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>! Here's an overview of your complaints.
            </p>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-2 shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="size-10 rounded-xl" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card 
                      key={index} 
                      className="border-2 shadow-card hover:shadow-lg-card transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-card/50"
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          {stat.title}
                        </CardTitle>
                        <div className={`size-12 rounded-xl flex items-center justify-center shadow-lg ${stat.color} transition-transform duration-300 hover:scale-110`}>
                          <Icon className="size-5" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">complaints</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Recent Complaints Card */}
              <Card className="border-2 shadow-card">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold">Recent Complaints</CardTitle>
                      <CardDescription className="mt-1">
                        {user?.role === 'staff' 
                          ? 'Your recently assigned complaints' 
                          : user?.role === 'student'
                          ? 'Your latest complaint submissions'
                          : 'Recent complaint submissions'}
                      </CardDescription>
                    </div>
                    <Button variant="outline" asChild className="rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <Link href="/complaints" className="flex items-center gap-2">
                        View All
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentComplaints.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <FileText className="size-8 opacity-50" />
                      </div>
                      <p className="text-base font-medium mb-2">No complaints yet</p>
                      {user?.role === 'student' && (
                        <Button asChild className="mt-4 rounded-lg shadow-sm">
                          <Link href="/complaints/new">Create Your First Complaint</Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentComplaints.map((complaint: any) => (
                        <Link
                          key={complaint._id}
                          href={`/complaints/${complaint._id}`}
                          className="block group"
                        >
                          <div className="flex items-center justify-between p-5 border-2 rounded-xl hover:border-primary/30 hover:bg-accent/30 transition-all duration-200 shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {getStatusIcon(complaint.status)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate text-base group-hover:text-primary transition-colors">
                                  {complaint.title}
                                </p>
                                <div className="text-sm text-muted-foreground space-y-1 mt-1">
                                  <p className="truncate flex items-center gap-2">
                                    <span className="font-medium">Category:</span> {complaint.category?.name || 'Uncategorized'}
                                  </p>
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
                            <Badge variant="outline" className={`ml-4 flex-shrink-0 font-medium ${getStatusBadge(complaint.status)}`}>
                              {complaint.status.replace('-', ' ')}
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
                <Card className="border-2 shadow-card">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <BellRing className="size-5 text-primary" />
                          </div>
                          Upcoming Reminders
                        </CardTitle>
                        <CardDescription className="mt-1">Your upcoming follow-up reminders</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingReminders ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                      </div>
                    ) : upcomingReminders.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Bell className="size-8 opacity-50" />
                        </div>
                        <p className="text-base font-medium">No upcoming reminders</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingReminders.map((reminder: any) => {
                          const isOverdue = new Date(reminder.reminderDate) < new Date() && !reminder.isCompleted;
                          return (
                            <div
                              key={reminder._id}
                              className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                                isOverdue 
                                  ? 'bg-red-500/5 border-red-500/30 shadow-sm' 
                                  : 'bg-muted/30 border-border hover:border-primary/30 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-2 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      isOverdue ? 'bg-red-500/10' : 'bg-primary/10'
                                    }`}>
                                      <Bell className={`size-4 ${isOverdue ? 'text-red-600' : 'text-primary'}`} />
                                    </div>
                                    <Link
                                      href={`/complaints/${reminder.complaint?._id || reminder.complaint}`}
                                      className="text-sm font-semibold hover:text-primary transition-colors truncate"
                                    >
                                      {reminder.complaint?.title || 'Complaint'}
                                    </Link>
                                  </div>
                                  <p className="text-sm text-muted-foreground ml-11">{reminder.message}</p>
                                  <div className="flex items-center gap-2 ml-11">
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(reminder.reminderDate).toLocaleString()}
                                    </p>
                                    {isOverdue && (
                                      <Badge variant="destructive" className="text-xs">
                                        Overdue
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <Button variant="outline" className="w-full rounded-lg shadow-sm hover:shadow-md transition-shadow mt-4" asChild>
                          <Link href="/complaints" className="flex items-center justify-center gap-2">
                            View All Complaints
                            <ArrowRight className="size-4" />
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
