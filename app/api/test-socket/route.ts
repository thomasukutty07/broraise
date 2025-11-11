import { NextRequest, NextResponse } from 'next/server';
import { getSocketIO } from '@/lib/socket-helper';
import { requireRole, AuthenticatedRequest } from '@/lib/middleware';

async function handler(req: AuthenticatedRequest) {
  const io = getSocketIO();
  
  if (!io) {
    return NextResponse.json({ 
      status: 'error',
      message: 'Socket.io server not initialized. Make sure you are running: npm run dev',
      connected: false 
    }, { status: 503 });
  }

  // Get all connected clients
  const sockets = await io.fetchSockets();
  const rooms = io.sockets.adapter.rooms;
  
  const roomInfo: Record<string, number> = {};
  rooms.forEach((sockets, room) => {
    if (room.startsWith('role:') || room.startsWith('user:')) {
      roomInfo[room] = sockets.size;
    }
  });

  return NextResponse.json({ 
    status: 'ok',
    message: 'Socket.io server is running',
    connected: true,
    totalClients: sockets.length,
    rooms: roomInfo
  });
}

export const GET = requireRole('admin', 'management')(handler);

