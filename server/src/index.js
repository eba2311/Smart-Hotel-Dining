import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDb } from './config/db.js';
import { config } from './config/env.js';
import { setSocketIO, notificationService } from './services/notifications/notificationService.js';
import { isTokenBlocked } from './controllers/authController.js';
import Order from './models/Order.js';

// Enhanced error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

const server = http.createServer(app);

// Enhanced Socket.IO configuration with better error handling
const io = new Server(server, {
  cors: { origin: '*', credentials: true },
  pingTimeout: 30000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e6, // 1MB
});

// Track active connections for monitoring
const activeConnections = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    if (isTokenBlocked(token)) return next(new Error('Token revoked'));
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.data.userId = decoded.id;
      socket.data.role = decoded.role;
      socket.data.connectedAt = Date.now();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  }
  next();
});

io.on('connection', (socket) => {
  const { userId, role } = socket.data;

  // Track connection
  activeConnections.set(socket.id, {
    userId,
    role,
    connectedAt: socket.data.connectedAt || Date.now(),
    rooms: [],
  });

  console.log(`🔗 Socket connected: ${socket.id} (User: ${userId || 'guest'}, Role: ${role || 'none'})`);

  if (role === 'manager' || role === 'admin' || role === 'waiter' || role === 'kitchen') {
    socket.on('join-branch', (branchId) => {
      if (!branchId) return;
      for (const room of socket.rooms) {
        if (room.startsWith('branch:')) socket.leave(room);
      }
      socket.join(notificationService.rooms.branch(branchId));
      activeConnections.get(socket.id)?.rooms.push(notificationService.rooms.branch(branchId));
      console.log(`📢 User ${userId} joined branch ${branchId}`);
    });
    socket.on('leave-branch', (branchId) => {
      if (branchId) {
        socket.leave(notificationService.rooms.branch(branchId));
        const conn = activeConnections.get(socket.id);
        if (conn) {
          conn.rooms = conn.rooms.filter(r => r !== notificationService.rooms.branch(branchId));
        }
      }
    });
  }

  socket.on('join-order', async (orderId, customerId) => {
    if (!orderId) return;
    const isStaff = userId && ['manager', 'admin', 'waiter', 'kitchen'].includes(role);
    if (!isStaff && customerId) {
      const order = await Order.findById(orderId).select('customerId').lean().catch(() => null);
      if (!order || String(order.customerId) !== String(customerId)) return;
    } else if (!isStaff) {
      return;
    }
    socket.join(notificationService.rooms.order(orderId));
    activeConnections.get(socket.id)?.rooms.push(notificationService.rooms.order(orderId));
    console.log(`📦 User ${userId} joined order ${orderId}`);
  });

  socket.on('leave-order', (orderId) => {
    if (orderId) {
      socket.leave(notificationService.rooms.order(orderId));
      const conn = activeConnections.get(socket.id);
      if (conn) {
        conn.rooms = conn.rooms.filter(r => r !== notificationService.rooms.order(orderId));
      }
    }
  });

  socket.on('join-guest', (customerId) => {
    if (!customerId) return;
    if (userId && userId !== customerId && !['manager', 'admin', 'waiter'].includes(role)) return;
    socket.join(notificationService.rooms.guest(customerId));
    activeConnections.get(socket.id)?.rooms.push(notificationService.rooms.guest(customerId));
    console.log(`👤 User ${userId} joined guest channel ${customerId}`);
  });

  socket.on('ping', (cb) => cb && cb('pong'));

  socket.on('disconnect', (reason) => {
    activeConnections.delete(socket.id);
    console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
  });

  socket.on('error', (err) => {
    console.error(`❌ Socket error for ${socket.id}:`, err);
  });
});

setSocketIO(io);

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  res.json({
    status: 'healthy',
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    database: dbStatus,
    connections: {
      socket: activeConnections.size,
      http: server.connections || 0,
    },
    memory: {
      used: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
    },
    timestamp: new Date().toISOString(),
  });
});

async function start() {
  try {
    const dbConnected = await connectDb();
    if (dbConnected) {
      console.log('✅ Database ready');
    } else {
      console.log('⚠️ Running without database - API will have limited functionality');
    }
    server.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Smart Hotel API running on http://localhost:${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔌 WebSocket server ready`);
      console.log(`📡 Database: ${dbConnected ? 'connected' : 'degraded mode'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

function shutdown(signal) {
  console.log(`\n📴 ${signal} received. Shutting down gracefully...`);

  // Notify all connected clients about shutdown
  io.emit('server-shutdown', {
    message: 'Server is shutting down for maintenance. Please refresh in a few minutes.',
    timestamp: new Date().toISOString(),
  });

  io.close(() => {
    console.log('🔌 Socket.IO closed');
    server.close(async () => {
      const { disconnectDb } = await import('./config/db.js');
      await disconnectDb();
      console.log('👋 Server shut down cleanly');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
