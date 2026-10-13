import { config } from '../config/env.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const globalErrorHandler = (err, req, res, next) => {
  console.error('[UNHANDLED SERVER ERROR]:', err);

  const statusCode = err.status || err.statusCode || 500;
  const isDev = config.nodeEnv === 'development';

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 && !isDev
      ? 'An unexpected internal server error occurred.'
      : err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
};
