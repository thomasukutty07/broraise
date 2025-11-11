import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  complaint: mongoose.Types.ObjectId;
  action: string;
  performedBy: mongoose.Types.ObjectId;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    complaint: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    oldValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ complaint: 1, createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });

export default (mongoose.models.AuditLog as Model<IAuditLog>) || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

