import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import { requireAuth, requireRole, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';

async function getHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const category = await Category.findById(params.id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch category' }, { status: 500 });
  }
}

const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
});

async function updateHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const category = await Category.findById(params.id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = updateCategorySchema.parse(body);

    Object.assign(category, validatedData);
    await category.save();

    return NextResponse.json(category);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 });
  }
}

async function deleteHandler(req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) {
  try {
    await connectDB();
    const params = context?.params ? (await Promise.resolve(context.params)) : { id: '' };
    if (!params.id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const category = await Category.findById(params.id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    category.isActive = false;
    await category.save();

    return NextResponse.json({ message: 'Category deactivated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler);
export const PATCH = requireRole('admin')(updateHandler);
export const DELETE = requireRole('admin')(deleteHandler);

