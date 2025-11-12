// Reminder checker service - checks for due reminders and sends notifications
import connectDB from './db';
import Reminder from '@/models/Reminder';
import { emitToUser } from './socket-helper';
import { saveNotificationToDB } from './notification-helper';
import { sendEmailIfEnabled, getReminderEmailTemplate } from './email';

interface ProcessedReminder {
  reminderId: string;
  userId: string;
  timestamp: number;
}

// Track which reminders we've already notified to avoid duplicates
const processedReminders = new Map<string, number>();
const CHECK_INTERVAL = 60000; // Check every 60 seconds

/**
 * Check for reminders that are due and send notifications
 */
export async function checkReminders() {
  try {
    await connectDB();
    
    const now = new Date();
    
    // Find reminders that are due (reminderDate <= now) and pending
    const dueReminders = await Reminder.find({
      reminderDate: { $lte: now },
      status: 'pending',
    })
      .populate('complaint', 'title')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    

    for (const reminder of dueReminders) {
      const reminderId = reminder._id.toString();
      const assignedToId = reminder.assignedTo?._id?.toString() || reminder.assignedTo?.toString();
      
      if (!assignedToId) {
        continue;
      }
      
      // Ensure assignedToId is a string
      const userId = String(assignedToId);

      // Check if we've already notified for this reminder in the last 5 minutes
      // This prevents duplicate notifications if the checker runs multiple times
      const lastNotified = processedReminders.get(reminderId);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      if (lastNotified && lastNotified > fiveMinutesAgo) {
        continue; // Already notified recently
      }
      
      // Double-check the reminder is actually due
      const reminderDate = new Date(reminder.reminderDate);
      if (reminderDate > now) {
        continue;
      }

      // Mark as processed
      processedReminders.set(reminderId, Date.now());

      const complaintTitle = (reminder.complaint as any)?.title || 'Complaint';
      const reminderMessage = reminder.message;

      // Create notification data
      const notificationData = {
        type: 'reminder_due' as const,
        complaintId: reminder.complaint?._id?.toString() || reminder.complaint?.toString() || '',
        title: `Reminder: ${complaintTitle}`,
        message: reminderMessage,
        reminderId: reminderId,
      };

      // Send real-time notification via Socket.io
      emitToUser(userId, 'reminder_due', notificationData);

      // Save notification to database for offline users
      await saveNotificationToDB(userId, notificationData);

      // Send email notification if enabled
      const assignedUser = (reminder.assignedTo as any);
      if (assignedUser && assignedUser.email) {
        const emailTemplate = getReminderEmailTemplate(
          complaintTitle,
          notificationData.complaintId,
          reminderMessage
        );
        await sendEmailIfEnabled(
          userId,
          'reminder',
          assignedUser.email,
          emailTemplate.subject,
          emailTemplate.html
        );
      }

      
    }

    // Clean up old processed reminders (older than 1 hour) to prevent memory leak
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [reminderId, timestamp] of processedReminders.entries()) {
      if (timestamp < oneHourAgo) {
        processedReminders.delete(reminderId);
      }
    }
  } catch (error: any) {
    console.error('❌ Error checking reminders:', error.message);
  }
}

let reminderInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Start the reminder checker service
 */
export function startReminderChecker() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  // Run immediately on start
  checkReminders().catch(err => {
    console.error('❌ Error in initial reminder check:', err);
  });

  // Then check every interval
  reminderInterval = setInterval(() => {
    checkReminders().catch(err => {
      console.error('❌ Error in interval reminder check:', err);
    });
  }, CHECK_INTERVAL);

  
}

/**
 * Stop the reminder checker service
 */
export function stopReminderChecker() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    isRunning = false;
  }
}

