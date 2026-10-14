import { Router } from 'express';
import { db } from '../../db/index.js';
import { events, eventRoles, applications, users, userProfiles, siteSettings } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../utils/authMiddleware.js';

const router = Router();

interface RoleExtraMeta {
  description?: string;
  allowedYears?: string[];
  lineQrUrl?: string;
}

interface EventExtraMeta {
  imageUrl?: string;
  allowedYears?: string[];
  qrCount?: 1 | 2;
  mainLineQrUrl?: string;
  roleExtras?: Record<string, RoleExtraMeta>;
}

const getEventMetaKey = (eventId: number) => `EVENT_META_${eventId}`;

// คำนวณชั้นปีจากรหัสนักศึกษา 2 หลักแรก (ปีการศึกษา 2569: 69=ปี1, 68=ปี2, 67=ปี3, 66=ปี4)
const getStudentYearFromId = (studentId: string): string => {
  const prefix = parseInt(studentId.substring(0, 2), 10);
  if (isNaN(prefix)) return '1';
  const currentThaiYearShort = 69;
  const year = currentThaiYearShort - prefix;
  if (year <= 1) return '1';
  if (year >= 4) return '4';
  return String(year);
};

// ตรวจสอบว่าเป็นนักศึกษาคณะวิศวกรรมศาสตร์ (รหัสคณะ 06 หรือ faculty Engineering)
const isEngineeringStudent = (studentId: string, faculty?: string, role?: string): boolean => {
  if (role === 'admin') return true;
  const facLower = (faculty || '').toLowerCase();
  if (facLower.includes('engineer') || facLower.includes('วิศว')) return true;
  if (studentId && studentId.length >= 4 && studentId.substring(2, 4) === '06') return true;
  return false;
};

