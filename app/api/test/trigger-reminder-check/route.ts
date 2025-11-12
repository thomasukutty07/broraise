import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';

// Test endpoint to manually trigger the reminder checker
async function handler(req: AuthenticatedRequest) {
  try {
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Dynamically import and run the reminder checker
    const reminderChecker = await import('@/lib/reminder-checker');
    
    console.log('🧪 TEST: Manually triggering reminder check...');
    
    // Call checkReminders directly
    if (reminderChecker.checkReminders) {
      await reminderChecker.checkReminders();
      return NextResponse.json({ 
        success: true, 
        message: 'Reminder check completed. Check server logs for details.'
      });
    } else {
      return NextResponse.json({ 
        error: 'checkReminders function not available' 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Test trigger reminder check error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

export const POST = requireAuth(handler);

