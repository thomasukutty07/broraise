import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, AuthenticatedRequest } from '@/lib/middleware';
import { emitToUser } from '@/lib/socket-helper';

async function handler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const { targetUserId, message } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    
    emitToUser(targetUserId, 'test_event', {
      message: message || 'Test notification',
      from: req.user!.userId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      message: `Test notification sent to user ${targetUserId}` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send test notification' }, { status: 500 });
  }
}

export const POST = requireRole('admin', 'management')(handler);

