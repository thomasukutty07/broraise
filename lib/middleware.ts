import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function requireAuth(handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context?: any) => {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    (req as AuthenticatedRequest).user = user;
    return handler(req as AuthenticatedRequest, context);
  };
}

export function requireRole(...allowedRoles: string[]) {
  return (handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, context?: any) => {
      const user = getAuthUser(req);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      (req as AuthenticatedRequest).user = user;
      return handler(req as AuthenticatedRequest, context);
    };
  };
}