// 1. GET /events (ดึงรายการกิจกรรมทั้งหมด + ข้อมูลรูปภาพ/ชั้นปี/QR Code จาก DB)
router.get(['/', '/events'], async (req, res) => {
  try {
    const allEvents = await db.select().from(events);
    const allRoles = await db.select().from(eventRoles);
    const allApps = await db.select().from(applications);
    const allSettings = await db.select().from(siteSettings);

    const metaMap: Record<number, EventExtraMeta> = {};
    allSettings.forEach(s => {
      if (s.key.startsWith('EVENT_META_')) {
        const id = parseInt(s.key.replace('EVENT_META_', ''), 10);
        try { metaMap[id] = JSON.parse(s.value); } catch { /* ignore */ }
      }
    });

    const result = allEvents.map(ev => {
      const extra = metaMap[ev.id] || {};
      const evRoles = allRoles
        .filter(r => r.eventId === ev.id)
        .map(r => {
          const rExtra = extra.roleExtras?.[r.roleName] || extra.roleExtras?.[String(r.id)] || {};
          const appliedCount = allApps.filter(a => a.roleId === r.id && a.status !== 'rejected').length;
          return {
            ...r,
            description: rExtra.description || '',
            allowedYears: rExtra.allowedYears || extra.allowedYears || ['1', '2', '3', '4'],
            lineQrUrl: rExtra.lineQrUrl || '',
            appliedCount
          };
        });

      return {
        ...ev,
        imageUrl: extra.imageUrl || '',
        allowedYears: extra.allowedYears || ['1', '2', '3', '4'],
        qrCount: extra.qrCount || 1,
        mainLineQrUrl: extra.mainLineQrUrl || '',
        roles: evRoles
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('GET /events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// 2. GET /applications (ดึงรายชื่อสต๊าฟทั้งหมดพร้อมข้อมูลโปรไฟล์สำหรับหน้า Dashboard)
router.get('/applications', requireAuth, async (req, res) => {
  try {
    const allApps = await db.select().from(applications);
    const allEvents = await db.select().from(events);
    const allRoles = await db.select().from(eventRoles);
    const allProfiles = await db.select().from(userProfiles);
    const allUsers = await db.select().from(users);

    const enriched = allApps.map(app => {
      const ev = allEvents.find(e => e.id === app.eventId);
      const role = allRoles.find(r => r.id === app.roleId);
      const prof = allProfiles.find(p => p.studentId === app.studentId) || null;
      const usr = allUsers.find(u => u.studentId === app.studentId);
      return {
        ...app,
        eventTitle: ev?.title,
        roleName: role?.roleName,
        fullName: usr?.fullName,
        studentYear: getStudentYearFromId(app.studentId),
        profile: prof
      };
    });

    res.status(200).json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// 3. POST /apply (กดสมัครแล้วได้เป็นสต๊าฟทันที + จำกัด 1 ฝ่ายต่อ 1 กิจกรรม)
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const { eventId, roleId } = req.body;
    const sessionUser = (req as { user?: { studentId?: string; faculty?: string; role?: string } }).user;
    const studentId = sessionUser?.studentId;

    if (!studentId) return res.status(401).json({ error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อน' });
    if (!eventId || !roleId) return res.status(400).json({ error: 'ข้อมูลกิจกรรมและฝ่ายไม่ครบถ้วน' });

    // ด่านตรวจคณะวิศวกรรมศาสตร์
    if (!isEngineeringStudent(studentId, sessionUser?.faculty, sessionUser?.role)) {
      return res.status(403).json({ error: 'ระบบรับสมัครสต๊าฟสงวนสิทธิ์เฉพาะนักศึกษาคณะวิศวกรรมศาสตร์เท่านั้น' });
    }

    // ด่านตรวจโปรไฟล์
    const profile = await db.select().from(userProfiles).where(eq(userProfiles.studentId, studentId));
    if (profile.length === 0) {
      return res.status(403).json({
        requiresProfile: true,
        message: 'กรุณากรอกข้อมูลส่วนตัว (เช่น เสื้อช็อป, โรคประจำตัว, อาหารที่แพ้) ให้ครบถ้วนก่อนสมัครเป็นสต๊าฟครับ'
      });
    }

    const targetEvent = await db.select().from(events).where(eq(events.id, Number(eventId)));
    if (targetEvent.length === 0) return res.status(404).json({ error: 'ไม่พบกิจกรรมนี้' });
    if (targetEvent[0].status !== 'open') return res.status(400).json({ error: 'กิจกรรมนี้ปิดรับสมัครแล้ว' });

    // ตรวจสอบชั้นปีที่มีสิทธิ์สมัคร
    const metaRow = await db.select().from(siteSettings).where(eq(siteSettings.key, getEventMetaKey(Number(eventId))));
    let extra: EventExtraMeta = {};
    if (metaRow.length > 0) {
      try { extra = JSON.parse(metaRow[0].value); } catch { extra = {}; }
    }

    const targetRole = await db.select().from(eventRoles).where(eq(eventRoles.id, Number(roleId)));
    if (targetRole.length === 0) return res.status(404).json({ error: 'ไม่พบฝ่ายที่เลือก' });
    const currentRole = targetRole[0];

    const studentYear = getStudentYearFromId(studentId);
    const eventAllowedYears = extra.allowedYears || ['1', '2', '3', '4'];
    const roleAllowedYears = extra.roleExtras?.[currentRole.roleName]?.allowedYears || eventAllowedYears;

    if (!eventAllowedYears.includes(studentYear) || !roleAllowedYears.includes(studentYear)) {
      return res.status(400).json({ error: `ฝ่ายหรือกิจกรรมนี้เปิดรับเฉพาะนักศึกษาชั้นปีที่ ${roleAllowedYears.join(', ')} (คุณอยู่ชั้นปีที่ ${studentYear})` });
    }

    // ด่านตรวจ: ห้ามสมัครหลายฝ่ายในกิจกรรมเดียวกัน (สมัครได้แค่ 1 ฝ่ายต่อ 1 กิจกรรม)
    const existingInSameEvent = await db.select().from(applications).where(
      and(eq(applications.studentId, studentId), eq(applications.eventId, Number(eventId)))
    );
    if (existingInSameEvent.length > 0) {
      return res.status(400).json({ error: 'คุณได้สมัครเป็นสต๊าฟในกิจกรรมนี้ไปแล้ว (จำกัด 1 คน สมัครได้ 1 ฝ่ายต่อกิจกรรมเท่านั้น)' });
    }

    if (currentRole.availableQuota <= 0) {
      return res.status(400).json({ error: 'ขออภัย โควต้าของฝ่ายนี้เต็มแล้วครับ' });
    }

    // บันทึกเป็นสต๊าฟทันที (status: 'approved')
    const newApplication = await db.insert(applications).values({
      eventId: Number(eventId),
      roleId: Number(roleId),
      studentId,
      status: 'approved'
    }).returning();

    await db.update(eventRoles)
      .set({ availableQuota: currentRole.availableQuota - 1 })
      .where(eq(eventRoles.id, currentRole.id));

    res.status(201).json({
      message: 'สมัครเป็นสต๊าฟสำเร็จ!',
      application: newApplication[0]
    });
  } catch (error) {
    console.error('Apply Error:', error);
    res.status(500).json({ error: 'Failed to process application' });
  }
});

// 4. POST /cancel (ให้ User กดยกเลิกการเป็นสต๊าฟและคืนโควต้า +1 ทันที)
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const { applicationId, eventId } = req.body;
    const studentId = (req as { user?: { studentId?: string } }).user?.studentId;
    if (!studentId) return res.status(401).json({ error: 'Unauthorized' });

    const existingApps = applicationId
      ? await db.select().from(applications).where(eq(applications.id, Number(applicationId)))
      : await db.select().from(applications).where(and(eq(applications.eventId, Number(eventId)), eq(applications.studentId, studentId)));

    if (existingApps.length === 0) return res.status(404).json({ error: 'ไม่พบข้อมูลการสมัครสต๊าฟของคุณ' });
    const targetApp = existingApps[0];

    if (targetApp.studentId !== studentId && (req as { user?: { role?: string } }).user?.role !== 'admin') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ยกเลิกรายการของผู้อื่น' });
    }

    await db.delete(applications).where(eq(applications.id, targetApp.id));

    const targetRole = await db.select().from(eventRoles).where(eq(eventRoles.id, targetApp.roleId));
    if (targetRole.length > 0) {
      await db.update(eventRoles)
        .set({ availableQuota: targetRole[0].availableQuota + 1 })
        .where(eq(eventRoles.id, targetApp.roleId));
    }

    res.status(200).json({ message: 'ยกเลิกการเป็นสต๊าฟและคืนโควต้าเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Cancel staff error:', error);
    res.status(500).json({ error: 'Failed to cancel application' });
  }
});

// 5. POST /events (Admin สร้างกิจกรรมพร้อมฝ่าย รูปภาพ ชั้นปี และ QR Code เก็บลง DB)
router.post(['/', '/events'], requireAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, allowedYears, qrCount, mainLineQrUrl, roles } = req.body;
    const createdBy = (req as { user?: { studentId?: string } }).user?.studentId;

    if (!title || !createdBy) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อกิจกรรม' });
    }

    const newEventArr = await db.insert(events).values({
      title,
      description: description || '',
      createdBy,
      status: 'open'
    }).returning();

    const createdEvent = newEventArr[0];
    const roleExtras: Record<string, RoleExtraMeta> = {};

    if (Array.isArray(roles)) {
      for (const r of roles) {
        if (r.roleName && Number(r.totalQuota) > 0) {
          await db.insert(eventRoles).values({
            eventId: createdEvent.id,
            roleName: r.roleName,
            totalQuota: Number(r.totalQuota),
            availableQuota: Number(r.totalQuota)
          });
          roleExtras[r.roleName] = {
            description: r.description || '',
            allowedYears: r.allowedYears || allowedYears || ['1', '2', '3', '4'],
            lineQrUrl: r.lineQrUrl || ''
          };
        }
      }
    }

    const extraMeta: EventExtraMeta = {
      imageUrl: imageUrl || '',
      allowedYears: Array.isArray(allowedYears) ? allowedYears : ['1', '2', '3', '4'],
      qrCount: qrCount === 2 ? 2 : 1,
      mainLineQrUrl: mainLineQrUrl || '',
      roleExtras
    };

    await db.insert(siteSettings)
      .values({ key: getEventMetaKey(createdEvent.id), value: JSON.stringify(extraMeta), description: 'Event Metadata' })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: JSON.stringify(extraMeta), updatedAt: new Date() }
      });

    res.status(201).json({ message: 'สร้างกิจกรรมสำเร็จ', event: createdEvent });
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// 6. PUT /events/:id (Admin แก้ไขกิจกรรม ฝ่าย รูปภาพ ชั้นปี และ QR Code)
router.put(['/:id', '/events/:id'], requireAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id as string, 10);
    const { title, description, status, imageUrl, allowedYears, qrCount, mainLineQrUrl, roles } = req.body;

    const updated = await db.update(events)
      .set({ title, description, status: status || 'open' })
      .where(eq(events.id, eventId))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: 'ไม่พบกิจกรรมนี้' });

    const existingRoles = await db.select().from(eventRoles).where(eq(eventRoles.eventId, eventId));
    const existingApps = await db.select().from(applications).where(eq(applications.eventId, eventId));
    const roleExtras: Record<string, RoleExtraMeta> = {};

    if (Array.isArray(roles)) {
      const incomingIds = roles.filter(r => r.id).map(r => Number(r.id));
      for (const oldRole of existingRoles) {
        if (!incomingIds.includes(oldRole.id)) {
          await db.delete(eventRoles).where(eq(eventRoles.id, oldRole.id));
        }
      }

      for (const r of roles) {
        if (!r.roleName) continue;
        const totalQ = Number(r.totalQuota) || 1;
        if (r.id) {
          const appliedCount = existingApps.filter(a => a.roleId === Number(r.id) && a.status !== 'rejected').length;
          const newAvailable = Math.max(0, totalQ - appliedCount);
          await db.update(eventRoles)
            .set({ roleName: r.roleName, totalQuota: totalQ, availableQuota: newAvailable })
            .where(eq(eventRoles.id, Number(r.id)));
        } else {
          await db.insert(eventRoles).values({
            eventId,
            roleName: r.roleName,
            totalQuota: totalQ,
            availableQuota: totalQ
          });
        }
        roleExtras[r.roleName] = {
          description: r.description || '',
          allowedYears: r.allowedYears || allowedYears || ['1', '2', '3', '4'],
          lineQrUrl: r.lineQrUrl || ''
        };
      }
    }

    const extraMeta: EventExtraMeta = {
      imageUrl: imageUrl || '',
      allowedYears: Array.isArray(allowedYears) ? allowedYears : ['1', '2', '3', '4'],
      qrCount: qrCount === 2 ? 2 : 1,
      mainLineQrUrl: mainLineQrUrl || '',
      roleExtras
    };

    await db.insert(siteSettings)
      .values({ key: getEventMetaKey(eventId), value: JSON.stringify(extraMeta), description: 'Event Metadata' })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: JSON.stringify(extraMeta), updatedAt: new Date() }
      });

    res.status(200).json({ message: 'อัปเดตกิจกรรมสำเร็จ', event: updated[0] });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// 7. DELETE /events/:id (Admin ลบกิจกรรม)
router.delete(['/:id', '/events/:id'], requireAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id as string, 10);
    await db.delete(events).where(eq(events.id, eventId));
    await db.delete(siteSettings).where(eq(siteSettings.key, getEventMetaKey(eventId)));
    res.status(200).json({ message: 'ลบกิจกรรมเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;