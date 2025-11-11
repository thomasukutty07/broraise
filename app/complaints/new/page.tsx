'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, uploadFile } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, X, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewComplaintPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    attachments: [] as string[],
  });
  const [uploading, setUploading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t._id === selectedTemplate);
      if (template) {
        setFormData({
          ...formData,
          title: template.title,
          description: template.defaultDescription,
          category: template.category._id || template.category,
        });
      }
    }
  }, [selectedTemplate]);

  useEffect(() => {
    // Check for duplicates when title or description changes
    if (formData.title.length > 10) {
      const timeoutId = setTimeout(() => {
        checkDuplicates();
      }, 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setDuplicates([]);
    }
  }, [formData.title, formData.description]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await apiRequest('/api/categories');
      const data = await response.json();
      setCategories(data || []);
      if (data.length === 0) {
        toast.error('No categories available. Please contact an admin to create categories.');
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories. Please try again later.');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await apiRequest('/api/templates');
      const data = await response.json();
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const checkDuplicates = async () => {
    if (!formData.title || formData.title.length < 10) return;
    
    try {
      setCheckingDuplicates(true);
      const response = await apiRequest('/api/complaints/duplicates', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          submittedBy: user?.id,
        }),
      });
      const data = await response.json();
      setDuplicates(data.duplicates || []);
    } catch (error) {
      console.error('Failed to check duplicates:', error);
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file);
      setFormData({ ...formData, attachments: [...formData.attachments, url] });
      toast.success('File uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiRequest('/api/complaints', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      const complaint = await response.json();
      toast.success('Complaint submitted successfully!');
      router.push(`/complaints/${complaint._id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <Layout>
        <div className="space-y-6 max-w-3xl w-full overflow-x-hidden box-border mx-auto">
          <div>
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Submit New Complaint</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Fill in the details below to submit your complaint</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
              <CardDescription>Provide all necessary information about your complaint</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of your complaint"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                  {checkingDuplicates && (
                    <p className="text-xs text-muted-foreground">Checking for similar complaints...</p>
                  )}
                  {duplicates.length > 0 && (
                    <div className="mt-2 p-3 border border-yellow-500/50 rounded-md bg-yellow-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="size-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                          Similar complaints found ({duplicates.length})
                        </span>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {duplicates.map((dup) => (
                          <div key={dup.id} className="text-xs p-2 bg-background rounded border">
                            <div className="flex items-center justify-between mb-1">
                              <Link href={`/complaints/${dup.id}`} className="text-primary hover:underline font-medium">
                                {dup.title}
                              </Link>
                              <Badge variant="outline" className="text-xs">{dup.status}</Badge>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{dup.description}</p>
                            <p className="text-muted-foreground text-xs mt-1">
                              {new Date(dup.createdAt).toLocaleDateString()} • {dup.similarity}% similar
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="template">Use Template (Optional)</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template to pre-fill form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None - Start from scratch</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template._id} value={template._id}>
                            {template.name} - {template.category?.name || ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  {categoriesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : categories.length === 0 ? (
                    <div className="p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
                      No categories available. Please contact an admin.
                    </div>
                  ) : (
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={formData.urgency}
                    onValueChange={(value) => setFormData({ ...formData, urgency: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed information about your complaint..."
                    rows={6}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 size-4" />
                      {uploading ? 'Uploading...' : 'Upload File'}
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf"
                    />
                    <span className="text-sm text-muted-foreground">Max 10MB per file</span>
                  </div>
                  {formData.attachments.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {formData.attachments.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline truncate flex-1"
                          >
                            {url.split('/').pop()}
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAttachment(index)}
                            className="size-8"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || categories.length === 0}>
                    {loading ? 'Submitting...' : 'Submit Complaint'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
