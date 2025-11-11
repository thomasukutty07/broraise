import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';

async function getHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');

    const filter: any = {
      userId: req.user!.userId,
    };

    if (unreadOnly) {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Convert MongoDB documents to plain objects with string IDs
    const formattedNotifications = notifications.map((n: any) => ({
      id: n._id.toString(),
      type: n.type,
      complaintId: n.complaintId.toString(),
      title: n.title,
      message: n.message,
      status: n.status,
      submitterName: n.submitterName,
      submitterEmail: n.submitterEmail,
      commenterName: n.commenterName,
      commenterId: n.commenterId?.toString(),
      timestamp: n.createdAt,
      read: n.read,
    }));

    return NextResponse.json({ notifications: formattedNotifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}

async function putHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { notificationIds, markAllAsRead } = body;

    if (markAllAsRead) {
      // Mark all unread notifications as read for this user
      await Notification.updateMany(
        { userId: req.user!.userId, read: false },
        { read: true }
      );
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          userId: req.user!.userId,
        },
        { read: true }
      );
      return NextResponse.json({ message: 'Notifications marked as read' });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: error.message || 'Failed to update notifications' }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);

