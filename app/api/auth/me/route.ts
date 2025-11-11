import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';

async function handler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const user = await User.findById(req.user!.userId).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

export const GET = requireAuth(handler);

