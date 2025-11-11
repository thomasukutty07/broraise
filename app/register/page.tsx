'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock, User, Building, Sparkles, Star, Rocket, Heart, CheckCircle2, ArrowRight, Shield, Menu, FileText, UserCircle, GraduationCap, Briefcase, KeyRound, LogIn } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'staff'>('student');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password, role, branch);
      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
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
    <div className="min-h-screen flex flex-col bg-linear-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 w-full overflow-x-hidden box-border">
      {/* Header */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50 w-full overflow-hidden">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6 max-w-7xl w-full box-border">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-full">
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <FileText className="size-4 sm:size-5" />
            </div>
            <span className="text-base sm:text-xl font-bold truncate block overflow-hidden text-ellipsis">BCMS</span>
          </Link>
          
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 shrink-0 min-w-0">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex h-9 px-3 sm:px-4 text-xs sm:text-sm" asChild>
              <Link href="/login" className="flex items-center gap-1.5">
                <LogIn className="h-3.5 w-3.5" />
                Login
              </Link>
            </Button>
            <Button size="sm" className="hidden sm:inline-flex h-9 px-3 sm:px-4 text-xs sm:text-sm" asChild>
              <Link href="/admin/login" className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Link>
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
                      <Link href="/login" className="flex items-center gap-2">
                        <LogIn className="size-4" />
                        Login
                      </Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/admin/login" className="flex items-center gap-2">
                        <Shield className="size-4" />
                        Admin Login
                      </Link>
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
          <div className="absolute top-10 left-10 size-80 bg-emerald-300/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 size-96 bg-teal-300/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/4 size-72 bg-cyan-300/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>
        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-xl">
                <UserPlus className="size-8" />
              </div>
              <h1 className="text-4xl font-bold bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Get Started
              </h1>
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Join BCMS Today
            </h2>
            <p className="text-lg text-muted-foreground">
              Create your account and start managing complaints efficiently.
            </p>
          </div>
          <div className="space-y-4 pt-8">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/50">
              <Star className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Quick Registration</h3>
                <p className="text-sm text-muted-foreground">Sign up in minutes with simple steps</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-teal-200/50 dark:border-teal-800/50">
              <Rocket className="size-6 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Start Immediately</h3>
                <p className="text-sm text-muted-foreground">Begin submitting complaints right away</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-cyan-200/50 dark:border-cyan-800/50">
              <Shield className="size-6 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Secure & Safe</h3>
                <p className="text-sm text-muted-foreground">Your data is protected with encryption</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-2xl border-2 box-border shadow-2xl backdrop-blur-sm bg-background/95 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="space-y-1 text-center relative">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300 relative">
              <UserPlus className="size-8" />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="size-5 text-yellow-400 animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Create your account
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Sign up for Brototype Complaint Management System
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <UserCircle className="size-4" />
                  Role
                </Label>
                <Select value={role} onValueChange={(value) => setRole(value as 'student' | 'staff')}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      {role === 'student' ? (
                        <GraduationCap className="size-4 text-muted-foreground" />
                      ) : (
                        <Briefcase className="size-4 text-muted-foreground" />
                      )}
                      <SelectValue placeholder="Select role" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch (Optional)</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="branch"
                    type="text"
                    placeholder="Enter branch name"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <KeyRound className="size-4" />
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <KeyRound className="size-4" />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Sparkles className="mr-2 size-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 size-4" />
                  Sign up
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
              <LogIn className="size-4" />
              Sign in here
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}
