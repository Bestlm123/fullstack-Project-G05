import { Router } from 'express';
import { db } from '../../db/index.js';
import { applications, userProfiles, users, eventRoles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../utils/authMiddleware.js'; 

const router = Router();

// ⚠️ ลบ API POST /apply ออกจากไฟล์นี้แล้ว 
// (ย้ายไปใช้ตัวที่สมบูรณ์แบบ มีการหักโควต้า และเช็กความปลอดภัยในไฟล์ events.ts แทน เพื่อป้องกัน API ชนกัน)

// ==========================================
// API: GET /:eventId/applications (แอดมินดูรายชื่อ)
// ==========================================
router.get('/:eventId/applications', requireAdmin, async (req, res) => {
  try {
    // 🌟 FIX: เพิ่มเลข 10 เพื่อบังคับให้แปลงเป็นเลขฐานสิบ ป้องกันบั๊ก
    const eventId = parseInt(req.params.eventId as string, 10);
    
    const applicantsList = await db
      .select({
        applicationId: applications.id, 
        status: applications.status, 
        appliedAt: applications.appliedAt,
        studentId: users.studentId, 
        fullName: users.fullName, 
        roleName: eventRoles.roleName,
        nickname: userProfiles.nickname, 
        major: userProfiles.major, 
        hasShopShirt: userProfiles.hasShopShirt,
        medicalCondition: userProfiles.medicalCondition, 
        drugAllergies: userProfiles.drugAllergies,
        foodAllergies: userProfiles.foodAllergies, 
        phoneNumber: userProfiles.phoneNumber
      })
      .from(applications)
      .innerJoin(users, eq(applications.studentId, users.studentId))
      .innerJoin(userProfiles, eq(users.studentId, userProfiles.studentId))
      .innerJoin(eventRoles, eq(applications.roleId, eventRoles.id))
      .where(eq(applications.eventId, eventId));

    res.status(200).json(applicantsList);
  } catch (error) {
    console.error("Fetch Applications Error:", error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้สมัครได้' });
  }
});

export default router;