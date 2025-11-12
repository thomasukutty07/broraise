'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, AlertCircle, Clock, CheckCircle, XCircle, FileText, Download, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function ComplaintsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    urgency: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [selectedComplaints, setSelectedComplaints] = useState<Set<string>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'assign' | 'status' | 'urgency'>('status');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [filters, pagination.page]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '10',
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.urgency) params.append('urgency', filters.urgency);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (user?.role === 'staff') params.append('assignedTo', 'me');

      const response = await apiRequest(`/api/complaints?${params.toString()}`);
      const data = await response.json();
      setComplaints(data.complaints || []);
      setPagination(data.pagination || { page: 1, total: 0, pages: 0 });
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
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
        return <XCircle className="size-4 text-gray-600" />;
      default:
        return null;
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

  const getUrgencyBadge = (urgency: string) => {
    const variants: Record<string, string> = {
      critical: 'bg-red-500/10 text-red-700 dark:text-red-400',
      high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      low: 'bg-green-500/10 text-green-700 dark:text-green-400',
    };
    return variants[urgency] || variants.medium;
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.urgency) params.append('urgency', filters.urgency);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        toast.error('Please log in to export complaints');
        return;
      }

      const response = await fetch(`/api/complaints/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Unauthorized - Please log in again');
          return;
        }
        if (response.status === 403) {
          toast.error('You do not have permission to export complaints');
          return;
        }
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complaints-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Complaints exported successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export complaints');
    }
  };

  const handleBulkAction = async () => {
    if (selectedComplaints.size === 0) {
      toast.error('Please select at least one complaint');
      return;
    }

    // For assign action, empty value means unassign (which is valid)
    // For other actions, value is required
    if (bulkAction !== 'assign' && !bulkValue) {
      toast.error('Please select a value');
      return;
    }

    setBulkLoading(true);
    try {
      // For assign action, send empty string for unassign, otherwise send the selected value
      const valueToSend = bulkAction === 'assign' ? (bulkValue || '') : bulkValue;
      
      await apiRequest('/api/complaints/bulk', {
        method: 'POST',
        body: JSON.stringify({
          complaintIds: Array.from(selectedComplaints),
          action: bulkAction,
          value: valueToSend,
        }),
      });

      toast.success(`Successfully updated ${selectedComplaints.size} complaint(s)`);
      setSelectedComplaints(new Set());
      setBulkActionOpen(false);
      setBulkValue('');
      fetchComplaints();
      // Refresh page if assignment action
      if (bulkAction === 'assign') {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update complaints');
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedComplaints.size === complaints.length) {
      setSelectedComplaints(new Set());
    } else {
      setSelectedComplaints(new Set(complaints.map((c) => c._id || c.id)));
    }
  };

  const toggleSelect = (complaintId: string) => {
    const newSelected = new Set(selectedComplaints);
    if (newSelected.has(complaintId)) {
      newSelected.delete(complaintId);
    } else {
      newSelected.add(complaintId);
    }
    setSelectedComplaints(newSelected);
  };

  const fetchStaffMembers = async () => {
    try {
      setLoadingStaff(true);
      const response = await apiRequest('/api/users?role=staff');
      const data = await response.json();
      setStaffMembers(data.filter((u: any) => u.isActive));
    } catch (error) {
      console.error('Failed to fetch staff members:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoadingStaff(false);
    }
  };

  // Fetch staff members when dialog opens or when assign action is selected
  useEffect(() => {
    if (bulkActionOpen && (bulkAction === 'assign' || user?.role === 'admin' || user?.role === 'staff')) {
      fetchStaffMembers();
    }
  }, [bulkActionOpen, bulkAction]);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6 w-full max-w-full overflow-x-hidden box-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Complaints</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage and track all complaints</p>
            </div>
            <div className="flex items-center gap-2">
              {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'management') && (
                <>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 size-4" />
                    Export CSV
                  </Button>
                  {selectedComplaints.size > 0 && (
                    <Dialog open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
                      <DialogTrigger asChild>
                        <Button variant="default">
                          <CheckSquare className="mr-2 size-4" />
                          Bulk Action ({selectedComplaints.size})
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Bulk Action</DialogTitle>
                          <DialogDescription>
                            Apply an action to {selectedComplaints.size} selected complaint(s)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Action</Label>
                            <Select value={bulkAction} onValueChange={(v: any) => { setBulkAction(v); setBulkValue(''); }}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="status">Change Status</SelectItem>
                                <SelectItem value="urgency">Change Urgency</SelectItem>
                                {user?.role === 'admin' && (
                                  <SelectItem value="assign">Assign To</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Value</Label>
                            {bulkAction === 'status' && (
                              <Select value={bulkValue} onValueChange={setBulkValue}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {bulkAction === 'urgency' && (
                              <Select value={bulkValue} onValueChange={setBulkValue}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select urgency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {bulkAction === 'assign' && (
                              <Select 
                                value={bulkValue || 'unassign'} 
                                onValueChange={(value) => setBulkValue(value === 'unassign' ? '' : value)}
                                disabled={loadingStaff}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={loadingStaff ? "Loading staff..." : "Select staff member"} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassign">Unassign (Remove assignment)</SelectItem>
                                  {staffMembers.map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                      {staff.name} {staff.email ? `(${staff.email})` : ''}
                                    </SelectItem>
                                  ))}
                                  {staffMembers.length === 0 && !loadingStaff && (
                                    <SelectItem value="no-staff" disabled>No staff members available</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setBulkActionOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleBulkAction} 
                            disabled={bulkLoading || loadingStaff || (bulkAction !== 'assign' && !bulkValue)}
                          >
                            {bulkLoading ? 'Processing...' : 'Apply'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </>
              )}
              {user?.role === 'student' && (
                <Button asChild>
                  <Link href="/complaints/new">
                    <Plus className="mr-2 size-4" />
                    New Complaint
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter complaints by status, urgency, or search</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filters.status || 'all'} onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Urgency</label>
                  <Select value={filters.urgency || 'all'} onValueChange={(value) => setFilters({ ...filters, urgency: value === 'all' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All urgencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search complaints..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date From</label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date To</label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="size-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No complaints found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {user?.role === 'student'
                    ? 'Get started by creating a new complaint.'
                    : 'No complaints match your filters.'}
                </p>
                {user?.role === 'student' && (
                  <Button asChild>
                    <Link href="/complaints/new">Create Complaint</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'management') && complaints.length > 0 && (
                <div className="flex items-center gap-2 p-2 border rounded-lg">
                  <Checkbox
                    checked={selectedComplaints.size === complaints.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    Select all ({selectedComplaints.size} selected)
                  </span>
                </div>
              )}
              {complaints.map((complaint: any) => {
                const complaintId = complaint._id || complaint.id;
                return (
                  <div key={complaintId} className="flex items-start gap-2">
                    {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'management') && (
                      <Checkbox
                        checked={selectedComplaints.has(complaintId)}
                        onCheckedChange={() => toggleSelect(complaintId)}
                        className="mt-6"
                      />
                    )}
                    <Link href={`/complaints/${complaintId}`} className="flex-1">
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              {getStatusIcon(complaint.status)}
                              <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1 truncate">{complaint.title}</h3>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                              <span className="truncate">{complaint.category?.name || 'Uncategorized'}</span>
                              <span className="hidden sm:inline">•</span>
                              {(user?.role === 'admin' || user?.role === 'management' || user?.role === 'staff') && complaint.submittedBy && (
                                <>
                                  <span className="truncate font-medium">
                                    {complaint.submittedBy.name || 'Unknown'}
                                  </span>
                                  {complaint.submittedBy.email && (
                                    <>
                                      <span className="hidden sm:inline">•</span>
                                      <span className="truncate text-xs">{complaint.submittedBy.email}</span>
                                    </>
                                  )}
                                  <span className="hidden sm:inline">•</span>
                                </>
                              )}
                              <span className="truncate">{format(new Date(complaint.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={`${getUrgencyBadge(complaint.urgency)} text-xs`}>
                                {complaint.urgency}
                              </Badge>
                              <Badge variant="outline" className={`${getStatusBadge(complaint.status)} text-xs`}>
                                {complaint.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
              );
              })}

              {pagination.pages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {(pagination.page - 1) * 10 + 1} to {Math.min(pagination.page * 10, pagination.total)} of{' '}
                    {pagination.total} results
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page === pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
