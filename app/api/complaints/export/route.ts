import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/models/Complaint';
import { requireAuth, AuthenticatedRequest, requireRole } from '@/lib/middleware';

async function handler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const category = searchParams.get('category');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    const filter: any = {};

    if (req.user!.role === 'student') {
      filter.submittedBy = req.user!.userId;
    }

    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    if (category) filter.category = category;

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const complaints = await Complaint.find(filter)
      .populate('category', 'name')
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    // Convert to CSV format
    const headers = [
      'ID',
      'Title',
      'Description',
      'Category',
      'Urgency',
      'Status',
      'Submitted By',
      'Submitter Email',
      'Assigned To',
      'Created At',
      'Resolved At',
      'Resolution',
    ];

    const rows = complaints.map((complaint) => {
      const submittedBy = complaint.submittedBy as any;
      const assignedTo = complaint.assignedTo as any;
      const category = complaint.category as any;

      return [
        complaint._id.toString(),
        `"${(complaint.title || '').replace(/"/g, '""')}"`,
        `"${(complaint.description || '').replace(/"/g, '""')}"`,
        category?.name || '',
        complaint.urgency || '',
        complaint.status || '',
        submittedBy?.name || '',
        submittedBy?.email || '',
        assignedTo?.name || '',
        complaint.createdAt ? new Date(complaint.createdAt).toISOString() : '',
        complaint.resolvedAt ? new Date(complaint.resolvedAt).toISOString() : '',
        `"${(complaint.resolution || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="complaints-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message || 'Failed to export complaints' }, { status: 500 });
  }
}

export const GET = requireRole('admin', 'management', 'staff')(handler);

