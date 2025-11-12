// Helper functions to save notifications to the database
// This ensures notifications are persisted even when users are offline

import connectDB from './db';
import Notification from '@/models/Notification';
import User from '@/models/User';
import mongoose from 'mongoose';

interface NotificationData {
  type: 'new_complaint' | 'complaint_assigned' | 'complaint_updated' | 'new_comment' | 'status_changed' | 'reminder_due';
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
 * Prevents duplicates by checking if notification already exists
 */
export async function saveNotificationToDB(userId: string, data: NotificationData): Promise<void> {
  try {
    await connectDB();
    
    // Check if a duplicate unread notification already exists
    const existingNotification = await Notification.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      complaintId: new mongoose.Types.ObjectId(data.complaintId),
      type: data.type,
      read: false,
    });
    
    // If duplicate exists, don't create another one
    if (existingNotification) {
      return;
    }
    
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
    // Handle duplicate key error gracefully (in case unique index catches it)
    if (error.code === 11000 || error.name === 'MongoServerError') {
      // Duplicate notification - this is fine, just skip
      return;
    }
    console.error(`❌ Failed to save notification to DB for user ${userId}:`, error.message);
    // Don't throw - notification saving should not break the main flow
  }
}

/**
 * Save notifications to the database for all users with a specific role
 * Prevents duplicates by checking existing notifications before inserting
 */
export async function saveNotificationToRole(role: string, data: NotificationData): Promise<void> {
  try {
    await connectDB();
    
    const users = await User.find({ role, isActive: true }).select('_id');
    
    if (users.length === 0) {
      return;
    }
    
    const complaintId = new mongoose.Types.ObjectId(data.complaintId);
    
    // Check for existing notifications to avoid duplicates
    const existingNotifications = await Notification.find({
      complaintId,
      type: data.type,
      read: false,
      userId: { $in: users.map(u => u._id) },
    }).select('userId');
    
    const existingUserIds = new Set(
      existingNotifications.map(n => n.userId.toString())
    );
    
    // Only create notifications for users who don't already have one
    const notificationsToCreate = users
      .filter(user => !existingUserIds.has(user._id.toString()))
      .map((user) => ({
        userId: user._id,
        complaintId,
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
    
    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate, { ordered: false });
    }
  } catch (error: any) {
    // Handle duplicate key error gracefully (in case unique index catches it)
    if (error.code === 11000 || error.name === 'MongoServerError') {
      // Some duplicates might have been inserted, but that's okay
      return;
    }
    console.error(`❌ Failed to save notifications to DB for role ${role}:`, error.message);
    // Don't throw - notification saving should not break the main flow
  }
}

/**
 * Save notification to database for multiple users
 * Prevents duplicates by checking existing notifications before inserting
 */
export async function saveNotificationToUsers(userIds: string[], data: NotificationData): Promise<void> {
  try {
    await connectDB();
    
    if (userIds.length === 0) {
      return;
    }
    
    const complaintId = new mongoose.Types.ObjectId(data.complaintId);
    const userIdObjects = userIds.map(id => new mongoose.Types.ObjectId(id));
    
    // Check for existing notifications to avoid duplicates
    const existingNotifications = await Notification.find({
      complaintId,
      type: data.type,
      read: false,
      userId: { $in: userIdObjects },
    }).select('userId');
    
    const existingUserIds = new Set(
      existingNotifications.map(n => n.userId.toString())
    );
    
    // Only create notifications for users who don't already have one
    const notificationsToCreate = userIds
      .filter(userId => !existingUserIds.has(userId))
      .map((userId) => ({
        userId: new mongoose.Types.ObjectId(userId),
        complaintId,
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
    
    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate, { ordered: false });
    }
  } catch (error: any) {
    // Handle duplicate key error gracefully (in case unique index catches it)
    if (error.code === 11000 || error.name === 'MongoServerError') {
      // Some duplicates might have been inserted, but that's okay
      return;
    }
    console.error(`❌ Failed to save notifications to DB:`, error.message);
    // Don't throw - notification saving should not break the main flow
  }
}

