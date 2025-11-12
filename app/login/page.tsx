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
import { FileText, Mail, Lock, Sparkles, CheckCircle2, MessageSquare, TrendingUp, ArrowRight, Shield, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import PageLoader from '@/components/PageLoader';

export default function LoginPage() {
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
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Show loading or nothing while checking auth
  if (authLoading || user) {
    return <PageLoader message="Redirecting..." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background w-full overflow-x-hidden box-border">
      {/* Header */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50 w-full overflow-hidden">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6 max-w-7xl w-full box-border">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-full">
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <FileText className="size-4 sm:size-5" />
            </div>
            <span className="text-base sm:text-xl font-bold truncate block overflow-hidden text-ellipsis">BroRaise</span>
          </Link>
          
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 shrink-0 min-w-0">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex h-9 px-3 sm:px-4 text-xs sm:text-sm" asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
            <Button size="sm" className="hidden sm:inline-flex h-9 px-3 sm:px-4 text-xs sm:text-sm" asChild>
              <Link href="/admin/login">Admin</Link>
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
                      <Link href="/register">Sign Up</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/admin/login">Admin Login</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Geometric Pattern Background - Applied to parent */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 70px)`,
          }}></div>
        </div>
        
      {/* Left Side - Modern Design */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative z-10">
        {/* Content */}
        <div className="max-w-lg space-y-10">
          {/* Logo Section */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <FileText className="size-5" />
              </div>
              <span className="text-xl font-bold text-foreground">BroRaise</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-5xl font-extrabold tracking-tight text-foreground">
                Welcome Back
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Sign in to continue managing your complaints efficiently
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  This login is for <span className="text-primary font-semibold">Students</span> and <span className="text-primary font-semibold">Staff</span>
                </p>
              </div>
            </div>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="group relative p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 transition-colors">
                  <CheckCircle2 className="size-6 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">Secure Access</h3>
                  <p className="text-sm text-muted-foreground">Your data is protected with industry-standard encryption</p>
                </div>
              </div>
            </div>

            <div className="group relative p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="size-6 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">Real-time Updates</h3>
                  <p className="text-sm text-muted-foreground">Get instant notifications about your complaint status</p>
                </div>
              </div>
            </div>

            <div className="group relative p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="size-6 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">Track Progress</h3>
                  <p className="text-sm text-muted-foreground">Monitor and manage all your complaints in one place</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-12 relative z-10">
        <div className="w-full max-w-md">
        <Card className="w-full border-2 box-border shadow-lg-card bg-card animate-fade-in">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground mb-6 shadow-xl shadow-primary/25 transform hover:scale-105 transition-all duration-300">
              <FileText className="size-10" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base mt-3 text-muted-foreground">
              Sign in to your account to continue
            </CardDescription>
            <div className="mt-4 px-4 py-2 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20">
              <p className="text-sm text-center text-muted-foreground font-medium">
                This login is for <span className="text-primary font-semibold">Students</span> and <span className="text-primary font-semibold">Staff</span>
              </p>
            </div>
            <div className="mt-3 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 text-center">
                Staff accounts are created by admins. If you need access, please contact your administrator.
                {' '}<span className="hidden sm:inline">Admins can sign in to manage staff users.</span>{' '}
                <Link href="/admin/login" className="font-semibold underline underline-offset-4 decoration-amber-400 hover:decoration-amber-500">
                  Admin sign in
                </Link>
              </p>
            </div>
          </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-12 rounded-lg border-2 focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-12 rounded-lg border-2 focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-lg text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90" 
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="pt-4 border-t text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/register" className="text-primary hover:underline font-semibold transition-colors">
              Sign up here
            </Link>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
