import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'new_complaint' | 'complaint_assigned' | 'complaint_updated' | 'new_comment' | 'status_changed';
  complaintId: mongoose.Types.ObjectId;
  title: string;
  message?: string;
  status?: string;
  submitterName?: string;
  submitterEmail?: string;
  commenterName?: string;
  commenterId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['new_complaint', 'complaint_assigned', 'complaint_updated', 'new_comment', 'status_changed'],
      required: true,
    },
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
    },
    status: {
      type: String,
    },
    submitterName: {
      type: String,
    },
    submitterEmail: {
      type: String,
    },
    commenterName: {
      type: String,
    },
    commenterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>('Notification', NotificationSchema);

