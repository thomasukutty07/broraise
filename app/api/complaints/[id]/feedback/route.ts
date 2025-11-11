import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Feedback from '@/models/Feedback';
import Complaint from '@/models/Complaint';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';

const createFeedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

async function createHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
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

    if (complaint.submittedBy.toString() !== req.user!.userId) {
      return NextResponse.json({ error: 'Only the complaint submitter can provide feedback' }, { status: 403 });
    }

    if (complaint.status !== 'resolved' && complaint.status !== 'closed') {
      return NextResponse.json({ error: 'Feedback can only be provided for resolved complaints' }, { status: 400 });
    }

    const existingFeedback = await Feedback.findOne({ complaint: params.id });
    if (existingFeedback) {
      return NextResponse.json({ error: 'Feedback already submitted' }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = createFeedbackSchema.parse(body);

    const feedback = await Feedback.create({
      complaint: params.id,
      rating: validatedData.rating,
      comment: validatedData.comment,
      submittedBy: req.user!.userId,
    });

    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate('submittedBy', 'name email');

    return NextResponse.json(populatedFeedback, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to submit feedback' }, { status: 500 });
  }
}

async function getHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'Complaint ID is required' }, { status: 400 });
    }

    const feedback = await Feedback.findOne({ complaint: params.id })
      .populate('submittedBy', 'name email');

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json(feedback);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch feedback' }, { status: 500 });
  }
}

export const POST = requireAuth(createHandler);
export const GET = requireAuth(getHandler);

