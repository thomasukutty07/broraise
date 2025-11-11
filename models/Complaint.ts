import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComplaint extends Document {
  title: string;
  description: string;
  category: mongoose.Types.ObjectId;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  submittedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  attachments?: string[];
  resolution?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    attachments: [
      {
        type: String,
      },
    ],
    resolution: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

ComplaintSchema.index({ submittedBy: 1, createdAt: -1 });
ComplaintSchema.index({ assignedTo: 1, status: 1 });
ComplaintSchema.index({ status: 1, urgency: 1 });

export default (mongoose.models.Complaint as Model<IComplaint>) || mongoose.model<IComplaint>('Complaint', ComplaintSchema);

