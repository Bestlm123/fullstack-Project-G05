import { Router } from 'express';
import { db } from '../../db/index.js';
import { userProfiles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../utils/authMiddleware.js'; 

const router = Router();

// API: GET /profile/:studentId (ต้องล็อกอิน)
router.get('/:studentId', requireAuth, async (req, res) => {
  try {
    const requestedStudentId = req.params.studentId as string;
    
    // 🌟 FIX 1: ดึงข้อมูลคนที่ล็อกอินอยู่จาก Session
    const loggedInUser = (req as any).user;
    
    // 🌟 FIX 2: ป้องกันไม่ให้คนอื่นมาดูข้อมูลส่วนตัว ยกเว้นดูของตัวเอง หรือเป็น Admin
    if (loggedInUser.studentId !== requestedStudentId && loggedInUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: คุณไม่มีสิทธิ์เข้าถึงข้อมูลโปรไฟล์ของผู้อื่น' });
    }

    const profile = await db.select().from(userProfiles).where(eq(userProfiles.studentId, requestedStudentId));
    
    if (profile.length === 0) {
      return res.status(200).json({ hasProfile: false, message: 'Profile not found, please fill in your details.' });
    }
    res.status(200).json({ hasProfile: true, profile: profile[0] });
  } catch (error) {
    console.error("Fetch Profile Error:", error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// API: POST /profile (ต้องล็อกอิน)
router.post('/', requireAuth, async (req, res) => {
  try {
    // 🌟 FIX 3: ไม่รับ studentId จาก req.body แล้ว เพื่อป้องกันการปลอมแปลงรหัส
    const { 
      nickname, hasShopShirt, major, height, 
      medicalCondition, drugAllergies, foodAllergies, contactChannel, phoneNumber 
    } = req.body;

    // 🌟 FIX 4: บังคับใช้ studentId จาก Session ของคนที่กำลังล็อกอินอยู่เท่านั้น
    const studentId = (req as any).user?.studentId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized: ไม่พบข้อมูล Session การล็อกอิน' });
    }

    if (!nickname || hasShopShirt === undefined || !major || !height || !contactChannel || !phoneNumber) {
      return res.status(400).json({ error: 'Missing required fields (กรอกข้อมูลไม่ครบถ้วน)' });
    }

    const upsertedProfile = await db.insert(userProfiles)
      .values({
        studentId, 
        nickname, 
        hasShopShirt, 
        major, 
        height, 
        medicalCondition: medicalCondition || null, 
        drugAllergies: drugAllergies || null, 
        foodAllergies: foodAllergies || null, 
        contactChannel, 
        phoneNumber
      })
      .onConflictDoUpdate({
        target: userProfiles.studentId,
        set: { 
          nickname, 
          hasShopShirt, 
          major, 
          height, 
          medicalCondition: medicalCondition || null, 
          drugAllergies: drugAllergies || null, 
          foodAllergies: foodAllergies || null, 
          contactChannel, 
          phoneNumber, 
          updatedAt: new Date() 
        }
      })
      .returning();

    res.status(200).json({ message: 'Profile saved successfully', profile: upsertedProfile[0] });
  } catch (error) {
    console.error("Profile Save Error:", error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;