import { NextRequest } from 'next/server';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getSocketIO, initializeSocket } from '@/lib/socket-server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';

// This is a workaround for Next.js App Router
// Socket.io needs a persistent HTTP server, which we'll handle differently
// For now, we'll create a simple route that can be used to check Socket.io status

async function handler(req: AuthenticatedRequest) {
  return new Response(JSON.stringify({ 
    status: 'Socket.io server is running',
    connected: getSocketIO() !== null 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET = requireAuth(handler);

