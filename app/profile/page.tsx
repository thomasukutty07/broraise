'use client';

import { useEffect, useState, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  User, Mail, Lock, Save, Eye, EyeOff, Upload, Camera, 
  FileText, MessageSquare, TrendingUp, Calendar, Building,
  BarChart3, CheckCircle, Clock, AlertCircle, XCircle, Bell, BellOff
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState({
    newComplaint: true,
    statusUpdate: true,
    comment: true,
    assignment: true,
    reminder: true,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    branch: user?.branch || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        branch: user.branch || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      if (user.emailNotifications) {
        setNotificationPrefs({
          newComplaint: user.emailNotifications.newComplaint ?? true,
          statusUpdate: user.emailNotifications.statusUpdate ?? true,
          comment: user.emailNotifications.comment ?? true,
          assignment: user.emailNotifications.assignment ?? true,
          reminder: user.emailNotifications.reminder ?? true,
        });
      }
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user?.id) return;
    try {
      setLoadingStats(true);
      const response = await apiRequest(`/api/users/${user.id}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch user statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/users/${user?.id}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload avatar');
      }

      const updatedUser = await response.json();
      updateUser(updatedUser);
      toast.success('Profile image updated successfully!');
      setAvatarPreview(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload avatar');
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiRequest(`/api/users/${user?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          branch: formData.branch.trim() || undefined,
        }),
      });

      const updatedUser = await response.json();
      updateUser(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPassword || !formData.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await apiRequest(`/api/users/${user?.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      toast.success('Password changed successfully!');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPrefChange = async (key: string, value: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    
    setSavingNotifications(true);
    try {
      const response = await apiRequest(`/api/users/${user?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          emailNotifications: newPrefs,
        }),
      });

      const updatedUser = await response.json();
      updateUser(updatedUser);
      toast.success('Notification preferences updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update preferences');
      // Revert on error
      setNotificationPrefs(notificationPrefs);
    } finally {
      setSavingNotifications(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const statCards = [
    {
      title: user?.role === 'student' ? 'My Complaints' : user?.role === 'staff' ? 'Assigned' : 'Total',
      value: stats?.totalComplaints || stats?.assignedComplaints || 0,
      icon: FileText,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Open',
      value: stats?.openComplaints || 0,
      icon: AlertCircle,
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
    },
    {
      title: 'In Progress',
      value: stats?.inProgressComplaints || 0,
      icon: Clock,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Resolved',
      value: stats?.resolvedComplaints || 0,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8 max-w-6xl mx-auto w-full overflow-x-hidden box-border">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              My Profile
            </h1>
            <p className="text-base text-muted-foreground">
              Manage your account settings, preferences, and view your activity statistics
            </p>
          </div>

          {/* Profile Header Card */}
          <Card className="border-2 shadow-card">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Avatar Section */}
                <div className="relative group">
                  <Avatar className="size-32 ring-4 ring-primary/20">
                    <AvatarImage src={avatarPreview || user?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-4xl font-bold">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full size-10 shadow-lg bg-primary hover:bg-primary/90"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Camera className="size-5" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left space-y-2">
                  <div>
                    <h2 className="text-2xl font-bold">{user?.name || 'User'}</h2>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <Badge variant="outline" className="capitalize">
                      {user?.role}
                    </Badge>
                    {user?.branch && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Building className="size-3" />
                        {user.branch}
                      </Badge>
                    )}
                    {stats?.memberSince && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        Member since {format(new Date(stats.memberSince), 'MMM yyyy')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Grid */}
          {loadingStats ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-2 shadow-card">
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="border-2 shadow-card hover:shadow-lg-card transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        {stat.title}
                      </CardTitle>
                      <div className={`size-10 rounded-xl flex items-center justify-center shadow-lg ${stat.color}`}>
                        <Icon className="size-5" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                    </CardContent>
                  </Card>
                );
              })}
              <Card className="border-2 shadow-card hover:shadow-lg-card transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Comments
                  </CardTitle>
                  <div className="size-10 rounded-xl flex items-center justify-center shadow-lg text-purple-600 bg-purple-100 dark:bg-purple-900/20">
                    <MessageSquare className="size-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{stats?.totalComments || 0}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Information */}
            <Card className="border-2 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="size-5 text-primary" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-12 h-12 rounded-lg border-2 focus:border-primary transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-12 h-12 rounded-lg border-2 focus:border-primary transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branch" className="text-sm font-semibold flex items-center gap-2">
                      <Building className="size-4" />
                      Branch (Optional)
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                      <Input
                        id="branch"
                        type="text"
                        placeholder="Enter branch name"
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        className="pl-12 h-12 rounded-lg border-2 focus:border-primary transition-colors"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-lg text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 size-4" />
                          Update Profile
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="border-2 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-5 text-primary" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-semibold">Current Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                      <Input
                        id="currentPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter current password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        className="pl-12 pr-12 h-12 rounded-lg border-2 focus:border-primary transition-colors"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full w-12 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="size-5 text-muted-foreground" />
                        ) : (
                          <Eye className="size-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-semibold">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password (min. 6 characters)"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="pl-12 pr-12 h-12 rounded-lg border-2 focus:border-primary transition-colors"
                        minLength={6}
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full w-12 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="size-5 text-muted-foreground" />
                        ) : (
                          <Eye className="size-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="pl-12 pr-12 h-12 rounded-lg border-2 focus:border-primary transition-colors"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full w-12 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="size-5 text-muted-foreground" />
                        ) : (
                          <Eye className="size-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-lg text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Changing...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 size-4" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Email Notification Preferences */}
          <Card className="border-2 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5 text-primary" />
                Email Notification Preferences
              </CardTitle>
              <CardDescription>Control which email notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">New Complaint</Label>
                    <p className="text-xs text-muted-foreground">Get notified when a new complaint is submitted</p>
                  </div>
                  <Switch
                    checked={notificationPrefs.newComplaint}
                    onCheckedChange={(checked) => handleNotificationPrefChange('newComplaint', checked)}
                    disabled={savingNotifications}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Status Updates</Label>
                    <p className="text-xs text-muted-foreground">Get notified when complaint status changes</p>
                  </div>
                  <Switch
                    checked={notificationPrefs.statusUpdate}
                    onCheckedChange={(checked) => handleNotificationPrefChange('statusUpdate', checked)}
                    disabled={savingNotifications}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Comments</Label>
                    <p className="text-xs text-muted-foreground">Get notified when someone comments on your complaints</p>
                  </div>
                  <Switch
                    checked={notificationPrefs.comment}
                    onCheckedChange={(checked) => handleNotificationPrefChange('comment', checked)}
                    disabled={savingNotifications}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Assignments</Label>
                    <p className="text-xs text-muted-foreground">Get notified when a complaint is assigned to you</p>
                  </div>
                  <Switch
                    checked={notificationPrefs.assignment}
                    onCheckedChange={(checked) => handleNotificationPrefChange('assignment', checked)}
                    disabled={savingNotifications}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get notified about upcoming reminders</p>
                  </div>
                  <Switch
                    checked={notificationPrefs.reminder}
                    onCheckedChange={(checked) => handleNotificationPrefChange('reminder', checked)}
                    disabled={savingNotifications}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="border-2 shadow-card">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and role information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Role</Label>
                  <p className="font-semibold capitalize text-lg">{user?.role || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">User ID</Label>
                  <p className="font-mono text-sm break-all">{user?.id || 'N/A'}</p>
                </div>
                {stats?.memberSince && (
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Member Since</Label>
                    <p className="font-semibold">{format(new Date(stats.memberSince), 'MMMM dd, yyyy')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
