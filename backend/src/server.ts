// AstroMedia Backend API Server v2.0
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { initializeMetrics } from './monitoring/metrics';
import { authenticateSocket } from './middleware/auth';

// Import routes
import authRoutes from './routes/auth.routes';
import campaignRoutes from './routes/campaign.routes';
import assetRoutes from './routes/asset.routes';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';
import webhookRoutes from './routes/webhooks.routes';
import agentRoutes from './routes/agents.routes';
import workflowRoutes from './routes/workflows.routes';
import llmRoutes from './routes/llm.routes';

const app = express();
const httpServer = createServer(app);

// =====================
// Socket.IO Setup
// =====================
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO authentication
io.use(authenticateSocket);

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id, userId: socket.data.userId }, 'Client connected via WebSocket');

  socket.on('subscribe:campaign', (campaignId: string) => {
    socket.join(`campaign:${campaignId}`);
    logger.debug({ campaignId, socketId: socket.id }, 'Client subscribed to campaign updates');
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

// =====================
// Middleware
// =====================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// =====================
// Routes
// =====================

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/llm', llmRoutes);
app.use('/webhooks', webhookRoutes);

// Metrics endpoint (Prometheus)
app.get('/metrics', async (req, res) => {
  try {
    const register = await initializeMetrics();
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end();
  }
});

// =====================
// Error Handling
// =====================
app.use(errorHandler);

// =====================
// Server Startup
// =====================
const PORT = config.port;

if (require.main === module) {
  httpServer.listen(PORT, () => {
    logger.info({
      port: PORT,
      nodeEnv: config.nodeEnv,
      corsOrigin: config.corsOrigin
    }, `🚀 AstroMedia Backend API v2.0 running on port ${PORT}`);
  });
}

// Graceful shutdown
if (require.main === module) {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });
}

export default app;
