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
    return;
  }
  const room = `user:${userId}`;
  const clientsInRoom = io.sockets.adapter.rooms.get(room);
  const clientCount = clientsInRoom ? clientsInRoom.size : 0;
  
  io.to(room).emit(event, data);
}

export function emitToAll(event: string, data: any) {
  const io = getSocketIO();
  if (!io) return;
  io.emit(event, data);
}

