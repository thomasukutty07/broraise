import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';

async function getHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    const complaintId = params.id;

    const logs = await AuditLog.find({ complaint: complaintId })
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Failed to fetch activity logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch activity logs' }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler);

