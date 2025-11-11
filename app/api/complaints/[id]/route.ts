import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/models/Complaint';
import Category from '@/models/Category';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { sendEmail, getComplaintEmailTemplate } from '@/lib/email';
import User from '@/models/User';
import { emitToUser, emitToRole } from '@/lib/socket-helper';
import mongoose from 'mongoose';


async function getHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'Complaint ID is required' }, { status: 400 });
    }

    const complaint = await Complaint.findById(params.id)
      .populate('category', 'name description')
      .populate('submittedBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    if (req.user!.role === 'student') {
      const submittedById = typeof complaint.submittedBy === 'object' && complaint.submittedBy !== null && '_id' in complaint.submittedBy
        ? (complaint.submittedBy as any)._id.toString()
        : String(complaint.submittedBy);
      if (submittedById !== req.user!.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(complaint);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch complaint' }, { status: 500 });
  }
}

const updateComplaintSchema = z.object({
  status: z.enum(['open', 'in-progress', 'resolved', 'closed']).optional(),
  assignedTo: z.string().optional(),
  resolution: z.string().optional(),
});

async function updateHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'Complaint ID is required' }, { status: 400 });
    }

    const complaint = await Complaint.findById(params.id);
    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = updateComplaintSchema.parse(body);

    const oldStatus = complaint.status;
    const oldAssignedTo = complaint.assignedTo?.toString();

    if (validatedData.status) {
      if (req.user!.role === 'student' && validatedData.status !== 'open') {
        return NextResponse.json({ error: 'Students can only reopen complaints' }, { status: 403 });
      }
      complaint.status = validatedData.status;
      if (validatedData.status === 'resolved') {
        complaint.resolvedAt = new Date();
      }
    }

    if (validatedData.assignedTo !== undefined) {
      // Only admins can assign complaints
      if (req.user!.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can assign complaints' }, { status: 403 });
      }
      
      complaint.assignedTo = validatedData.assignedTo ? new mongoose.Types.ObjectId(validatedData.assignedTo) : undefined;
    }

    if (validatedData.resolution) {
      if (req.user!.role === 'student') {
        return NextResponse.json({ error: 'Students cannot set resolution' }, { status: 403 });
      }
      complaint.resolution = validatedData.resolution;
    }

    await complaint.save();

    await createAuditLog(
      params.id,
      'complaint_updated',
      req.user!.userId,
      { status: oldStatus, assignedTo: oldAssignedTo },
      { status: complaint.status, assignedTo: complaint.assignedTo?.toString(), resolution: complaint.resolution }
    );

    const populatedComplaint = await Complaint.findById(params.id)
      .populate('category', 'name')
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!populatedComplaint) {
      return NextResponse.json({ error: 'Failed to retrieve updated complaint' }, { status: 500 });
    }

    const submittedByUser = await User.findById(complaint.submittedBy);
    if (submittedByUser) {
      const emailTemplate = getComplaintEmailTemplate(
        validatedData.status === 'resolved' ? 'resolved' : 'updated',
        complaint.title,
        params.id,
        validatedData.resolution || `Status changed to ${complaint.status}`
      );
      await sendEmail(submittedByUser.email, emailTemplate.subject, emailTemplate.html);
    }

    if (validatedData.assignedTo && validatedData.assignedTo !== oldAssignedTo) {
      const assignedUser = await User.findById(validatedData.assignedTo);
      if (assignedUser) {
        const emailTemplate = getComplaintEmailTemplate('assigned', complaint.title, params.id);
        await sendEmail(assignedUser.email, emailTemplate.subject, emailTemplate.html);
        
        // Emit Socket.io event for complaint assignment
        emitToUser(assignedUser._id.toString(), 'complaint_assigned', {
          type: 'complaint_assigned',
          complaintId: params.id,
          title: complaint.title,
        });
      }
    }

    // Emit Socket.io event for status updates
    if (validatedData.status && validatedData.status !== oldStatus) {
      // Notify the submitter
      emitToUser(complaint.submittedBy.toString(), 'complaint_updated', {
        type: 'complaint_updated',
        complaintId: params.id,
        title: complaint.title,
        status: validatedData.status,
      });

      // Notify assigned staff if any
      if (complaint.assignedTo) {
        emitToUser(complaint.assignedTo.toString(), 'complaint_updated', {
          type: 'complaint_updated',
          complaintId: params.id,
          title: complaint.title,
          status: validatedData.status,
        });
      }
    }

    return NextResponse.json(populatedComplaint);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update complaint' }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler);
export const PATCH = requireAuth(updateHandler);

