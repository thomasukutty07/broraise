import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Reminder from '@/models/Reminder';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';

async function patchHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    const reminderId = params.id;
    const body = await req.json();

    const reminder = await Reminder.findById(reminderId);
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    // Only the assigned user or admin can mark as completed
    if (body.isCompleted && reminder.assignedTo.toString() !== req.user!.userId && req.user!.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (body.isCompleted !== undefined) {
      reminder.isCompleted = body.isCompleted;
      if (body.isCompleted) {
        reminder.completedAt = new Date();
      } else {
        reminder.completedAt = undefined;
      }
    }

    if (body.message) {
      reminder.message = body.message;
    }

    if (body.reminderDate) {
      reminder.reminderDate = new Date(body.reminderDate);
    }

    await reminder.save();

    const populated = await Reminder.findById(reminder._id)
      .populate('complaint', 'title status')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!populated) {
      return NextResponse.json({ error: 'Failed to retrieve updated reminder' }, { status: 500 });
    }

    return NextResponse.json(populated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update reminder' }, { status: 500 });
  }
}

async function deleteHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    const reminderId = params.id;

    const reminder = await Reminder.findById(reminderId);
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    // Only creator or admin can delete
    if (reminder.createdBy.toString() !== req.user!.userId && req.user!.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await Reminder.findByIdAndDelete(reminderId);
    return NextResponse.json({ message: 'Reminder deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete reminder' }, { status: 500 });
  }
}

export const PATCH = requireAuth(patchHandler);
export const DELETE = requireAuth(deleteHandler);

