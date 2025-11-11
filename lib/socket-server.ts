import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import User from '@/models/User';

interface SocketUser {
  userId: string;
  role: string;
  socketId: string;
}

// Store connected users by role and userId
const connectedUsers = new Map<string, SocketUser>();

let io: SocketIOServer | null = null;

export function initializeSocket(server: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string; role: string };
      
      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.data.user = {
        userId: user._id.toString(),
        role: user.role,
        name: user.name,
        email: user.email,
      };

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const userKey = `${user.userId}`;
    
    connectedUsers.set(userKey, {
      userId: user.userId,
      role: user.role,
      socketId: socket.id,
    });

    // Join role-based rooms
    socket.join(`role:${user.role}`);
    socket.join(`user:${user.userId}`);

    socket.on('disconnect', () => {
      connectedUsers.delete(userKey);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

// Helper functions to emit events
export function emitToRole(role: string, event: string, data: any) {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToAll(event: string, data: any) {
  if (!io) return;
  io.emit(event, data);
}

