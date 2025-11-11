import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComplaintTemplate extends Document {
  name: string;
  description: string;
  category: mongoose.Types.ObjectId;
  title: string;
  defaultDescription: string;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintTemplateSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    title: { type: String, required: true },
    defaultDescription: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ComplaintTemplateSchema.index({ category: 1, isActive: 1 });

export default (mongoose.models.ComplaintTemplate as Model<IComplaintTemplate>) ||
  mongoose.model<IComplaintTemplate>('ComplaintTemplate', ComplaintTemplateSchema);

