import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeedback extends Document {
  _id: mongoose.Types.ObjectId;
  complaint: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  submittedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema: Schema = new Schema(
  {
    complaint: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      unique: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default (mongoose.models.Feedback as Model<IFeedback>) || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

