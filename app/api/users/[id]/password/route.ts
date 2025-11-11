import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/auth';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

async function handler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Users can only change their own password (unless admin)
    if (req.user!.role !== 'admin' && req.user!.userId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findById(params.id).select('+password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a password (might be OAuth-only user)
    if (!user.password) {
      return NextResponse.json({ error: 'This account does not have a password set. Please use your OAuth provider to sign in.' }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = changePasswordSchema.parse(body);

    // Verify current password
    const isPasswordValid = await verifyPassword(validatedData.currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash and update password
    user.password = await hashPassword(validatedData.newPassword);
    await user.save();

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to change password' }, { status: 500 });
  }
}

export const PATCH = requireAuth(handler);

