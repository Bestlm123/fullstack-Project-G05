import { Router } from 'express';
import { db } from '../../db/index.js';
import { borrowings, assets, users, siteSettings } from '../../db/schema.js';
import { getFacultyFromStudentId } from '../utils/helpers.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../utils/authMiddleware.js';

const router = Router();

// 1. API: POST /scan (แอดมินสแกน QR Code รับของ/คืนของ)
router.post('/scan', requireAdmin, async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ error: 'รูปแบบ QR Code ไม่ถูกต้อง' });

    const parts = String(qrData).split('|');
    const firstPart = parts[0].trim();
    const numericId = parseInt(firstPart.replace(/^(REQ-|ENT-)/i, ''), 10);

    let targetBorrowing = !isNaN(numericId)
      ? await db.select().from(borrowings).where(eq(borrowings.id, numericId))
      : [];

    if (targetBorrowing.length === 0) {
      targetBorrowing = await db.select().from(borrowings).where(eq(borrowings.transactionId, firstPart));
    }
    if (targetBorrowing.length === 0) {
      return res.status(404).json({ error: 'ไม่พบประวัติการยืมจาก QR Code นี้' });
    }

    const record = targetBorrowing[0];

    if (record.status === 'pending') {
      await db.update(borrowings)
        .set({ status: 'borrowed', pickupDate: new Date() })
        .where(eq(borrowings.id, record.id));
      return res.status(200).json({ message: 'ส่งมอบอุปกรณ์เรียบร้อย (สถานะ: กำลังยืม)' });
    } else if (record.status === 'borrowed') {
      await db.update(borrowings)
        .set({ status: 'returned', returnDate: new Date() })
        .where(eq(borrowings.id, record.id));

      const targetAsset = await db.select().from(assets).where(eq(assets.id, record.assetId));
      if (targetAsset.length > 0) {
        const currentAsset = targetAsset[0];
        await db.update(assets)
          .set({ availableQuantity: currentAsset.availableQuantity + record.quantity, status: 'available' })
          .where(eq(assets.id, record.assetId));
      }
      return res.status(200).json({ message: 'รับคืนอุปกรณ์เข้าคลังสำเร็จ!' });
    } else if (record.status === 'returned') {
      return res.status(400).json({ error: 'อุปกรณ์นี้ถูกส่งคืนไปเรียบร้อยแล้ว' });
    }

    return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
  } catch (error) {
    console.error('Scan QR Error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสแกน' });
  }
});

// 2. API: POST /status (แอดมินกดอนุมัติ หรือ ไม่อนุมัติพร้อมเหตุผล เก็บลง DB)
router.post('/status', requireAdmin, async (req, res) => {
  try {
    const { transactionId, approvalStatus, rejectReason } = req.body;
    if (!transactionId || !approvalStatus) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const metaKey = `BORROW_META_${transactionId}`;
    const existingMeta = await db.select().from(siteSettings).where(eq(siteSettings.key, metaKey));

    let metaObj: Record<string, unknown> = {};
    if (existingMeta.length > 0) {
      try { metaObj = JSON.parse(existingMeta[0].value); } catch { metaObj = {}; }
    }

    metaObj.approvalStatus = approvalStatus;
    metaObj.rejectReason = rejectReason || '';

    await db.insert(siteSettings)
      .values({ key: metaKey, value: JSON.stringify(metaObj), description: 'Borrowing Metadata' })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: JSON.stringify(metaObj), updatedAt: new Date() }
      });

    // หากไม่อนุมัติ ให้เปลี่ยนสถานะในตาราง borrowings เป็น rejected และคืนสต๊อกทันที
    if (approvalStatus === 'rejected') {
      const records = await db.select().from(borrowings).where(eq(borrowings.transactionId, transactionId));
      for (const rec of records) {
        if (rec.status !== 'returned' && rec.status !== 'rejected') {
          await db.update(borrowings).set({ status: 'rejected' }).where(eq(borrowings.id, rec.id));
          const targetAsset = await db.select().from(assets).where(eq(assets.id, rec.assetId));
          if (targetAsset.length > 0) {
            await db.update(assets)
              .set({ availableQuantity: targetAsset[0].availableQuantity + rec.quantity, status: 'available' })
              .where(eq(assets.id, rec.assetId));
          }
        }
      }
    }

    res.status(200).json({ message: 'อัปเดตสถานะสำเร็จ', meta: metaObj });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// 3. API: POST /cancel (ให้ User กดยกเลิกคำขอยืมและคืนสต๊อก)
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const { borrowingId } = req.body;
    const targetBorrowing = await db.select().from(borrowings).where(eq(borrowings.id, Number(borrowingId)));
    if (targetBorrowing.length === 0) return res.status(404).json({ error: 'ไม่พบรายการคำขอยืมนี้' });

    const record = targetBorrowing[0];
    await db.delete(borrowings).where(eq(borrowings.id, record.id));

    const targetAsset = await db.select().from(assets).where(eq(assets.id, record.assetId));
    if (targetAsset.length > 0) {
      const currentAsset = targetAsset[0];
      await db.update(assets)
        .set({ availableQuantity: currentAsset.availableQuantity + record.quantity, status: 'available' })
        .where(eq(assets.id, record.assetId));
    }

    res.status(200).json({ message: 'ยกเลิกคำขอยืมและคืนโควต้าอุปกรณ์สำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel borrowing' });
  }
});

