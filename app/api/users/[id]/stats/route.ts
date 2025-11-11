import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Complaint from '@/models/Complaint';
import Comment from '@/models/Comment';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';

async function handler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userId = params.id;

    // Check permissions
    if (req.user!.role !== 'admin' && req.user!.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user statistics based on role
    let stats: any = {
      totalComplaints: 0,
      openComplaints: 0,
      inProgressComplaints: 0,
      resolvedComplaints: 0,
      closedComplaints: 0,
      totalComments: 0,
      assignedComplaints: 0,
      memberSince: user.createdAt,
    };

    if (user.role === 'student') {
      // For students, count their submitted complaints
      const [total, open, inProgress, resolved, closed, comments] = await Promise.all([
        Complaint.countDocuments({ submittedBy: userId }),
        Complaint.countDocuments({ submittedBy: userId, status: 'open' }),
        Complaint.countDocuments({ submittedBy: userId, status: 'in-progress' }),
        Complaint.countDocuments({ submittedBy: userId, status: 'resolved' }),
        Complaint.countDocuments({ submittedBy: userId, status: 'closed' }),
        Comment.countDocuments({ commenter: userId }),
      ]);

      stats = {
        ...stats,
        totalComplaints: total,
        openComplaints: open,
        inProgressComplaints: inProgress,
        resolvedComplaints: resolved,
        closedComplaints: closed,
        totalComments: comments,
      };
    } else if (user.role === 'staff') {
      // For staff, count assigned complaints
      const [total, open, inProgress, resolved, closed, comments] = await Promise.all([
        Complaint.countDocuments({ assignedTo: userId }),
        Complaint.countDocuments({ assignedTo: userId, status: 'open' }),
        Complaint.countDocuments({ assignedTo: userId, status: 'in-progress' }),
        Complaint.countDocuments({ assignedTo: userId, status: 'resolved' }),
        Complaint.countDocuments({ assignedTo: userId, status: 'closed' }),
        Comment.countDocuments({ commenter: userId }),
      ]);

      stats = {
        ...stats,
        assignedComplaints: total,
        openComplaints: open,
        inProgressComplaints: inProgress,
        resolvedComplaints: resolved,
        closedComplaints: closed,
        totalComments: comments,
      };
    } else {
      // For admin/management, show all complaints they can see
      const [total, open, inProgress, resolved, closed, comments] = await Promise.all([
        Complaint.countDocuments({}),
        Complaint.countDocuments({ status: 'open' }),
        Complaint.countDocuments({ status: 'in-progress' }),
        Complaint.countDocuments({ status: 'resolved' }),
        Complaint.countDocuments({ status: 'closed' }),
        Comment.countDocuments({ commenter: userId }),
      ]);

      stats = {
        ...stats,
        totalComplaints: total,
        openComplaints: open,
        inProgressComplaints: inProgress,
        resolvedComplaints: resolved,
        closedComplaints: closed,
        totalComments: comments,
      };
    }

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch user statistics' }, { status: 500 });
  }
}

export const GET = requireAuth(handler);

