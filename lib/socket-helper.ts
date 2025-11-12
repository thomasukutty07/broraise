// Helper to access Socket.io instance from API routes
// The Socket.io server is initialized in server.js and stored in global.io

declare global {
  var io: any;
}

export function getSocketIO() {
  if (typeof global !== 'undefined' && global.io) {
    return global.io;
  }
  return null;
}

export function emitToRole(role: string, event: string, data: any) {
  const io = getSocketIO();
  if (!io) {
    // Socket.io server not available - this is normal when using next dev without custom server
    // Notifications will work when using npm run dev:socket or in production
    return;
  }
  const room = `role:${role}`;
  const clientsInRoom = io.sockets.adapter.rooms.get(room);
  const clientCount = clientsInRoom ? clientsInRoom.size : 0;
  io.to(room).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: any) {
  const io = getSocketIO();
  if (!io) {
    console.log(`⚠️ Cannot emit ${event} to user ${userId} - Socket.io not available`);
    return;
  }
  
  // Ensure userId is a string
  const userIdStr = String(userId);
  const room = `user:${userIdStr}`;
  const clientsInRoom = io.sockets.adapter.rooms.get(room);
  const clientCount = clientsInRoom ? clientsInRoom.size : 0;
  
  console.log(`📤 Emitting ${event} to user ${userIdStr} (room: ${room}, clients: ${clientCount})`);
  
  if (clientCount === 0) {
    console.warn(`⚠️ WARNING: No clients in room ${room} for user ${userIdStr}! Event will not be delivered.`);
    console.log(`📤 Available rooms:`, Array.from(io.sockets.adapter.rooms.keys()).filter(r => r.startsWith('user:')).slice(0, 10));
  }
  
  io.to(room).emit(event, data);
  
  // Also try emitting to all sockets and let client filter (fallback)
  if (clientCount === 0) {
    console.log(`📤 Fallback: Broadcasting ${event} to all connected sockets`);
    io.emit(event, { ...data, _broadcast: true, _targetUserId: userIdStr });
  }
}

export function emitToAll(event: string, data: any) {
  const io = getSocketIO();
  if (!io) return;
  io.emit(event, data);
}

