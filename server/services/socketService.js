const jwt = require('jsonwebtoken');
const { JWT_ACCESS_SECRET } = require('../config/env');

let ioInstance = null;

const initSocketService = (io) => {
  ioInstance = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { role, id } = socket.user;
    console.log(`[Socket.IO] Connected: ${id} (${role})`);

    // Join role-based room
    socket.join(`role:${role}`);
    socket.join(`user:${id}`);

    // Join base room if applicable
    if (socket.handshake.auth?.baseId) {
      socket.join(`base:${socket.handshake.auth.baseId}`);
    }

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Disconnected: ${id}`);
    });
  });
};

const getIO = () => ioInstance;

const emitToRoles = (roles, event, data) => {
  if (!ioInstance) return;
  roles.forEach((role) => {
    ioInstance.to(`role:${role}`).emit(event, data);
  });
};

const emitToAll = (event, data) => {
  if (!ioInstance) return;
  ioInstance.emit(event, data);
};

const emitToUser = (userId, event, data) => {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, data);
};

const emitToBase = (baseId, event, data) => {
  if (!ioInstance) return;
  ioInstance.to(`base:${baseId}`).emit(event, data);
};

module.exports = { initSocketService, getIO, emitToRoles, emitToAll, emitToUser, emitToBase };
