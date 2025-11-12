import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Reminder from '@/models/Reminder';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';

const createReminderSchema = z.object({
  complaintId: z.string(),
  assignedTo: z.string(),
  message: z.string().min(1).max(500),
  reminderDate: z.string(), // ISO date string
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
});

async function createHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const validatedData = createReminderSchema.parse(body);

    // The client sends an ISO string (UTC) converted from datetime-local
    // Parse it directly - it's already in UTC format
    const reminderDate = new Date(validatedData.reminderDate);
    
    // Validate the date is valid
    if (isNaN(reminderDate.getTime())) {
      return NextResponse.json({ error: 'Invalid reminder date' }, { status: 400 });
    }
    
    // Ensure we're storing the correct UTC time
    // MongoDB stores dates in UTC, so this should be correct

  const status = validatedData.status ?? 'pending';
  const isCompleted = status === 'completed';
  const completedAt = isCompleted ? new Date() : undefined;

  const reminder = await Reminder.create({
      complaint: validatedData.complaintId,
      createdBy: req.user!.userId,
      assignedTo: validatedData.assignedTo,
      message: validatedData.message,
      reminderDate: reminderDate,
    status,
    isCompleted,
    completedAt,
    });

    const populated = await Reminder.findById(reminder._id)
      .populate('complaint', 'title')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!populated) {
      return NextResponse.json({ error: 'Failed to retrieve created reminder' }, { status: 500 });
    }

    // Convert to plain object and ensure dates are serialized correctly
    const response = populated.toObject();
    // Ensure reminderDate is properly serialized as ISO string
    if (response.reminderDate) {
      response.reminderDate = new Date(response.reminderDate).toISOString();
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create reminder' }, { status: 500 });
  }
}

async function listHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get('complaintId');
    const upcoming = searchParams.get('upcoming') === 'true';
    const completedParam = searchParams.get('completed');

    const filter: any = {};
    
    if (complaintId) {
      filter.complaint = complaintId;
    }
    
    // For staff, only show reminders assigned to them
    if (req.user!.role === 'staff') {
      filter.assignedTo = req.user!.userId;
    }
    
    if (upcoming) {
      filter.reminderDate = { $gte: new Date() };
      filter.isCompleted = false;
    }
    
    if (completedParam !== null) {
      filter.isCompleted = completedParam === 'true';
    }

    const reminders = await Reminder.find(filter)
      .populate('complaint', 'title status')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ reminderDate: 1 });

    // Ensure all dates are properly serialized as ISO strings
    const serializedReminders = reminders.map(reminder => {
      const obj = reminder.toObject();
      if (obj.reminderDate) {
        obj.reminderDate = new Date(obj.reminderDate).toISOString();
      }
      if (obj.completedAt) {
        obj.completedAt = new Date(obj.completedAt).toISOString();
      }
      return obj;
    });

    return NextResponse.json(serializedReminders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch reminders' }, { status: 500 });
  }
}

export const POST = requireAuth(createHandler);
export const GET = requireAuth(listHandler);

