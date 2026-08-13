import { Router } from 'express';
import { db } from '../../db/index.js';
import { events, eventRoles, applications, users } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm'; // 🚨 อย่าลืม import 'and' เพิ่มเข้ามาด้วยนะ

const router = Router();

// ==========================================
// 🎯 API สำหรับนักศึกษากดสมัครเป็นสต๊าฟ
// ==========================================
router.post('/apply', async (req, res) => {
  try {
    // รับข้อมูลจากหน้าเว็บ (ตอนนี้เรายังไม่มีระบบ Login เลยให้ส่ง studentId มาตรงๆ ก่อน)
    const { studentId, eventId, roleId } = req.body;

    // 1. เช็คว่าส่งข้อมูลมาครบไหม
    if (!studentId || !eventId || !roleId) {
      return res.status(400).json({ error: 'studentId, eventId, and roleId are required' });
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

    // 4. ด่านที่ 3: เช็คว่านักศึกษาคนนี้ "เคยกดสมัครตำแหน่งนี้ไปแล้วหรือยัง?" (กันคนกดรัวๆ)
    const existingApp = await db.select().from(applications)
      .where(
        and( // ใช้ and() เพื่อเช็ค 2 เงื่อนไขพร้อมกัน
          eq(applications.studentId, studentId),
          eq(applications.roleId, roleId)
        )
      );
      
    if (existingApp.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this role (คุณสมัครตำแหน่งนี้ไปแล้ว)' });
    }

    // 5. 🎉 ผ่านทุกด่าน! บันทึกข้อมูลการสมัครลง Database
    const newApplication = await db.insert(applications)
      .values({
        eventId,
        roleId,
        studentId,
        status: 'pending' // สถานะ 'pending' คือรอ Admin มากดยืนยันอีกที
      })
      .returning();

    // 6. อัปเดตลดจำนวนโควต้า (availableQuota) ของตำแหน่งนั้นลง 1
    await db.update(eventRoles)
      .set({ availableQuota: currentRole.availableQuota - 1 })
      .where(eq(eventRoles.id, roleId));

    // ตอบกลับหน้าเว็บว่าสำเร็จ
    res.status(201).json({
      message: 'Application submitted successfully!',
      application: newApplication[0]
    });

  } catch (error) {
    console.error("🔥 Apply Error:", error);
    res.status(500).json({ error: 'Failed to process application' });
  }
});
// ==========================================
// 🛠️ API สำหรับ Admin สร้างกิจกรรมและตำแหน่ง
// ==========================================

// 1. API สำหรับสร้างกิจกรรมใหม่
router.post('/events', async (req, res) => {
  try {
    const { title, description, createdBy } = req.body;

    // เช็คข้อมูลเบื้องต้น
    if (!title || !createdBy) {
      return res.status(400).json({ error: 'title and createdBy are required' });
    }

    // บันทึกกิจกรรมลง Database
    const newEvent = await db.insert(events)
      .values({
        title,
        description,
        createdBy,
        status: 'open' // ค่าเริ่มต้นให้เป็นเปิดรับสมัครเลย
      })
      .returning();

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent[0]
    });

  } catch (error) {
    console.error("🔥 Create Event Error:", error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// 2. API สำหรับเพิ่ม "ตำแหน่งและโควต้า" เข้าไปในกิจกรรม
router.post('/events/:eventId/roles', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { roleName, totalQuota } = req.body;

    // เช็คข้อมูลเบื้องต้น
    if (!roleName || totalQuota === undefined) {
      return res.status(400).json({ error: 'roleName and totalQuota are required' });
    }

    // เช็คก่อนว่ากิจกรรมนี้มีอยู่จริงไหม
    const targetEvent = await db.select().from(events).where(eq(events.id, eventId));
    if (targetEvent.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // บันทึกตำแหน่งและโควต้าลง Database
    const newRole = await db.insert(eventRoles)
      .values({
        eventId,
        roleName,
        totalQuota: Number(totalQuota),
        availableQuota: Number(totalQuota) // ตอนสร้างครั้งแรก โควต้าที่ว่างจะเท่ากับโควต้าทั้งหมด
      })
      .returning();

    res.status(201).json({
      message: 'Role added to event successfully',
      role: newRole[0]
    });

  } catch (error) {
    console.error("🔥 Add Role Error:", error);
    res.status(500).json({ error: 'Failed to add role' });
  }
});

// ==========================================
// ✅ API สำหรับ Admin จัดการสถานะการสมัคร (Approve / Reject)
// ==========================================
router.put('/applications/:id/status', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { status } = req.body; // ต้องส่ง 'approved' หรือ 'rejected' เข้ามา

    // 1. ดักไว้ก่อนว่าต้องส่ง status มาถูกต้องเท่านั้น
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    // 2. ค้นหาข้อมูลการสมัครนี้ว่ามีอยู่จริงไหม
    const targetApp = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (targetApp.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const currentApp = targetApp[0];

    // 3. ป้องกัน Admin กดซ้ำ (ถ้าสถานะเดิมตรงกับที่ส่งมาอยู่แล้วก็ไม่ต้องทำอะไร)
    if (currentApp.status === status) {
      return res.status(400).json({ error: `Application is already ${status}` });
    }

    // 4. 🚨 กรณี: Admin กด "ปฏิเสธ" (เปลี่ยนจาก pending -> rejected)
    // ต้องคืนโควต้าให้ตำแหน่งนั้น 1 ที่ (เพราะตอนสมัครเราหักจองไว้แล้ว)
    if (status === 'rejected' && currentApp.status === 'pending') {
      const targetRole = await db.select().from(eventRoles).where(eq(eventRoles.id, currentApp.roleId));
      if (targetRole.length > 0) {
        await db.update(eventRoles)
          .set({ availableQuota: targetRole[0].availableQuota + 1 })
          .where(eq(eventRoles.id, currentApp.roleId));
      }
    }

    // 5. 🚨 กรณี: Admin เปลี่ยนใจ (เปลี่ยนจาก rejected -> approved)
    // เผื่อกรณีกดผิด ต้องไปหักโควต้าใหม่อีกรอบ และต้องเช็คด้วยว่าโควต้ายังเหลือไหม
    if (status === 'approved' && currentApp.status === 'rejected') {
       const targetRole = await db.select().from(eventRoles).where(eq(eventRoles.id, currentApp.roleId));
       if (targetRole.length > 0) {
         if (targetRole[0].availableQuota <= 0) {
           return res.status(400).json({ error: 'Cannot approve. Quota is already full for this role.' });
         }
         // หักโควต้าอีกรอบ
         await db.update(eventRoles)
          .set({ availableQuota: targetRole[0].availableQuota - 1 })
          .where(eq(eventRoles.id, currentApp.roleId));
       }
    }

    // (หมายเหตุ: ถ้าเปลี่ยนจาก pending -> approved ไม่ต้องยุ่งกับโควต้า เพราะหักไว้ให้ตั้งแต่ตอนสมัครแล้ว)

    // 6. อัปเดตสถานะใหม่ลง Database
    const updatedApp = await db.update(applications)
      .set({ status })
      .where(eq(applications.id, applicationId))
      .returning();

    res.status(200).json({
      message: `Application has been ${status} successfully`,
      application: updatedApp[0]
    });

  } catch (error) {
    console.error("🔥 Update Application Status Error:", error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

export default router;