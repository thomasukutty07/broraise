import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireAuth, requireRole, AuthenticatedRequest } from '@/lib/middleware';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['student', 'staff', 'admin', 'management']),
  branch: z.string().optional(),
});

async function createHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const validatedData = createUserSchema.parse(body);

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    let userData: any = {
      name: validatedData.name,
      email: validatedData.email,
      role: validatedData.role,
      branch: validatedData.branch,
    };

    if (validatedData.password) {
      const { hashPassword } = await import('@/lib/auth');
      userData.password = await hashPassword(validatedData.password);
    }

    const user = await User.create(userData);

    return NextResponse.json(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        isActive: user.isActive,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}

async function listHandler(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const branch = searchParams.get('branch');
    const search = searchParams.get('search');

    const filter: any = {};
    
    // Staff can only fetch staff users (for assignment purposes)
    if (req.user!.role === 'staff') {
      filter.role = 'staff';
      filter.isActive = true; // Only active staff
    }
    
    // Admin and management can filter by any role
    if (role && (req.user!.role === 'admin' || req.user!.role === 'management')) {
      filter.role = role;
    }
    
    if (branch) filter.branch = branch;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    const formattedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      avatar: user.avatar,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export const POST = requireRole('admin')(createHandler);
export const GET = requireAuth(listHandler); // Allow staff to fetch users (with restrictions in handler)

