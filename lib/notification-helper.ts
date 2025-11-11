// Helper functions to save notifications to the database
// This ensures notifications are persisted even when users are offline

import connectDB from './db';
import Notification from '@/models/Notification';
import User from '@/models/User';
import mongoose from 'mongoose';

interface NotificationData {
  type: 'new_complaint' | 'complaint_assigned' | 'complaint_updated' | 'new_comment' | 'status_changed';
  complaintId: string;
  title: string;
  message?: string;
  status?: string;
  submitterName?: string;
  submitterEmail?: string;
  commenterName?: string;
  commenterId?: string;
}

/**
 * Save a notification to the database for a specific user
 */
export async function saveNotificationToDB(userId: string, data: NotificationData): Promise<void> {
  try {
    await connectDB();
    
    await Notification.create({
      userId: new mongoose.Types.ObjectId(userId),
      complaintId: new mongoose.Types.ObjectId(data.complaintId),
      type: data.type,
      title: data.title,
      message: data.message,
      status: data.status,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      commenterName: data.commenterName,
      commenterId: data.commenterId ? new mongoose.Types.ObjectId(data.commenterId) : undefined,
      read: false,
    });
    
  } catch (error: any) {
    console.error(`❌ Failed to save notification to DB for user ${userId}:`, error.message);
    // Don't throw - notification saving should not break the main flow
  }
}

/**
 * Save notifications to the database for all users with a specific role
 */
export async function saveNotificationToRole(role: string, data: NotificationData): Promise<void> {
  try {
    await connectDB();
    
    const users = await User.find({ role, isActive: true }).select('_id');
    
    if (users.length === 0) {
      return;
    }
    
    const notifications = users.map((user) => ({
      userId: user._id,
      complaintId: new mongoose.Types.ObjectId(data.complaintId),
      type: data.type,
      title: data.title,
      message: data.message,
      status: data.status,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      commenterName: data.commenterName,
      commenterId: data.commenterId ? new mongoose.Types.ObjectId(data.commenterId) : undefined,
      read: false,
    }));
    
    await Notification.insertMany(notifications);
  } catch (error: any) {
    console.error(`❌ Failed to save notifications to DB for role ${role}:`, error.message);
    // Don't throw - notification saving should not break the main flow
  }
}

/**
 * Save notification to database for multiple users
 */
export async function saveNotificationToUsers(userIds: string[], data: NotificationData): Promise<void> {
  try {
    await connectDB();
    
    if (userIds.length === 0) {
      return;
    }
    
    const notifications = userIds.map((userId) => ({
      userId: new mongoose.Types.ObjectId(userId),
      complaintId: new mongoose.Types.ObjectId(data.complaintId),
      type: data.type,
      title: data.title,
      message: data.message,
      status: data.status,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      commenterName: data.commenterName,
      commenterId: data.commenterId ? new mongoose.Types.ObjectId(data.commenterId) : undefined,
      read: false,
    }));
    
    await Notification.insertMany(notifications);
  } catch (error: any) {
    console.error(`❌ Failed to save notifications to DB:`, error.message);
    // Don't throw - notification saving should not break the main flow
  }
}

