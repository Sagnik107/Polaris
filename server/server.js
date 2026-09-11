const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { PORT, CLIENT_URL, NODE_ENV } = require('./config/env');
const { errorHandler } = require('./middleware/errorMiddleware');
const { notFound } = require('./middleware/notFound');
const { initSocketService } = require('./services/socketService');
const { initCronJobs } = require('./services/automationService');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const expeditionRoutes = require('./routes/expeditionRoutes');
const cargoRoutes = require('./routes/cargoRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const assetRoutes = require('./routes/assetRoutes');
const personnelRoutes = require('./routes/personnelRoutes');
const baseRoutes = require('./routes/baseRoutes');
const taskRoutes = require('./routes/taskRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const alertRoutes = require('./routes/alertRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true },
});

// Make io available to routes/services
app.set('io', io);

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(cookieParser());

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'operational', timestamp: new Date().toISOString(), version: '1.0.0' } });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expeditions', expeditionRoutes);
app.use('/api/cargo', cargoRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/bases', baseRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  initSocketService(io);
  initCronJobs(io);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[POLARIS] Port ${PORT} is already in use.`);
      console.warn(`[POLARIS] 💡 To free port ${PORT}, terminate the existing node process.\n`);
      process.exit(1);
    } else {
      console.error('[POLARIS] Server error:', err);
    }
  });

  server.listen(PORT, () => {
    console.log(`[POLARIS] Server running on port ${PORT} in ${NODE_ENV} mode`);
    console.log(`[POLARIS] API: http://localhost:${PORT}/api/health`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
} else {
  initSocketService(io);
}

// POLARIS Polar Command Engine v4.0
module.exports = { app, server };
