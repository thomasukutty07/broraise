import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment extends Document {
  complaint: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    complaint: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

CommentSchema.index({ complaint: 1, createdAt: 1 });

export default (mongoose.models.Comment as Model<IComment>) || mongoose.model<IComment>('Comment', CommentSchema);

