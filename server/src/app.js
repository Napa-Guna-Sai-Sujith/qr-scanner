import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import userRoutes from './routes/userRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

// 1. Trust proxy for rate-limiting and IP tracking behind reverse proxies
app.set('trust proxy', 1);

// 2. Security HTTP Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed by frontend bundler/Vite
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 3. CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman), matching frontend, or any vercel.app deployment
      if (
        !origin ||
        origin === config.frontendUrl ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 4. Request parsing with strict payload limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// 5. General rate limiting for all endpoints
app.use('/api', generalLimiter);

// 6. Mount REST API Routes
app.use('/api', healthRoutes);
app.use('/api/auth/qr', qrRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// 7. Fallback 404 & Global Exception Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
