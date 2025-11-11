import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole, AuthenticatedRequest } from '@/lib/middleware';

async function handler(req: AuthenticatedRequest) {
  try {
    await connectDB();
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      mongoUri: process.env.MONGODB_URI ? 'Set (hidden)' : 'Not set'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

export const GET = requireRole('admin')(handler);

