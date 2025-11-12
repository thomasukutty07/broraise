const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://${hostname}:${port}`,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Store connected users
  const connectedUsers = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Store user info in socket data (from JWT payload)
      // Ensure userId is always a string to match MongoDB ObjectId.toString() format
      const userId = String(decoded.userId || decoded.id);
      socket.data.user = {
        userId: userId,
        role: decoded.role,
        name: decoded.name,
        email: decoded.email,
      };
      

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const userKey = user.userId;
    
    connectedUsers.set(userKey, {
      userId: user.userId,
      role: user.role,
      socketId: socket.id,
    });

    // Join role-based rooms
    const userRoom = `user:${user.userId}`;
    const roleRoom = `role:${user.role}`;
    socket.join(userRoom);
    socket.join(roleRoom);
    
    console.log(`🔌 Socket connected - User: ${user.userId}, Socket ID: ${socket.id}, Joined rooms: ${userRoom}, ${roleRoom}`);

    socket.on('disconnect', () => {
      connectedUsers.delete(userKey);
      console.log(`🔌 Socket disconnected - User: ${user.userId}, Socket ID: ${socket.id}`);
    });
  });

  // Make io available globally for use in API routes
  global.io = io;

  // Start reminder checker service after socket.io is initialized
  // Use dynamic import for ES modules (works in Node.js 14+)
  setTimeout(async () => {
    try {
      console.log('🔄 Attempting to start reminder checker...');
      // Dynamic import for ES modules
      const reminderChecker = await import('./lib/reminder-checker.js');
      console.log('📦 Reminder checker module loaded:', Object.keys(reminderChecker));
      if (reminderChecker.startReminderChecker) {
        console.log('✅ Calling startReminderChecker...');
        reminderChecker.startReminderChecker();
        console.log('✅ startReminderChecker called successfully');
      } else {
        console.error('❌ startReminderChecker function not found in module');
      }
    } catch (err) {
      console.error('❌ Failed to start reminder checker:', err);
      console.error('❌ Error stack:', err.stack);
      // Continue even if reminder checker fails to start
    }
  }, 2000); // Wait 2 seconds for everything to initialize

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

