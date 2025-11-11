import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ComplaintTemplate from '@/models/ComplaintTemplate';
import { requireAuth, AuthenticatedRequest, requireRole } from '@/lib/middleware';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string(),
  title: z.string().min(1).max(200),
  defaultDescription: z.string().min(1),
});

async function createHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const validatedData = createTemplateSchema.parse(body);

    const template = await ComplaintTemplate.create({
      ...validatedData,
      createdBy: req.user!.userId,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}

async function listHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const filter: any = { isActive: true };
    if (category) filter.category = category;

    const templates = await ComplaintTemplate.find(filter)
      .populate('category', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export const POST = requireRole('admin', 'staff')(createHandler);
export const GET = requireAuth(listHandler);

