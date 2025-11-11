import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/models/Complaint';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';

const bulkUpdateSchema = z.object({
  complaintIds: z.array(z.string()).min(1),
  action: z.enum(['assign', 'status', 'urgency']),
  value: z.union([z.string(), z.object({}).passthrough()]),
});

// Only admins can use bulk assign, but staff can use bulk status/urgency
async function bulkHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { complaintIds, action, value } = body;

    // Check if action is assign - only admins can do this
    if (action === 'assign' && req.user!.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can assign complaints' }, { status: 403 });
    }

    // Staff can only change status and urgency
    if (req.user!.role === 'staff' && action !== 'status' && action !== 'urgency') {
      return NextResponse.json({ error: 'Staff can only change status and urgency' }, { status: 403 });
    }

    const validatedData = bulkUpdateSchema.parse({ complaintIds, action, value });

    // Verify all complaints exist
    const complaints = await Complaint.find({
      _id: { $in: complaintIds },
    });

    if (complaints.length !== complaintIds.length) {
      return NextResponse.json({ error: 'Some complaints not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (action === 'assign') {
      if (typeof value !== 'string') {
        return NextResponse.json({ error: 'Invalid assign value' }, { status: 400 });
      }
      updateData.assignedTo = value === '' ? null : value;
    } else if (action === 'status') {
      if (typeof value !== 'string') {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updateData.status = value;
      if (value === 'resolved' || value === 'closed') {
        updateData.resolvedAt = new Date();
      }
    } else if (action === 'urgency') {
      if (typeof value !== 'string') {
        return NextResponse.json({ error: 'Invalid urgency value' }, { status: 400 });
      }
      updateData.urgency = value;
    }

    // Update all complaints
    const result = await Complaint.updateMany(
      { _id: { $in: complaintIds } },
      { $set: updateData }
    );

    // Create audit logs
    for (const complaintId of complaintIds) {
      await createAuditLog(
        complaintId,
        `bulk_${action}`,
        req.user!.userId,
        { action, value }
      );
    }

    return NextResponse.json({
      message: `Successfully updated ${result.modifiedCount} complaint(s)`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update complaints' }, { status: 500 });
  }
}

export const POST = requireAuth(bulkHandler);
