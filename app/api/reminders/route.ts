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
});

async function createHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const validatedData = createReminderSchema.parse(body);

    const reminder = await Reminder.create({
      complaint: validatedData.complaintId,
      createdBy: req.user!.userId,
      assignedTo: validatedData.assignedTo,
      message: validatedData.message,
      reminderDate: new Date(validatedData.reminderDate),
    });

    const populated = await Reminder.findById(reminder._id)
      .populate('complaint', 'title')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    return NextResponse.json(populated, { status: 201 });
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
    const completed = searchParams.get('completed') === 'true';

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
    
    if (completed !== undefined) {
      filter.isCompleted = completed === 'true';
    }

    const reminders = await Reminder.find(filter)
      .populate('complaint', 'title status')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ reminderDate: 1 });

    return NextResponse.json(reminders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch reminders' }, { status: 500 });
  }
}

export const POST = requireAuth(createHandler);
export const GET = requireAuth(listHandler);