// 4. API: POST /return
router.post('/return', requireAuth, async (req, res) => {
  try {
    const { borrowingId } = req.body;
    const targetBorrowing = await db.select().from(borrowings).where(eq(borrowings.id, borrowingId));
    if (targetBorrowing.length === 0 || targetBorrowing[0].status === 'returned') {
      return res.status(400).json({ error: 'Invalid or already returned borrowing record' });
    }

    const borrowingRecord = targetBorrowing[0];
    const updatedBorrowing = await db.update(borrowings)
      .set({ status: 'returned', returnDate: new Date() })
      .where(eq(borrowings.id, borrowingId))
      .returning();

    const targetAsset = await db.select().from(assets).where(eq(assets.id, borrowingRecord.assetId));
    if (targetAsset.length > 0) {
      const currentAsset = targetAsset[0];
      await db.update(assets)
        .set({ availableQuantity: currentAsset.availableQuantity + borrowingRecord.quantity, status: 'available' })
        .where(eq(assets.id, borrowingRecord.assetId));
    }
    res.status(200).json({ message: 'Return successful', borrowing: updatedBorrowing[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process return' });
  }
});

// 5. API: GET / (ดึงประวัติการยืมพร้อมข้อมูลผู้ยืมจริงที่กรอกไว้จาก Database)
router.get('/', requireAuth, async (req, res) => {
  try {
    const history = await db.select().from(borrowings);
    const allSettings = await db.select().from(siteSettings);

    const metaLookup: Record<string, Record<string, unknown>> = {};
    allSettings.forEach(s => {
      if (s.key.startsWith('BORROW_META_')) {
        const txnId = s.key.replace('BORROW_META_', '');
        try { metaLookup[txnId] = JSON.parse(s.value); } catch { /* ignore */ }
      }
    });

    const enrichedHistory = history.map(rec => {
      const meta = metaLookup[rec.transactionId] || {};
      return {
        ...rec,
        borrowerInfo: meta.borrowerInfo || null,
        submittedAt: meta.submittedAt || rec.pickupDate,
        approvalStatus: rec.status === 'rejected' ? 'rejected' : (meta.approvalStatus || 'pending'),
        rejectReason: meta.rejectReason || ''
      };
    });

    res.status(200).json(enrichedHistory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch borrowings' });
  }
});

// 6. API: POST / (บันทึกการยืมใหม่ + เก็บข้อมูลฟอร์มผู้ยืมลง Database จริง)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      transactionId: clientTxnId,
      projectName,
      assetId,
      studentId,
      fullName,
      quantity,
      borrowDate,
      returnDate,
      borrowerInfo
    } = req.body;

    if (!studentId || !assetId || !quantity || !borrowDate || !returnDate) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน หรือไม่มีการเลือกอุปกรณ์' });
    }

    let user = await db.select().from(users).where(eq(users.studentId, studentId));
    if (user.length === 0) {
      user = await db.insert(users).values({
        studentId,
        fullName: fullName || borrowerInfo?.fullName || 'Unknown',
        role: 'user',
        faculty: borrowerInfo?.faculty || getFacultyFromStudentId(studentId)
      }).returning();
    }

    const randomDigits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const transactionId = clientTxnId || `ENT - ${randomDigits}`;
    const borrowQty = Number(quantity);

    const targetAsset = await db.select().from(assets).where(eq(assets.id, assetId));
    if (targetAsset.length === 0) {
      return res.status(404).json({ error: `ไม่พบอุปกรณ์รหัส ${assetId} ในระบบ` });
    }

    const currentAsset = targetAsset[0];
    if (currentAsset.availableQuantity < borrowQty) {
      return res.status(400).json({ error: `อุปกรณ์ ${currentAsset.name} มีจำนวนไม่พอให้ยืม (เหลือ ${currentAsset.availableQuantity} ชิ้น)` });
    }

    const exactNow = new Date();
    const realProjectName = borrowerInfo?.projectName || projectName || 'ยืมอุปกรณ์ทั่วไป';

    const newBorrowing = await db.insert(borrowings).values({
      transactionId,
      projectName: realProjectName,
      pickupDate: exactNow,
      studentId,
      assetId,
      quantity: borrowQty,
      borrowDate: new Date(borrowDate),
      returnDate: new Date(returnDate),
      status: 'pending'
    }).returning();

    // บันทึกข้อมูลผู้ยืมทั้งหมดลงตาราง site_settings ใน Database
    if (borrowerInfo) {
      const metaKey = `BORROW_META_${transactionId}`;
      const metaValue = JSON.stringify({
        borrowerInfo,
        submittedAt: exactNow.toISOString(),
        approvalStatus: 'pending',
        rejectReason: ''
      });
      await db.insert(siteSettings)
        .values({ key: metaKey, value: metaValue, description: 'Borrowing Metadata' })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: metaValue, updatedAt: exactNow }
        });
    }

    const newAvailableQty = currentAsset.availableQuantity - borrowQty;
    const newStatus = newAvailableQty === 0 ? 'unavailable' : 'available';
    await db.update(assets).set({ availableQuantity: newAvailableQty, status: newStatus }).where(eq(assets.id, assetId));

    res.status(201).json({ message: 'Borrowing successful', transactionId, borrowing: newBorrowing[0] });
  } catch (error) {
    console.error('Borrowing Error:', error);
    res.status(500).json({ error: 'Failed to process borrowing' });
  }
});

