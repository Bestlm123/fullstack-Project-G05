import { Router } from 'express';
import { db } from '../../db/index.js';
import { applications, userProfiles, users, eventRoles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../utils/authMiddleware.js'; 

const router = Router();

// API: POST /events/apply (นักศึกษาทั่วไป ต้องล็อกอิน)
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const { eventId, roleId, studentId } = req.body;
    const profile = await db.select().from(userProfiles).where(eq(userProfiles.studentId, studentId));
    
    if (profile.length === 0) {
      return res.status(403).json({ requiresProfile: true, message: 'กรุณากรอกข้อมูลส่วนตัวก่อนสมัครกิจกรรม' });
    }

    const newApplication = await db.insert(applications).values({
      eventId, roleId, studentId, status: 'pending'
    }).returning();

    res.status(201).json({ message: 'สมัครกิจกรรมสำเร็จ', application: newApplication[0] });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครกิจกรรม' });
  }
});

// API: GET /events/:eventId/applications (แอดมินดูรายชื่อ)
router.get('/:eventId/applications', requireAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId as string);
    const applicantsList = await db
      .select({
        applicationId: applications.id, status: applications.status, appliedAt: applications.appliedAt,
        studentId: users.studentId, fullName: users.fullName, roleName: eventRoles.roleName,
        nickname: userProfiles.nickname, major: userProfiles.major, hasShopShirt: userProfiles.hasShopShirt,
        medicalCondition: userProfiles.medicalCondition, drugAllergies: userProfiles.drugAllergies,
        foodAllergies: userProfiles.foodAllergies, phoneNumber: userProfiles.phoneNumber
      })
      .from(applications)
      .innerJoin(users, eq(applications.studentId, users.studentId))
      .innerJoin(userProfiles, eq(users.studentId, userProfiles.studentId))
      .innerJoin(eventRoles, eq(applications.roleId, eventRoles.id))
      .where(eq(applications.eventId, eventId));

    res.status(200).json(applicantsList);
  } catch (error) {
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้สมัครได้' });
  }
});

export default router;