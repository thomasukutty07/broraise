import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import mongoose from 'mongoose';

async function getHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');

    const filter: any = {
      userId: new mongoose.Types.ObjectId(req.user!.userId),
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
    
    return NextResponse.json({ error: error.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}

async function putHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    
    

    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: parseError.message 
      }, { status: 400 });
    }

    const { notificationIds, markAllAsRead } = body;
    
    

    if (markAllAsRead) {
      // Mark all unread notifications as read for this user
      const result = await Notification.updateMany(
        { 
          userId: new mongoose.Types.ObjectId(req.user!.userId), 
          read: false 
        },
        { read: true }
      );
      
      return NextResponse.json({ 
        message: 'All notifications marked as read',
        count: result.modifiedCount 
      });
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Convert notification IDs to ObjectIds
      const objectIds = notificationIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));
      
      if (objectIds.length === 0) {
        
        return NextResponse.json({ 
          error: 'Invalid notification IDs',
          provided: notificationIds 
        }, { status: 400 });
      }

      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      
      // Check if notifications exist and belong to the user
      const existingNotifications = await Notification.find({
        _id: { $in: objectIds },
        userId: userId,
      }).select('_id read');

      if (existingNotifications.length === 0) {
        
        return NextResponse.json({ 
          error: 'Notifications not found or do not belong to user',
          count: 0 
        }, { status: 404 });
      }

      // Mark specific notifications as read
      const result = await Notification.updateMany(
        {
          _id: { $in: objectIds },
          userId: userId,
        },
        { read: true }
      );
      
      
      
      return NextResponse.json({ 
        message: 'Notifications marked as read',
        count: result.modifiedCount 
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    
    return NextResponse.json({ error: error.message || 'Failed to update notifications' }, { status: 500 });
  }
}

async function deleteHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { notificationIds, deleteAll } = body;

    if (deleteAll) {
      // Delete all notifications for this user
      const result = await Notification.deleteMany({
        userId: new mongoose.Types.ObjectId(req.user!.userId),
      });
      return NextResponse.json({ 
        message: 'All notifications deleted',
        count: result.deletedCount 
      });
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Convert notification IDs to ObjectIds
      const objectIds = notificationIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));
      
      if (objectIds.length === 0) {
        return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
      }

      // Delete specific notifications
      const result = await Notification.deleteMany({
        _id: { $in: objectIds },
        userId: new mongoose.Types.ObjectId(req.user!.userId),
      });
      return NextResponse.json({ 
        message: 'Notifications deleted',
        count: result.deletedCount 
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    
    return NextResponse.json({ error: error.message || 'Failed to delete notifications' }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