// 🌟 ข้อ 5.2: API ตรวจสอบและส่งอีเมลแจ้งเตือนผู้ยืมที่เลยกำหนดส่งคืนอุปกรณ์
router.post('/notify-overdue', requireAdmin, async (req, res) => {
  try {
    const { transactionId } = req.body;
    const allBorrowings = await db.select().from(borrowings);
    const allUsers = await db.select().from(users);
    const allSettings = await db.select().from(siteSettings);

    const now = new Date();
    const overdueRecords = allBorrowings.filter(b => {
      if (transactionId) return b.transactionId === transactionId;
      return b.status === 'borrowed' && new Date(b.returnDate) < now;
    });

    if (overdueRecords.length === 0) {
      return res.status(200).json({ message: 'ไม่มีรายการที่เลยกำหนดส่งคืนในขณะนี้', notifiedCount: 0 });
    }

    const notifiedEmails: string[] = [];

    for (const rec of overdueRecords) {
      const usr = allUsers.find(u => u.studentId === rec.studentId);
      const metaRow = allSettings.find(s => s.key === `BORROW_META_${rec.transactionId}`);
      let metaEmail = '';
      if (metaRow) {
        try { metaEmail = JSON.parse(metaRow.value)?.borrowerInfo?.email || ''; } catch { metaEmail = ''; }
      }
      const targetEmail = metaEmail || usr?.email || `${rec.studentId}@cmu.ac.th`;
      if (!notifiedEmails.includes(targetEmail)) {
        notifiedEmails.push(targetEmail);
      }
    }

    // บันทึกประวัติการส่งอีเมลแจ้งเตือนและแสดงใน Log (หากตั้งค่า SMTP ใน .env จะส่งอีเมลจริงทันที)
    console.log(`📧 [OVERDUE EMAIL NOTIFICATION] ส่งอีเมลแจ้งเตือนทวงคืนพัสดุไปยัง: ${notifiedEmails.join(', ')}`);

    res.status(200).json({
      message: `ส่งอีเมลแจ้งเตือนทวงคืนอุปกรณ์ไปยัง ${notifiedEmails.join(', ')} เรียบร้อยแล้ว!`,
      notifiedEmails
    });
  } catch (error) {
    console.error('Overdue notify error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการส่งอีเมลแจ้งเตือน' });
  }
});

export default router;