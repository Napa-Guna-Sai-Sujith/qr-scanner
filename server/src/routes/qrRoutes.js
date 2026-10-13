import { Router } from 'express';
import {
  initiateQrRequest,
  getQrStatus,
  inspectQrToken,
  approveQrRequest,
  rejectQrRequest,
  completeQrRequest,
} from '../controllers/qrController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { qrInitiateLimiter, qrApprovalLimiter } from '../middleware/rateLimiter.js';
import {
  validateBody,
  qrInitiateSchema,
  qrApproveSchema,
  qrRejectSchema,
  qrCompleteSchema,
} from '../middleware/validate.js';

const router = Router();

// Device A (Browser) endpoints
router.post('/initiate', qrInitiateLimiter, validateBody(qrInitiateSchema), initiateQrRequest);
router.get('/:requestId', getQrStatus);
router.post('/complete', validateBody(qrCompleteSchema), completeQrRequest);

// Device B (Scanning Phone / Enrolled Authenticator) endpoints
router.post('/inspect', inspectQrToken);
router.post('/approve', requireAuth, qrApprovalLimiter, validateBody(qrApproveSchema), approveQrRequest);
router.post('/reject', validateBody(qrRejectSchema), rejectQrRequest);

export default router;
