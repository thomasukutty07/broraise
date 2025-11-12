import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { emitToUser } from '@/lib/socket-helper';

// Test endpoint to manually trigger a reminder event
async function handler(req: AuthenticatedRequest) {
  try {
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { userId, complaintId, title, message } = body;

    if (!userId || !complaintId) {
      return NextResponse.json({ 
        error: 'userId and complaintId are required' 
      }, { status: 400 });
    }

    const notificationData = {
      type: 'reminder_due' as const,
      complaintId: complaintId,
      title: title || 'Test Reminder',
      message: message || 'This is a test reminder notification',
    };

    console.log(`🧪 TEST: Manually emitting reminder_due to user ${userId}:`, notificationData);
    emitToUser(userId, 'reminder_due', notificationData);

    return NextResponse.json({ 
      success: true, 
      message: 'Reminder event emitted',
      data: notificationData 
    });
  } catch (error: any) {
    console.error('❌ Test reminder endpoint error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

export const POST = requireAuth(handler);

