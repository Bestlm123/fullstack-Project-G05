import { Router } from 'express';
import { db } from '../../db/index.js';
import { events, eventRoles, applications, users, userProfiles } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../utils/authMiddleware.js';

const router = Router();

// ==========================================
// 📝 API สำหรับนักศึกษากดสมัครเป็นสต๊าฟ
// ==========================================
router.post('/apply', requireAuth, async (req, res) => { 
  try {
    const { studentId, eventId, roleId } = req.body;

    // 1. เช็คว่าส่งข้อมูลมาครบไหม
    if (!studentId || !eventId || !roleId) {
      return res.status(400).json({ error: 'studentId, eventId, and roleId are required' });
    }

    // ด่านที่ 0: เช็คว่านักศึกษาคนนี้เคยกรอกประวัติ (userProfiles) หรือยัง?
    const profile = await db.select().from(userProfiles).where(eq(userProfiles.studentId, studentId));
    
    if (profile.length === 0) {
      return res.status(403).json({ 
        requiresProfile: true, 
        message: 'กรุณากรอกข้อมูลส่วนตัว (เช่น โรคประจำตัว, อาหารที่แพ้) ให้ครบถ้วนก่อนทำการสมัครกิจกรรมครับ' 
      });
    }

    // 2. ด่านที่ 1: เช็คว่ากิจกรรมนี้มีอยู่จริงไหม และ "เปิดรับสมัครอยู่" หรือเปล่า?
    const targetEvent = await db.select().from(events).where(eq(events.id, eventId));
    if (targetEvent.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (targetEvent[0].status !== 'open') {
      return res.status(400).json({ error: 'This event is no longer accepting applications (ปิดรับสมัครแล้ว)' });
    }

    // 3. ด่านที่ 2: เช็คว่าตำแหน่งที่เลือกมีอยู่จริงไหม และ "โควต้าเต็มหรือยัง?"
    const targetRole = await db.select().from(eventRoles).where(eq(eventRoles.id, roleId));
    if (targetRole.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const currentRole = targetRole[0];
    if (currentRole.availableQuota <= 0) {
      return res.status(400).json({ error: 'Sorry, the quota for this role is already full (โควต้าเต็มแล้ว)' });
    }

    // 4. ด่านที่ 3: เช็คว่านักศึกษาคนนี้ "เคยกดสมัครตำแหน่งนี้ไปแล้วหรือยัง?"
    const existingApp = await db.select().from(applications)
      .where(
        and(
          eq(applications.studentId, studentId),
          eq(applications.roleId, roleId)
        )
      );
      
    if (existingApp.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this role (คุณสมัครตำแหน่งนี้ไปแล้ว)' });
    }

    // 5. ผ่านทุกด่าน! บันทึกข้อมูลการสมัครลง Database
    const newApplication = await db.insert(applications)
      .values({
        eventId,
        roleId,
        studentId,
        status: 'pending'
      })
      .returning();

    // 6. อัปเดตลดจำนวนโควต้า (availableQuota) ของตำแหน่งนั้นลง 1
    await db.update(eventRoles)
      .set({ availableQuota: currentRole.availableQuota - 1 })
      .where(eq(eventRoles.id, roleId));

    res.status(201).json({
      message: 'Application submitted successfully!',
      application: newApplication[0]
    });

  } catch (error) {
    console.error(" Apply Error:", error);
    res.status(500).json({ error: 'Failed to process application' });
  }
});

// ==========================================
// 🛠️ API สำหรับ Admin สร้างกิจกรรมและตำแหน่ง
// ==========================================

// 1. API สำหรับสร้างกิจกรรมใหม่
router.post('/events', requireAdmin, async (req, res) => {
  try {
    const { title, description, createdBy } = req.body;

    if (!title || !createdBy) {
      return res.status(400).json({ error: 'title and createdBy are required' });
    }

    const newEvent = await db.insert(events)
      .values({
        title,
        description,
        createdBy,
        status: 'open'
      })
      .returning();

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent[0]
    });

  } catch (error) {
    console.error(" Create Event Error:", error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// 2. API สำหรับเพิ่ม "ตำแหน่งและโควต้า" เข้าไปในกิจกรรม
router.post('/events/:eventId/roles', requireAdmin, async (req, res) => { 
  try {
    const eventId = parseInt(req.params.eventId as string);
    const { roleName, totalQuota } = req.body;

    if (!roleName || totalQuota === undefined) {
      return res.status(400).json({ error: 'roleName and totalQuota are required' });
    }

    const targetEvent = await db.select().from(events).where(eq(events.id, eventId));
    if (targetEvent.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const newRole = await db.insert(eventRoles)
      .values({
        eventId,
        roleName,
        totalQuota: Number(totalQuota),
        availableQuota: Number(totalQuota)
      })
      .returning();

    res.status(201).json({
      message: 'Role added to event successfully',
      role: newRole[0]
    });

  } catch (error) {
    console.error(" Add Role Error:", error);
    res.status(500).json({ error: 'Failed to add role' });
  }
});

// ==========================================
// ✅ API สำหรับ Admin จัดการสถานะการสมัคร (Approve / Reject)
// ==========================================
router.put('/applications/:id/status', requireAdmin, async (req, res) => { 
  try {
    const applicationId = parseInt(req.params.id as string);
    const { status } = req.body; 

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    const targetApp = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (targetApp.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const currentApp = targetApp[0];

    if (currentApp.status === status) {
      return res.status(400).json({ error: `Application is already ${status}` });
    }

    if (status === 'rejected' && currentApp.status === 'pending') {
      const targetRole = await db.select().from(eventRoles).where(eq(eventRoles.id, currentApp.roleId));
      if (targetRole.length > 0) {
        await db.update(eventRoles)
          .set({ availableQuota: targetRole[0].availableQuota + 1 })
          .where(eq(eventRoles.id, currentApp.roleId));
      }
    }

    if (status === 'approved' && currentApp.status === 'rejected') {
       const targetRole = await db.select().from(eventRoles).where(eq(eventRoles.id, currentApp.roleId));
       if (targetRole.length > 0) {
         if (targetRole[0].availableQuota <= 0) {
           return res.status(400).json({ error: 'Cannot approve. Quota is already full for this role.' });
         }
         await db.update(eventRoles)
          .set({ availableQuota: targetRole[0].availableQuota - 1 })
          .where(eq(eventRoles.id, currentApp.roleId));
       }
    }

    const updatedApp = await db.update(applications)
      .set({ status })
      .where(eq(applications.id, applicationId))
      .returning();

    res.status(200).json({
      message: `Application has been ${status} successfully`,
      application: updatedApp[0]
    });

  } catch (error) {
    console.error(" Update Application Status Error:", error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

export default router;