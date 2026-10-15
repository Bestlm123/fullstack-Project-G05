import { Router } from 'express';
import { db } from '../../db/index.js';
import { events, eventRoles, applications, users, userProfiles, siteSettings } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../utils/authMiddleware.js';

const router = Router();

interface RoleExtraMeta {
  description?: string;
  lineQrUrl?: string;
}

interface EventExtraMeta {
  imageUrl?: string;
  allowedYears?: string[];
  qrCount?: 1 | 2;
  mainLineQrUrl?: string;
  eventDate?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  recruitStartDate?: string;
  recruitStartTime?: string;
  recruitEndDate?: string;
  recruitEndTime?: string;
  roleExtras?: Record<string, RoleExtraMeta>;
}

interface AttendanceMap {
  [applicationId: string]: {
    status: 'none' | 'checked_in' | 'checked_out';
    checkInTime?: string;
    checkOutTime?: string;
    feedbackSubmitted?: boolean;
  };
}

const getEventMetaKey = (eventId: number) => `EVENT_META_${eventId}`;
const ATTENDANCE_KEY = 'STAFF_ATTENDANCE_MAP_V1';
const FEEDBACK_LIST_KEY = 'STAFF_FEEDBACK_ARCHIVE_V1';
const DOC_ARCHIVE_KEY = 'STAFF_DOC_ARCHIVE_V1';
const SUPREME_USERS_KEY = 'SMO_SUPREME_USERS_V1';

// 🌟 รหัสนักศึกษาเริ่มต้นที่เป็น Supreme (แอดมินสูงสุด)
const DEFAULT_SUPREME_IDS = ['670610706'];

const getSupremeList = async (): Promise<string[]> => {
  try {
    const row = await db.select().from(siteSettings).where(eq(siteSettings.key, SUPREME_USERS_KEY));
    if (row.length > 0) {
      const parsed = JSON.parse(row[0].value);
      if (Array.isArray(parsed)) {
        return Array.from(new Set([...DEFAULT_SUPREME_IDS, ...parsed]));
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_SUPREME_IDS;
};

const saveSupremeList = async (list: string[]) => {
  const unique = Array.from(new Set(list));
  await db.insert(siteSettings)
    .values({ key: SUPREME_USERS_KEY, value: JSON.stringify(unique), description: 'Supreme Admin IDs' })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: JSON.stringify(unique), updatedAt: new Date() }
    });
};

const getStudentYearFromId = (studentId: string): string => {
  const prefix = parseInt(studentId.substring(0, 2), 10);
  if (isNaN(prefix)) return '1';
  const currentThaiYearShort = 69;
  const year = currentThaiYearShort - prefix;
  if (year <= 1) return '1';
  if (year >= 4) return '4';
  return String(year);
};

const isEngineeringStudent = (studentId: string, faculty?: string, role?: string): boolean => {
  if (role === 'admin' || role === 'supreme') return true;
  const facLower = (faculty || '').toLowerCase();
  if (facLower.includes('engineer') || facLower.includes('วิศว')) return true;
  if (studentId && studentId.length >= 4 && studentId.substring(2, 4) === '06') return true;
  return false;
};

// เช็คสิทธิ์ของผู้ใช้ที่ล็อกอินอยู่ว่าเป็น supreme, admin หรือ user
router.get('/my-role', requireAuth, async (req, res) => {
  try {
    const sessionUser = (req as { user?: { studentId?: string; role?: string } }).user;
    const studentId = sessionUser?.studentId || '';
    const supremeList = await getSupremeList();

    if (supremeList.includes(studentId)) {
      return res.status(200).json({ effectiveRole: 'supreme' });
    }

    const dbUser = await db.select().from(users).where(eq(users.studentId, studentId));
    const role = dbUser[0]?.role || sessionUser?.role || 'user';
    res.status(200).json({ effectiveRole: role });
  } catch {
    res.status(200).json({ effectiveRole: 'user' });
  }
});

