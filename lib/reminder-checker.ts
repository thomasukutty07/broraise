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
const CHECK_INTERVAL = 10000; // Check every 10 seconds (for testing, change back to 60000 for production)

/**
 * Check for reminders that are due and send notifications
 */
export async function checkReminders() {
  try {
    console.log('⏰ checkReminders() called');
    await connectDB();
    console.log('⏰ Database connected');
    
    const now = new Date();
    console.log('⏰ Reminder checker running at:', now.toISOString());
    console.log('⏰ Current time:', now.getTime(), 'ISO:', now.toISOString());
    console.log('⏰ Current time local:', now.toLocaleString());
    
    // Find reminders that are due (reminderDate <= now) and pending
    const dueReminders = await Reminder.find({
      reminderDate: { $lte: now },
      status: 'pending',
    })
      .populate('complaint', 'title')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    console.log(`⏰ Found ${dueReminders.length} due reminder(s)`);
    
    // Log all reminders for debugging
    if (dueReminders.length > 0) {
      console.log('⏰ Due reminders details:');
      dueReminders.forEach((reminder, index) => {
        const reminderDate = new Date(reminder.reminderDate);
        const assignedToId = reminder.assignedTo?._id?.toString() || reminder.assignedTo?.toString();
        console.log(`  ${index + 1}. Reminder ID: ${reminder._id}, Date: ${reminderDate.toISOString()}, AssignedTo: ${assignedToId}`);
      });
    } else {
      // Check if there are any reminders at all
      const allReminders = await Reminder.find({ status: { $ne: 'completed' } })
        .select('reminderDate assignedTo status')
        .limit(5);
      console.log(`⏰ Total non-completed reminders: ${allReminders.length}`);
      if (allReminders.length > 0) {
        console.log('⏰ Sample reminders (not yet due):');
        allReminders.forEach((reminder, index) => {
          const reminderDate = new Date(reminder.reminderDate);
          const assignedToId = reminder.assignedTo?.toString();
          const isDue = reminderDate <= now;
          console.log(`  ${index + 1}. Date: ${reminderDate.toISOString()}, AssignedTo: ${assignedToId}, Status: ${(reminder as any).status}, Due: ${isDue ? 'YES' : 'NO'}`);
        });
      }
    }

    for (const reminder of dueReminders) {
      const reminderId = reminder._id.toString();
      const assignedToId = reminder.assignedTo?._id?.toString() || reminder.assignedTo?.toString();
      
      console.log(`⏰ Processing reminder ${reminderId} for user ${assignedToId}`);
      
      if (!assignedToId) {
        console.log(`⏰ Skipping reminder ${reminderId} - no assignedTo`);
        continue;
      }
      
      // Ensure assignedToId is a string
      const userId = String(assignedToId);
      console.log(`⏰ User ID format check - original: ${assignedToId}, stringified: ${userId}`);

      // Check if we've already notified for this reminder in the last 5 minutes
      // This prevents duplicate notifications if the checker runs multiple times
      const lastNotified = processedReminders.get(reminderId);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      if (lastNotified && lastNotified > fiveMinutesAgo) {
        console.log(`⏰ Skipping reminder ${reminderId} - already notified ${Math.round((Date.now() - lastNotified) / 1000)}s ago`);
        continue; // Already notified recently
      }
      
      // Double-check the reminder is actually due
      const reminderDate = new Date(reminder.reminderDate);
      if (reminderDate > now) {
        console.log(`⏰ Skipping reminder ${reminderId} - not yet due. Date: ${reminderDate.toISOString()}, Now: ${now.toISOString()}`);
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
      console.log(`⏰ Sending reminder_due event to user ${userId} (room: user:${userId}):`, notificationData);
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

      console.log(`✅ Reminder notification sent to user ${userId} for reminder ${reminderId}`);
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
    console.log('⚠️ Reminder checker is already running');
    return;
  }

  console.log('🔄 Starting reminder checker service...');
  console.log('🔄 Check interval:', CHECK_INTERVAL, 'ms (', CHECK_INTERVAL / 1000, 'seconds)');
  isRunning = true;

  // Run immediately on start
  console.log('🔄 Running initial reminder check...');
  checkReminders().catch(err => {
    console.error('❌ Error in initial reminder check:', err);
  });

  // Then check every interval
  reminderInterval = setInterval(() => {
    console.log('🔄 Interval triggered - running reminder check...');
    checkReminders().catch(err => {
      console.error('❌ Error in interval reminder check:', err);
    });
  }, CHECK_INTERVAL);

  console.log(`✅ Reminder checker started (checking every ${CHECK_INTERVAL / 1000} seconds)`);
  console.log('✅ Reminder checker will run at:', new Date(Date.now() + CHECK_INTERVAL).toISOString());
}

/**
 * Stop the reminder checker service
 */
export function stopReminderChecker() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    isRunning = false;
    console.log('🛑 Reminder checker stopped');
  }
}

