import { Router } from 'express';

// นำเข้าไฟล์ Routes ย่อย
import authRoutes from './auth.js';
import profileRoutes from './profiles.js';
import recruitmentRoutes from './recruitment.js';
import assetRoutes from './assets.js';
import borrowingRoutes from './borrowings.js';
import cmsRoutes from './cms.js';

const router = Router();

// เชื่อมต่อ Routes ย่อยเข้ากับเส้นทาง (Path) หลัก
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/events', recruitmentRoutes);
router.use('/items', assetRoutes);
router.use('/borrowings', borrowingRoutes);
router.use('/cms', cmsRoutes);

export default router;