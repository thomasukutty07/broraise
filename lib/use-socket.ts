'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

export function useSocket() {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorLoggedRef = useRef(false);

  useEffect(() => {
    if (!user || !token) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      return;
    }

    // Attempt Socket.io connection by default
    // If Socket.io server is not available, it will fail gracefully
    // To disable Socket.io, set NEXT_PUBLIC_ENABLE_SOCKET=false
    const shouldConnect = process.env.NEXT_PUBLIC_ENABLE_SOCKET !== 'false';
    
    if (!shouldConnect) {
      // Skip Socket.io connection if explicitly disabled
      return;
    }

    // Initialize socket connection with timeout
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    const newSocket = io(socketUrl, {
      path: '/api/socket',
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true, // Enable reconnection for better reliability
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
      timeout: 10000, // 10 second connection timeout
      forceNew: false,
      autoConnect: true,
    });

    // Set a timeout to handle connection failures gracefully
    let connected = false;
    connectionTimeoutRef.current = setTimeout(() => {
      if (!connected && socketRef.current && !socketRef.current.connected) {
        // Silently handle - Socket.io is optional when using next dev
        // The app will work fine without real-time notifications
      }
    }, 6000);

    newSocket.on('connect', () => {
      connected = true;
      setIsConnected(true);
      errorLoggedRef.current = false; // Reset error flag on successful connection
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      // Log connection errors for debugging (only once to avoid spam)
      if (!errorLoggedRef.current) {
        errorLoggedRef.current = true;
      }
      setIsConnected(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [user, token]);

  return { socket, isConnected };
}

