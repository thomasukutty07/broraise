import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Settings from '@/models/Settings';
import { requireAuth, requireRole, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';

const settingsSchema = z.object({
  autoAssign: z.boolean(),
  escalationDays: z.number().min(1).max(30),
  notificationEmail: z.boolean(),
  reminderDays: z.number().min(1).max(30),
});

async function getHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    
    // Get or create settings (singleton pattern)
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    
    return NextResponse.json({
      autoAssign: settings.autoAssign,
      escalationDays: settings.escalationDays,
      notificationEmail: settings.notificationEmail,
      reminderDays: settings.reminderDays,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

async function updateHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = settingsSchema.parse(body);
    
    // Get or create settings (singleton pattern)
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(validatedData);
    } else {
      settings.autoAssign = validatedData.autoAssign;
      settings.escalationDays = validatedData.escalationDays;
      settings.notificationEmail = validatedData.notificationEmail;
      settings.reminderDays = validatedData.reminderDays;
      await settings.save();
    }
    
    return NextResponse.json({
      autoAssign: settings.autoAssign,
      escalationDays: settings.escalationDays,
      notificationEmail: settings.notificationEmail,
      reminderDays: settings.reminderDays,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}

export const GET = requireRole('admin')(getHandler);
export const PUT = requireRole('admin')(updateHandler);

