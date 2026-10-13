import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const qrInitiateSchema = z.object({
  email: z.string().email().toLowerCase().trim().optional(),
});

export const qrApproveSchema = z.object({
  token: z.string().min(10, 'Valid signed QR token string is required'),
  deviceName: z.string().min(1).max(100).optional().default('Mobile Device'),
});

export const qrRejectSchema = z.object({
  token: z.string().min(10, 'Valid signed QR token string is required'),
  reason: z.string().max(255).optional(),
});

export const qrCompleteSchema = z.object({
  requestId: z.string().uuid('Valid Request UUID required'),
  token: z.string().min(10, 'Valid signed QR token is required'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/)
    .optional(),
});

export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Input validation failed',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    return res.status(400).json({ success: false, error: 'Malformed request payload' });
  }
};
