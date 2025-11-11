import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReminder extends Document {
  _id: mongoose.Types.ObjectId;
  complaint: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  message: string;
  reminderDate: Date;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema: Schema = new Schema(
  {
    complaint: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    reminderDate: { type: Date, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ReminderSchema.index({ complaint: 1, reminderDate: 1 });
ReminderSchema.index({ assignedTo: 1, isCompleted: 1, reminderDate: 1 });

export default (mongoose.models.Reminder as Model<IReminder>) ||
  mongoose.model<IReminder>('Reminder', ReminderSchema);