// ส่งกลับเฉพาะ 3 กิจกรรมที่ใกล้ที่สุดจากปฏิทินคณะวิศวกรรมศาสตร์
router.get('/cmu-calendar', async (_req, res) => {
  const defaultOfficialSchedule = [
    { id: 'cmu-1', date: '18', month: 'ต.ค.', title: 'โครงการพัฒนาศักยภาพผู้นำนักศึกษาวิศวกรรมศาสตร์', time: '08:30 - 16:30 น.', link: 'https://activity.eng.cmu.ac.th/calendar' },
    { id: 'cmu-2', date: '24', month: 'ต.ค.', title: 'ประชุมสามัญสโมสรนักศึกษาคณะวิศวกรรมศาสตร์', time: '17:00 - 20:00 น.', link: 'https://activity.eng.cmu.ac.th/calendar' },
    { id: 'cmu-3', date: '08', month: 'พ.ย.', title: 'ซ้อมใหญ่ประเพณีนำนักศึกษาใหม่ขึ้นไปนมัสการพระบรมธาตุดอยสุเทพ', time: '05:00 - 16:00 น.', link: 'https://activity.eng.cmu.ac.th/calendar' }
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch('https://activity.eng.cmu.ac.th/calendar', { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const html = await response.text();
      const titleMatches = [...html.matchAll(/<h[345][^>]*>(.*?)<\/h[345]>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, '').trim())
        .filter(t => t.length > 5 && !t.toLowerCase().includes('calendar'));

      if (titleMatches.length > 0) {
        const parsed = titleMatches.slice(0, 3).map((title, idx) => ({
          id: `live-${idx}`,
          date: String(18 + idx * 3).padStart(2, '0'),
          month: 'ต.ค.',
          title,
          time: 'ดูรายละเอียดในระบบปฏิทินคณะฯ',
          link: 'https://activity.eng.cmu.ac.th/calendar'
        }));
        return res.status(200).json(parsed);
      }
    }
  } catch { /* ignore */ }

  res.status(200).json(defaultOfficialSchedule.slice(0, 3));
});

// ============================================================================
// 🌟 ข้อ 5 & 8: ดึงรายชื่อสมาชิกทั้งหมดจากฐานข้อมูล OAuth (ไม่กรองคนออก) พร้อมสถานะ Supreme
// ============================================================================
router.get('/engineering-users', requireAdmin, async (_req, res) => {
  try {
    // หากเซิร์ฟเวอร์จำลอง OAuth ของอาจารย์มี API ให้ดึงรายชื่อทั้งหมด (ตั้งใน OAUTH_ALL_USERS_URL) จะซิงก์เข้า DB ให้อัตโนมัติ
    if (process.env.OAUTH_ALL_USERS_URL) {
      try {
        const extRes = await fetch(process.env.OAUTH_ALL_USERS_URL);
        if (extRes.ok) {
          const extUsers = await extRes.json();
          if (Array.isArray(extUsers)) {
            for (const eu of extUsers) {
              if (eu.studentId && eu.fullName) {
                await db.insert(users).values({
                  studentId: String(eu.studentId),
                  fullName: String(eu.fullName),
                  faculty: String(eu.faculty || 'Engineering'),
                  email: eu.email ? String(eu.email) : null,
                  role: eu.role === 'admin' ? 'admin' : 'user'
                }).onConflictDoNothing();
              }
            }
          }
        }
      } catch { /* ignore */ }
    }

    const [allUsers, allProfiles, supremeList] = await Promise.all([
      db.select().from(users),
      db.select().from(userProfiles),
      getSupremeList()
    ]);

    const mappedUsers = allUsers.map(u => {
      const prof = allProfiles.find(p => p.studentId === u.studentId);
      const isSupreme = supremeList.includes(u.studentId);
      const effectiveRole = isSupreme ? 'supreme' : u.role;

      return {
        studentId: u.studentId,
        fullName: u.fullName,
        faculty: u.faculty,
        email: u.email,
        role: effectiveRole,
        isEngineering: isEngineeringStudent(u.studentId, u.faculty, effectiveRole),
        year: getStudentYearFromId(u.studentId),
        nickname: prof?.nickname,
        major: prof?.major,
        phoneNumber: prof?.phoneNumber,
        contactChannel: prof?.contactChannel,
        hasShopShirt: prof?.hasShopShirt,
        foodAllergies: prof?.foodAllergies,
        medicalCondition: prof?.medicalCondition
      };
    });

    res.status(200).json(mappedUsers);
  } catch (error) {
    console.error('Fetch OAuth users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 🌟 ข้อ 8: เปลี่ยนบทบาทสมาชิก (บังคับให้เฉพาะ Supreme เท่านั้นที่เปลี่ยนบทบาทได้ และห้ามเปลี่ยนบทบาทคนที่ระดับเดียวกัน)
router.put('/engineering-users/:studentId/role', requireAdmin, async (req, res) => {
  try {
    const actorId = (req as { user?: { studentId?: string } }).user?.studentId || '';
    const targetStudentId = req.params.studentId as string;
    const { role: nextRole } = req.body;

    if (!['supreme', 'admin', 'user'].includes(nextRole)) {
      return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
    }

    if (actorId === targetStudentId) {
      return res.status(403).json({ error: 'ไม่สามารถปรับเปลี่ยนบทบาทของตัวเองได้' });
    }

    const supremeList = await getSupremeList();
    const isActorSupreme = supremeList.includes(actorId);

    if (!isActorSupreme) {
      return res.status(403).json({ error: 'สงวนสิทธิ์เฉพาะแอดมินสูงสุด (SUPREME) เท่านั้นที่สามารถเพิ่มหรือลดบทบาทของผู้อื่นได้' });
    }

    if (supremeList.includes(targetStudentId)) {
      return res.status(403).json({ error: 'ไม่สามารถปรับลดบทบาทของแอดมินสูงสุด (SUPREME) ด้วยกันได้' });
    }

    if (nextRole === 'supreme') {
      await saveSupremeList([...supremeList, targetStudentId]);
      await db.update(users).set({ role: 'admin' }).where(eq(users.studentId, targetStudentId));
    } else {
      const filteredSupreme = supremeList.filter(id => id !== targetStudentId);
      await saveSupremeList(filteredSupreme);
      await db.update(users).set({ role: nextRole }).where(eq(users.studentId, targetStudentId));
    }

    res.status(200).json({ message: 'อัปเดตบทบาทเรียบร้อยแล้ว', role: nextRole });
  } catch {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// 🌟 ข้อ 7: ล็อกด้วย requireAdmin ให้เฉพาะ Admin/Supreme เท่านั้นที่สแกนเข้า-ออกงานได้
router.post('/attendance/scan', requireAdmin, async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData || !String(qrData).startsWith('STAFF|')) {
      return res.status(400).json({ error: 'รูปแบบบัตร QR Code สต๊าฟไม่ถูกต้อง' });
    }

    const parts = String(qrData).split('|');
    const appId = parseInt(parts[1], 10);

    const targetApps = await db.select().from(applications).where(eq(applications.id, appId));
    if (targetApps.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลการเป็นสต๊าฟจาก QR Code นี้' });
    }

    const appRecord = targetApps[0];
    const settingRow = await db.select().from(siteSettings).where(eq(siteSettings.key, ATTENDANCE_KEY));
    let attendanceMap: AttendanceMap = {};
    if (settingRow.length > 0) {
      try { attendanceMap = JSON.parse(settingRow[0].value); } catch { attendanceMap = {}; }
    }

    const currentEntry = attendanceMap[String(appId)] || { status: 'none' };
    let action: 'checked_in' | 'checked_out' = 'checked_in';
    let message = '';

    if (currentEntry.status === 'none') {
      attendanceMap[String(appId)] = {
        status: 'checked_in',
        checkInTime: new Date().toISOString(),
        feedbackSubmitted: false
      };
      action = 'checked_in';
      message = `เช็คอินเข้างาน (Check-in) สำเร็จ! รหัสนักศึกษา ${appRecord.studentId}`;
    } else if (currentEntry.status === 'checked_in') {
      attendanceMap[String(appId)] = {
        ...currentEntry,
        status: 'checked_out',
        checkOutTime: new Date().toISOString(),
        feedbackSubmitted: false
      };
      action = 'checked_out';
      message = `เช็คเอาท์ออกงาน (Check-out) สำเร็จ! ระบบได้ส่งแบบฟอร์มประเมินกิจกรรมให้สต๊าฟแล้ว`;
    } else {
      return res.status(400).json({ error: 'สต๊าฟคนนี้ได้สแกนออกงาน (Check-out) ไปเรียบร้อยแล้ว' });
    }

    await db.insert(siteSettings)
      .values({ key: ATTENDANCE_KEY, value: JSON.stringify(attendanceMap), description: 'Staff Attendance' })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: JSON.stringify(attendanceMap), updatedAt: new Date() }
      });

    res.status(200).json({ message, action, application: appRecord });
  } catch (error) {
    console.error('Staff QR Scan error:', error);
    res.status(500).json({ error: 'Failed to scan staff QR' });
  }
});

router.post('/feedback', requireAuth, async (req, res) => {
  try {
    const { applicationId, eventId, eventTitle, roleName, fullName, rating, comment, suggestionsForNextGen } = req.body;
    const studentId = (req as { user?: { studentId?: string } }).user?.studentId || 'Unknown';

    const fbRow = await db.select().from(siteSettings).where(eq(siteSettings.key, FEEDBACK_LIST_KEY));
    let feedbacks: unknown[] = [];
    if (fbRow.length > 0) {
      try { feedbacks = JSON.parse(fbRow[0].value); } catch { feedbacks = []; }
    }

    const newFb = {
      id: `FB-${Date.now()}`,
      eventId: Number(eventId),
      eventTitle,
      studentId,
      fullName,
      roleName,
      rating: Number(rating) || 5,
      comment,
      suggestionsForNextGen,
      submittedAt: new Date().toISOString()
    };

    feedbacks.unshift(newFb);

    await db.insert(siteSettings)
      .values({ key: FEEDBACK_LIST_KEY, value: JSON.stringify(feedbacks), description: 'Staff Feedbacks' })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: JSON.stringify(feedbacks), updatedAt: new Date() }
      });

    const attRow = await db.select().from(siteSettings).where(eq(siteSettings.key, ATTENDANCE_KEY));
    if (attRow.length > 0) {
      const attMap: AttendanceMap = JSON.parse(attRow[0].value);
      if (attMap[String(applicationId)]) {
        attMap[String(applicationId)].feedbackSubmitted = true;
        await db.update(siteSettings)
          .set({ value: JSON.stringify(attMap), updatedAt: new Date() })
          .where(eq(siteSettings.key, ATTENDANCE_KEY));
      }
    }

    res.status(201).json({ message: 'Feedback saved', feedback: newFb });
  } catch {
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

router.get('/archive', requireAuth, async (_req, res) => {
  try {
    const [fbRow, docRow] = await Promise.all([
      db.select().from(siteSettings).where(eq(siteSettings.key, FEEDBACK_LIST_KEY)),
      db.select().from(siteSettings).where(eq(siteSettings.key, DOC_ARCHIVE_KEY))
    ]);

    const feedbacks = fbRow.length > 0 ? JSON.parse(fbRow[0].value) : [];
    const archives = docRow.length > 0 ? JSON.parse(docRow[0].value) : [];
    res.status(200).json({ feedbacks, archives });
  } catch {
    res.status(200).json({ feedbacks: [], archives: [] });
  }
});

router.post('/archive', requireAdmin, async (req, res) => {
  try {
    const { eventId, eventTitle, docTitle, summaryNote, fileLinkOrData } = req.body;
    const createdBy = (req as { user?: { studentId?: string } }).user?.studentId || 'Admin';

    const docRow = await db.select().from(siteSettings).where(eq(siteSettings.key, DOC_ARCHIVE_KEY));
    let archives: unknown[] = [];
    if (docRow.length > 0) {
      try { archives = JSON.parse(docRow[0].value); } catch { archives = []; }
    }

    const newArc = {
      id: `ARC-${Date.now()}`,
      eventId: Number(eventId) || 0,
      eventTitle: eventTitle || 'ข้อมูลส่วนกลางสโมสรฯ',
      docTitle,
      summaryNote,
      fileLinkOrData: fileLinkOrData || '',
      createdBy,
      createdAt: new Date().toISOString()
    };

    archives.unshift(newArc);

    await db.insert(siteSettings)
      .values({ key: DOC_ARCHIVE_KEY, value: JSON.stringify(archives), description: 'Archive Docs' })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: JSON.stringify(archives), updatedAt: new Date() }
      });

    res.status(201).json({ message: 'Archive saved', archive: newArc });
  } catch {
    res.status(500).json({ error: 'Failed to save archive' });
  }
});

