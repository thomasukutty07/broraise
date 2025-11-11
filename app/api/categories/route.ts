import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import { requireAuth, requireRole, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
});

async function createHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const validatedData = createCategorySchema.parse(body);

    const existingCategory = await Category.findOne({ name: validatedData.name });
    if (existingCategory) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    const category = await Category.create(validatedData);
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}

async function listHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

export const POST = requireRole('admin')(createHandler);
export const GET = requireAuth(listHandler);

