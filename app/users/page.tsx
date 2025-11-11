'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Search, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as 'student' | 'staff' | 'admin' | 'management',
    branch: '',
  });

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await apiRequest(`/api/users${params}`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await apiRequest(`/api/users/${editingUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
        toast.success('User updated');
      } else {
        await apiRequest('/api/users', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('User created');
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'student',
        branch: '',
      });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save user');
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      branch: user.branch || '',
    });
    setShowModal(true);
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: 'bg-red-500/10 text-red-700 dark:text-red-400',
      staff: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      management: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      student: 'bg-green-500/10 text-green-700 dark:text-green-400',
    };
    return variants[role] || variants.student;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'management']}>
      <Layout>
        <div className="space-y-6 w-full max-w-full overflow-x-hidden box-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Users</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage system users and their roles</p>
            </div>
            {user?.role === 'admin' && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/admin/create-admin">
                    <UserPlus className="mr-2 size-4" />
                    Create Admin
                  </Link>
                </Button>
                <Button className="w-full sm:w-auto" onClick={() => {
                  setEditingUser(null);
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'student',
                    branch: '',
                  });
                  setShowModal(true);
                }}>
                  <Plus className="mr-2 size-4" />
                  Add User
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>{users.length} users found</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6">Avatar</TableHead>
                        <TableHead className="px-6">Name</TableHead>
                        <TableHead className="px-6">Email</TableHead>
                        <TableHead className="px-6">Role</TableHead>
                        <TableHead className="px-6">Branch</TableHead>
                        <TableHead className="px-6">Status</TableHead>
                        {user?.role === 'admin' && <TableHead className="text-right px-6">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.id || u._id}>
                            <TableCell className="px-6">
                              <Avatar className="size-8">
                                {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                                <AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="px-6 font-medium">{u.name}</TableCell>
                            <TableCell className="px-6">{u.email}</TableCell>
                            <TableCell className="px-6">
                              <Badge variant="outline" className={getRoleBadge(u.role)}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6">{u.branch || '-'}</TableCell>
                            <TableCell className="px-6">
                              <Badge variant={u.isActive ? 'default' : 'secondary'}>
                                {u.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            {user?.role === 'admin' && (
                              <TableCell className="text-right px-6">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(u)}
                                >
                                  <Edit className="size-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Update user information' : 'Create a new user account'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password {editingUser && '(leave blank to keep current)'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingUser(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">{editingUser ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
