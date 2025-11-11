import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  autoAssign: boolean;
  escalationDays: number;
  notificationEmail: boolean;
  reminderDays: number;
  updatedAt: Date;
}

const SettingsSchema: Schema = new Schema(
  {
    autoAssign: {
      type: Boolean,
      default: false,
    },
    escalationDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 30,
    },
    notificationEmail: {
      type: Boolean,
      default: true,
    },
    reminderDays: {
      type: Number,
      default: 3,
      min: 1,
      max: 30,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
SettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default (mongoose.models.Settings as Model<ISettings>) || mongoose.model<ISettings>('Settings', SettingsSchema);

