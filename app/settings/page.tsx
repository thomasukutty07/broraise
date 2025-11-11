'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState({
    autoAssign: false,
    escalationDays: 7,
    notificationEmail: true,
    reminderDays: 1,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const response = await apiRequest('/api/settings');
      const data = await response.json();
      setSettings({
        autoAssign: data.autoAssign ?? false,
        escalationDays: data.escalationDays ?? 7,
        notificationEmail: data.notificationEmail ?? true,
        reminderDays: data.reminderDays ?? 1,
      });
    } catch (error: any) {
      console.error('Failed to fetch settings:', error);
      // Use defaults if fetch fails
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      setSettings(data);
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout>
        <div className="space-y-6 max-w-3xl w-full overflow-x-hidden box-border mx-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Configure system-wide settings and preferences</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="size-5" />
                General Settings
              </CardTitle>
              <CardDescription>Manage system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fetching ? (
                <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-assign Complaints</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically assign new complaints to available staff members
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoAssign}
                      onCheckedChange={(checked) => setSettings({ ...settings, autoAssign: checked })}
                    />
                  </div>

              <div className="space-y-2">
                <Label htmlFor="escalationDays">Escalation Days</Label>
                <Input
                  id="escalationDays"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.escalationDays}
                  onChange={(e) =>
                    setSettings({ ...settings, escalationDays: parseInt(e.target.value) })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Complaints will be escalated after this many days without resolution
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for complaint updates
                  </p>
                </div>
                <Switch
                  checked={settings.notificationEmail}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notificationEmail: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderDays">Reminder Days</Label>
                <Input
                  id="reminderDays"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.reminderDays}
                  onChange={(e) =>
                    setSettings({ ...settings, reminderDays: parseInt(e.target.value) })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Send reminder emails after this many days of inactivity
                </p>
              </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={loading}>
                      <Save className="mr-2 size-4" />
                      {loading ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
