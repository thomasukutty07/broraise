'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  LogOut, 
  User, 
  BarChart3, 
  FileText, 
  Users, 
  FolderOpen,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { NotificationSidebar } from '@/components/NotificationSidebar';
import { useNotifications } from '@/lib/use-notifications';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Enable notifications for all authenticated users (students, admin, staff, management)
  const reminderDialog = useNotifications();

  if (!user) return <>{children}</>;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Complaints', href: '/complaints', icon: FileText },
    ...(user.role === 'admin' || user.role === 'management'
      ? [{ name: 'Users', href: '/users', icon: Users }]
      : []),
    ...(user.role === 'admin'
      ? [
          { name: 'Create Admin', href: '/admin/create-admin', icon: User },
          { name: 'Categories', href: '/categories', icon: FolderOpen },
        ]
      : []),
    ...(user.role === 'admin' || user.role === 'management'
      ? [{ name: 'Analytics', href: '/analytics', icon: BarChart3 }]
      : []),
    ...(user.role === 'admin' ? [{ name: 'Settings', href: '/settings', icon: Settings }] : []),
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'staff':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'management':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      default:
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex">
      {/* Left Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:z-50 border-r bg-card/50 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex h-20 items-center gap-3 px-6 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300">
                <FileText className="size-5" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">BroRaise</span>
            </Link>
          </div>
          
          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="p-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? 'secondary' : 'ghost'}
                    asChild
                    className={cn(
                      'w-full justify-start h-11 px-4 rounded-lg transition-all duration-200',
                      isActive 
                        ? 'bg-primary/10 text-primary font-medium shadow-sm border border-primary/20' 
                        : 'hover:bg-accent/50 hover:text-accent-foreground'
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <Icon className={cn('size-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                      <span>{item.name}</span>
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>
          
          {/* User Info at Bottom */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-background/50 border border-border/50">
              <Avatar className="size-11 ring-2 ring-primary/20">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Badge variant="outline" className={cn('w-full justify-center py-1.5 font-medium', getRoleColor(user.role))}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full justify-start mt-3 text-destructive hover:bg-destructive/10 hover:text-destructive h-10 rounded-lg"
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl shadow-sm">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-lg hover:bg-accent"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            
            {/* Breadcrumb or Title */}
            <div className="flex-1 hidden md:block">
              <h1 className="text-lg font-semibold text-foreground/90">
                {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            
            {/* Right Side Actions - Only Notifications */}
            <div className="flex items-center gap-2">
              <NotificationSidebar />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full max-w-7xl box-border overflow-x-hidden">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[300px] p-0 bg-card/95 backdrop-blur-xl">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex h-20 items-center gap-3 px-6 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                  <FileText className="size-5" />
                </div>
                <span className="text-xl font-bold">BroRaise</span>
              </Link>
            </div>
            
            {/* Navigation */}
            <ScrollArea className="flex-1">
              <nav className="p-4 space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Button
                      key={item.name}
                      variant={isActive ? 'secondary' : 'ghost'}
                      asChild
                      className={cn(
                        'w-full justify-start h-11 px-4 rounded-lg transition-all duration-200',
                        isActive 
                          ? 'bg-primary/10 text-primary font-medium shadow-sm border border-primary/20' 
                          : 'hover:bg-accent/50'
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <Icon className={cn('size-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                        <span>{item.name}</span>
                      </Link>
                    </Button>
                  );
                })}
              </nav>
            </ScrollArea>
            
            {/* User Info at Bottom */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-background/50 border border-border/50">
                <Avatar className="size-11 ring-2 ring-primary/20">
                  {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Badge variant="outline" className={cn('w-full justify-center py-1.5 font-medium', getRoleColor(user.role))}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
              <Button
                variant="ghost"
                onClick={() => {
                  setSidebarOpen(false);
                  logout();
                }}
                className="w-full justify-start mt-3 text-destructive hover:bg-destructive/10 hover:text-destructive h-10 rounded-lg"
              >
                <LogOut className="mr-2 size-4" />
                Log out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Reminder Dialog */}
      {reminderDialog}
    </div>
  );
}
