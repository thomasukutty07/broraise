import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, AuthenticatedRequest } from '@/lib/middleware';
import { getSocketIO } from '@/lib/socket-helper';

async function handler(req: AuthenticatedRequest) {
  try {
    const io = getSocketIO();
    
    if (!io) {
      return NextResponse.json({ 
        error: 'Socket.io server not available',
        hint: 'Make sure you are running: npm run dev (which runs node server.js)'
      }, { status: 503 });
    }

    // Get all connected rooms
    const allRooms = io.sockets.adapter.rooms;
    const userRooms: string[] = [];
    const roleRooms: string[] = [];
    const connectedUsers: any[] = [];

    for (const [roomName, sockets] of allRooms.entries()) {
      if (roomName.startsWith('user:')) {
        userRooms.push(roomName);
        const userId = roomName.replace('user:', '');
        const socketIds = Array.from(sockets);
        connectedUsers.push({
          userId,
          socketIds,
          count: socketIds.length
        });
      } else if (roomName.startsWith('role:')) {
        roleRooms.push(roomName);
      }
    }

    return NextResponse.json({
      socketAvailable: true,
      totalRooms: allRooms.size,
      userRooms,
      roleRooms,
      connectedUsers,
      currentUser: {
        userId: req.user!.userId,
        role: req.user!.role,
        expectedRoom: `user:${req.user!.userId}`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get socket info' }, { status: 500 });
  }
}

export const GET = requireRole('admin', 'management')(handler);

