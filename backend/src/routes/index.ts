import { Router } from 'express';

// นำเข้าไฟล์ Routes ย่อย
import authRoutes from './auth.js';
import profileRoutes from './profiles.js';
import assetRoutes from './assets.js';
import borrowingRoutes from './borrowings.js';
import cmsRoutes from './cms.js';
import eventRoutes from './events.js'; // 🌟 นำเข้าไฟล์ events.ts ที่เพิ่งแก้มาใช้งาน

const router = Router();

// เชื่อมต่อ Routes ย่อยเข้ากับเส้นทาง (Path) หลัก
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/items', assetRoutes);
router.use('/borrowings', borrowingRoutes);

// 🌟 ระบบ CMS (Banners, News, Settings)
// ใช้ '/' เพื่อให้หน้าบ้านเรียก /api/banners และ /api/news ได้ตรงๆ
router.use('/', cmsRoutes);

// 🌟 ระบบกิจกรรมและการสมัครสตาฟ (Events & Applications)
// ใช้ '/' เพราะในไฟล์ events.ts เขียน Path เป็น /events, /apply ไว้แล้ว
router.use('/', eventRoutes); 

// 💡 หมายเหตุ: หากโปรเจกต์ของคุณยังมีไฟล์ recruitment.ts อยู่และจำเป็นต้องใช้งานฟังก์ชันอื่นๆ 
// สามารถนำเข้ามาต่อเพิ่มด้านล่างนี้ได้เลยครับ เช่น:
// import recruitmentRoutes from './recruitment.js';
// router.use('/recruitment', recruitmentRoutes);

export default router;