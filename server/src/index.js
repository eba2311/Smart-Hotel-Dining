import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import app from './app.js';
import { connectDb } from './config/db.js';
import { config } from './config/env.js';
import { setSocketIO, notificationService } from './services/notifications/notificationService.js';

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.clientOrigin, credentials: true },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(); // guests connect without a token
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    socket.data.userId = decoded.id;
    socket.data.role = decoded.role;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { userId, role } = socket.data;

  if (role === 'manager' || role === 'admin' || role === 'waiter' || role === 'kitchen') {
    socket.on('join-branch', (branchId) => {
      if (branchId) socket.join(notificationService.rooms.branch(branchId));
    });
    socket.on('leave-branch', (branchId) => {
      if (branchId) socket.leave(notificationService.rooms.branch(branchId));
    });
  }

  socket.on('join-order', (orderId) => {
    if (orderId) socket.join(notificationService.rooms.order(orderId));
  });

  socket.on('leave-order', (orderId) => {
    if (orderId) socket.leave(notificationService.rooms.order(orderId));
  });

  socket.on('join-guest', (customerId) => {
    if (customerId) socket.join(notificationService.rooms.guest(customerId));
  });

  socket.on('ping', (cb) => cb && cb('pong'));
  socket.on('disconnect', () => {});
});

setSocketIO(io);

async function start() {
  server.listen(config.port, () => {
    console.log(`🚀 Smart Hotel API running on http://localhost:${config.port}`);
  });
  connectDb().catch(() => {});
}

start();
