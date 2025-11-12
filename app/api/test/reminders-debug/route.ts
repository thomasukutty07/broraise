import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import connectDB from '@/lib/db';
import Reminder from '@/models/Reminder';

// Debug endpoint to see all reminders and their status
async function handler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    
    const now = new Date();
    const allReminders = await Reminder.find({})
      .populate('complaint', 'title')
      .populate('assignedTo', 'name email _id')
      .populate('createdBy', 'name email')
      .sort({ reminderDate: 1 })
      .limit(20);

    const remindersData = allReminders.map(reminder => {
      const reminderDate = new Date(reminder.reminderDate);
      const assignedToId = reminder.assignedTo?._id?.toString() || reminder.assignedTo?.toString();
      const isDue = reminderDate <= now;
      const timeUntilDue = reminderDate.getTime() - now.getTime();
      
      return {
        id: reminder._id.toString(),
        reminderDate: reminderDate.toISOString(),
        reminderDateLocal: reminderDate.toLocaleString(),
        assignedToId: assignedToId,
        assignedToName: (reminder.assignedTo as any)?.name || 'N/A',
        complaintTitle: (reminder.complaint as any)?.title || 'N/A',
        message: reminder.message,
        isCompleted: reminder.isCompleted,
        isDue: isDue,
        timeUntilDueMs: timeUntilDue,
        timeUntilDueMinutes: Math.round(timeUntilDue / 60000),
        now: now.toISOString(),
        nowLocal: now.toLocaleString(),
      };
    });

    const dueReminders = remindersData.filter(r => r.isDue && !r.isCompleted);
    const upcomingReminders = remindersData.filter(r => !r.isDue && !r.isCompleted);

    return NextResponse.json({
      success: true,
      summary: {
        total: remindersData.length,
        due: dueReminders.length,
        upcoming: upcomingReminders.length,
        completed: remindersData.filter(r => r.isCompleted).length,
      },
      currentTime: {
        iso: now.toISOString(),
        local: now.toLocaleString(),
        timestamp: now.getTime(),
      },
      dueReminders,
      upcomingReminders: upcomingReminders.slice(0, 5), // Show first 5 upcoming
      allReminders: remindersData,
    });
  } catch (error: any) {
    console.error('❌ Debug reminders error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

export const GET = requireAuth(handler);

