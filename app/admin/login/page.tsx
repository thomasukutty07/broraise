'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Mail, Lock, Sparkles, Key, LockKeyhole, Crown, Zap, FileText, BarChart3, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Admin login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Show loading or nothing while checking auth
  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 w-full overflow-x-hidden box-border">
      {/* Header */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50 w-full overflow-hidden">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6 max-w-7xl w-full box-border">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-full">
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white shrink-0">
              <Shield className="size-4 sm:size-5" />
            </div>
            <span className="text-base sm:text-xl font-bold truncate block overflow-hidden text-ellipsis">BCMS Admin</span>
          </Link>
          
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 shrink-0 min-w-0">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex h-9 px-3 sm:px-4 text-xs sm:text-sm" asChild>
              <Link href="/login">User Login</Link>
            </Button>
            <Button size="sm" className="hidden sm:inline-flex h-9 px-3 sm:px-4 text-xs sm:text-sm" asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden size-8 shrink-0" aria-label="Menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[300px] p-4">
                <div className="flex flex-col gap-4 mt-6">
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/login">User Login</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/register">Sign Up</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex">
      {/* Left Side - Creative Elements */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_50%)]"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.15),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 size-96 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 size-96 bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl">
                <Shield className="size-8" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Admin Panel
              </h1>
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Secure Access
            </h2>
            <p className="text-lg text-muted-foreground">
              Manage users, complaints, and system settings with full administrative control.
            </p>
          </div>
          <div className="space-y-4 pt-8">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-800/50">
              <Key className="size-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Secure Authentication</h3>
                <p className="text-sm text-muted-foreground">Protected admin access with enhanced security</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-purple-200/50 dark:border-purple-800/50">
              <BarChart3 className="size-6 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Full Control</h3>
                <p className="text-sm text-muted-foreground">Manage all aspects of the complaint system</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-pink-200/50 dark:border-pink-800/50">
              <Crown className="size-6 text-pink-600 dark:text-pink-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Admin Privileges</h3>
                <p className="text-sm text-muted-foreground">Access to analytics, users, and settings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-md border-2 shadow-2xl box-border backdrop-blur-sm bg-background/95 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="space-y-1 text-center relative">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white mb-4 shadow-xl transform hover:scale-110 transition-transform duration-300 relative">
              <Shield className="size-10" />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="size-5 text-yellow-400 animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Admin Login
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Sign in to access the admin panel
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Admin email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in as Admin'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Regular user? </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Login as User
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}
