import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getHistory,
  getDevices,
  revokeDevice,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody, updateProfileSchema } from '../middleware/validate.js';

const router = Router();

router.use(requireAuth); // All routes require authentication

router.get('/profile', getProfile);
router.patch('/profile', validateBody(updateProfileSchema), updateProfile);
router.get('/history', getHistory);
router.get('/devices', getDevices);
router.delete('/devices/:deviceId', revokeDevice);

export default router;
