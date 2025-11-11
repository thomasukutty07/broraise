import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireAuth, requireRole, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth';

async function getHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await User.findById(params.id).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (req.user!.role !== 'admin' && req.user!.userId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      avatar: user.avatar,
      isActive: user.isActive,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch user' }, { status: 500 });
  }
}

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['student', 'staff', 'admin', 'management']).optional(),
  branch: z.string().optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().url().optional(),
  emailNotifications: z.object({
    newComplaint: z.boolean().optional(),
    statusUpdate: z.boolean().optional(),
    comment: z.boolean().optional(),
    assignment: z.boolean().optional(),
    reminder: z.boolean().optional(),
  }).optional(),
});

async function updateHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (req.user!.role !== 'admin' && req.user!.userId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    if (validatedData.role && req.user!.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 });
    }

    if (validatedData.isActive !== undefined && req.user!.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can change active status' }, { status: 403 });
    }

    if (validatedData.password) {
      validatedData.password = await hashPassword(validatedData.password);
    }

    Object.assign(user, validatedData);
    await user.save();

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      avatar: user.avatar,
      isActive: user.isActive,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler);
export const PATCH = requireAuth(updateHandler);