// GET /events
router.get(['/', '/events'], async (_req, res) => {
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
        eventDate: extra.eventDate || '',
        eventStartTime: extra.eventStartTime || '08:00',
        eventEndTime: extra.eventEndTime || '17:00',
        recruitStartDate: extra.recruitStartDate || '',
        recruitStartTime: extra.recruitStartTime || '08:00',
        recruitEndDate: extra.recruitEndDate || '',
        recruitEndTime: extra.recruitEndTime || '23:59',
        roles: evRoles
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('GET /events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /applications
router.get('/applications', requireAuth, async (_req, res) => {
  try {
    const allApps = await db.select().from(applications);
    const allEvents = await db.select().from(events);
    const allRoles = await db.select().from(eventRoles);
    const allProfiles = await db.select().from(userProfiles);
    const allUsers = await db.select().from(users);
    const attRow = await db.select().from(siteSettings).where(eq(siteSettings.key, ATTENDANCE_KEY));

    let attMap: AttendanceMap = {};
    if (attRow.length > 0) {
      try { attMap = JSON.parse(attRow[0].value); } catch { attMap = {}; }
    }

    const enriched = allApps.map(app => {
      const ev = allEvents.find(e => e.id === app.eventId);
      const role = allRoles.find(r => r.id === app.roleId);
      const prof = allProfiles.find(p => p.studentId === app.studentId) || null;
      const usr = allUsers.find(u => u.studentId === app.studentId);
      const att = attMap[String(app.id)] || { status: 'none', feedbackSubmitted: false };

      return {
        ...app,
        eventTitle: ev?.title,
        roleName: role?.roleName,
        fullName: usr?.fullName,
        studentYear: getStudentYearFromId(app.studentId),
        profile: prof,
        attendanceStatus: att.status,
        checkInTime: att.checkInTime,
        checkOutTime: att.checkOutTime,
        feedbackSubmitted: Boolean(att.feedbackSubmitted)
      };
    });

    res.status(200).json(enriched);
  } catch {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /apply
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const { eventId, roleId } = req.body;
    const sessionUser = (req as { user?: { studentId?: string; faculty?: string; role?: string } }).user;
    const studentId = sessionUser?.studentId;

    if (!studentId) return res.status(401).json({ error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อน' });
    if (!eventId || !roleId) return res.status(400).json({ error: 'ข้อมูลกิจกรรมและฝ่ายไม่ครบถ้วน' });

    if (!isEngineeringStudent(studentId, sessionUser?.faculty, sessionUser?.role)) {
      return res.status(403).json({ error: 'ระบบรับสมัครสต๊าฟสงวนสิทธิ์เฉพาะนักศึกษาคณะวิศวกรรมศาสตร์เท่านั้น' });
    }

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

    const metaRow = await db.select().from(siteSettings).where(eq(siteSettings.key, getEventMetaKey(Number(eventId))));
    let extra: EventExtraMeta = {};
    if (metaRow.length > 0) {
      try { extra = JSON.parse(metaRow[0].value); } catch { extra = {}; }
    }

    if (extra.recruitEndDate) {
      const deadline = new Date(`${extra.recruitEndDate}T${extra.recruitEndTime || '23:59'}:00`);
      if (!isNaN(deadline.getTime()) && new Date().getTime() > deadline.getTime()) {
        return res.status(400).json({ error: 'หมดเวลาเปิดรับสมัครสต๊าฟสำหรับกิจกรรมนี้แล้วครับ' });
      }
    }

    const targetRole = await db.select().from(eventRoles).where(eq(eventRoles.id, Number(roleId)));
    if (targetRole.length === 0) return res.status(404).json({ error: 'ไม่พบฝ่ายที่เลือก' });
    const currentRole = targetRole[0];

    const studentYear = getStudentYearFromId(studentId);
    const eventAllowedYears = extra.allowedYears || ['1', '2', '3', '4'];

    if (!eventAllowedYears.includes(studentYear)) {
      return res.status(400).json({ error: `กิจกรรมนี้เปิดรับเฉพาะนักศึกษาชั้นปีที่ ${eventAllowedYears.join(', ')} (คุณอยู่ชั้นปีที่ ${studentYear})` });
    }

    const existingInSameEvent = await db.select().from(applications).where(
      and(eq(applications.studentId, studentId), eq(applications.eventId, Number(eventId)))
    );
    if (existingInSameEvent.length > 0) {
      return res.status(400).json({ error: 'คุณได้สมัครเป็นสต๊าฟในกิจกรรมนี้ไปแล้ว (จำกัด 1 คน สมัครได้ 1 ฝ่ายต่อกิจกรรมเท่านั้น)' });
    }

    if (currentRole.availableQuota <= 0) {
      return res.status(400).json({ error: 'ขออภัย โควต้าของฝ่ายนี้เต็มแล้วครับ' });
    }

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

// POST /cancel
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

// POST /events
router.post(['/', '/events'], requireAdmin, async (req, res) => {
  try {
    const {
      title, description, imageUrl, allowedYears, qrCount, mainLineQrUrl,
      eventDate, eventStartTime, eventEndTime,
      recruitStartDate, recruitStartTime, recruitEndDate, recruitEndTime,
      roles
    } = req.body;
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
      eventDate: eventDate || '',
      eventStartTime: eventStartTime || '08:00',
      eventEndTime: eventEndTime || '17:00',
      recruitStartDate: recruitStartDate || '',
      recruitStartTime: recruitStartTime || '08:00',
      recruitEndDate: recruitEndDate || '',
      recruitEndTime: recruitEndTime || '23:59',
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

// PUT /events/:id
router.put(['/:id', '/events/:id'], requireAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id as string, 10);
    const {
      title, description, status, imageUrl, allowedYears, qrCount, mainLineQrUrl,
      eventDate, eventStartTime, eventEndTime,
      recruitStartDate, recruitStartTime, recruitEndDate, recruitEndTime,
      roles
    } = req.body;

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
          lineQrUrl: r.lineQrUrl || ''
        };
      }
    }

    const extraMeta: EventExtraMeta = {
      imageUrl: imageUrl || '',
      allowedYears: Array.isArray(allowedYears) ? allowedYears : ['1', '2', '3', '4'],
      qrCount: qrCount === 2 ? 2 : 1,
      mainLineQrUrl: mainLineQrUrl || '',
      eventDate: eventDate || '',
      eventStartTime: eventStartTime || '08:00',
      eventEndTime: eventEndTime || '17:00',
      recruitStartDate: recruitStartDate || '',
      recruitStartTime: recruitStartTime || '08:00',
      recruitEndDate: recruitEndDate || '',
      recruitEndTime: recruitEndTime || '23:59',
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

// DELETE /events/:id
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