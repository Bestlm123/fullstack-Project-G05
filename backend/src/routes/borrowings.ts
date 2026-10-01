import { Router } from 'express';
import { db } from '../../db/index.js';
import { borrowings, assets, users } from '../../db/schema.js';
import { getFacultyFromStudentId } from '../utils/helpers.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../utils/authMiddleware.js';

const router = Router();

// 🌟 FIX 1: เปลี่ยนจาก '/borrow' เป็น '/' เพื่อให้ตรงกับหน้าบ้านที่ยิงมาที่ /api/borrowings
router.post('/', requireAuth, async (req, res) => {
  try {
    // 🌟 FIX 2: ปรับโครงสร้างรับข้อมูลให้ตรงกับที่หน้าบ้านส่งมา (ส่งทีละรายการ)
    const { assetId, studentId, fullName, quantity, borrowDate, returnDate } = req.body;

    if (!studentId || !assetId || !quantity || !borrowDate || !returnDate) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน หรือไม่มีการเลือกอุปกรณ์' });
    }

    // 1. เช็คและบันทึกผู้ใช้ (ถ้ายังไม่มีในระบบ)
    let user = await db.select().from(users).where(eq(users.studentId, studentId));
    if (user.length === 0) {
      const newUser = await db.insert(users).values({ 
        studentId, 
        fullName: fullName || 'Unknown', 
        role: 'user', 
        faculty: getFacultyFromStudentId(studentId)
      }).returning();
      user = newUser;
    }

    const randomDigits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const transactionId = `ENTrent${randomDigits}`;
    const borrowQty = Number(quantity);

    // 2. เช็คสต๊อกอุปกรณ์
    const targetAsset = await db.select().from(assets).where(eq(assets.id, assetId));
    if (targetAsset.length === 0) {
      return res.status(404).json({ error: `ไม่พบอุปกรณ์รหัส ${assetId} ในระบบ` });
    }

    const currentAsset = targetAsset[0];
    if (currentAsset.availableQuantity < borrowQty) {
      return res.status(400).json({ error: `อุปกรณ์ ${currentAsset.name} มีจำนวนไม่พอให้ยืม (เหลือ ${currentAsset.availableQuantity} ชิ้น)` });
    }

    // 3. บันทึกประวัติการยืมลงตาราง borrowings
    const newBorrowing = await db.insert(borrowings).values({
      transactionId, 
      projectName: 'ยืมอุปกรณ์ทั่วไป', // หน้าบ้านไม่ได้ส่งชื่อโปรเจกต์มา จึงใส่ค่า Default ให้
      pickupDate: new Date(borrowDate), 
      studentId, 
      assetId, 
      quantity: borrowQty, 
      borrowDate: new Date(), 
      returnDate: new Date(returnDate), 
      status: 'borrowed'
    }).returning();

    // 4. ตัดสต๊อกอุปกรณ์ (assets)
    const newAvailableQty = currentAsset.availableQuantity - borrowQty;
    const newStatus = newAvailableQty === 0 ? 'unavailable' : 'available';
    await db.update(assets).set({ availableQuantity: newAvailableQty, status: newStatus }).where(eq(assets.id, assetId));

    res.status(201).json({ message: 'Borrowing successful', transactionId, borrowing: newBorrowing[0] });
  } catch (error) {
    console.error("Borrowing Error:", error);
    res.status(500).json({ error: 'Failed to process borrowing' });
  }
});

// API: POST /borrowings/return (ต้องล็อกอิน)
router.post('/return', requireAuth, async (req, res) => {
  try {
    const { borrowingId } = req.body;
    const targetBorrowing = await db.select().from(borrowings).where(eq(borrowings.id, borrowingId));
    
    if (targetBorrowing.length === 0 || targetBorrowing[0].status === 'returned') {
      return res.status(400).json({ error: 'Invalid or already returned borrowing record' });
    }

    const borrowingRecord = targetBorrowing[0];
    const updatedBorrowing = await db.update(borrowings).set({ status: 'returned', returnDate: new Date() })
      .where(eq(borrowings.id, borrowingId)).returning();

    const targetAsset = await db.select().from(assets).where(eq(assets.id, borrowingRecord.assetId));
    if (targetAsset.length > 0) {
      const currentAsset = targetAsset[0];
      const newAvailableQty = currentAsset.availableQuantity + borrowingRecord.quantity;
      await db.update(assets).set({ availableQuantity: newAvailableQty, status: 'available' })
        .where(eq(assets.id, borrowingRecord.assetId));
    }
    res.status(200).json({ message: 'Return successful', borrowing: updatedBorrowing[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process return' });
  }
});

// API: GET /borrowings (ต้องล็อกอิน)
router.get('/', requireAuth, async (req, res) => {
  try {
    const history = await db.select().from(borrowings);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch borrowings' });
  }
});

router.post('/scan', requireAdmin, async (req, res) => {
  try {
    // qrData ที่ส่งมาจะมีรูปแบบ "REQ-0001|650610999" (รหัสบิล|รหัสนศ.)
    const { qrData } = req.body;
    
    if (!qrData || !qrData.includes('|')) {
      return res.status(400).json({ error: 'รูปแบบ QR Code ไม่ถูกต้อง' });
    }

    // ตัดสตริงเพื่อเอารหัสบิลตัวเลขออกมา (เช่น "REQ-0001" กลายเป็น "1")
    const billText = qrData.split('|')[0]; 
    const borrowingId = parseInt(billText.replace('REQ-', ''), 10);

    const targetBorrowing = await db.select().from(borrowings).where(eq(borrowings.id, borrowingId));
    
    if (targetBorrowing.length === 0) {
      return res.status(404).json({ error: 'ไม่พบประวัติการยืมจาก QR Code นี้' });
    }

    const record = targetBorrowing[0];

    // กรณีที่ 1: สแกนครั้งแรก (มารับของ) pending -> borrowed
    if (record.status === 'pending') {
      await db.update(borrowings)
        .set({ status: 'borrowed', pickupDate: new Date() })
        .where(eq(borrowings.id, borrowingId));
        
      return res.status(200).json({ message: 'อนุมัติการยืมเรียบร้อย (รับของไปแล้ว)' });
    }
    
    // กรณีที่ 2: สแกนครั้งที่สอง (เอาของมาคืน) borrowed -> returned
    else if (record.status === 'borrowed') {
      await db.update(borrowings)
        .set({ status: 'returned', returnDate: new Date() })
        .where(eq(borrowings.id, borrowingId));

      // คืนสต๊อกให้ Asset
      const targetAsset = await db.select().from(assets).where(eq(assets.id, record.assetId));
      if (targetAsset.length > 0) {
        const currentAsset = targetAsset[0];
        const newAvailableQty = currentAsset.availableQuantity + record.quantity;
        await db.update(assets).set({ availableQuantity: newAvailableQty, status: 'available' })
          .where(eq(assets.id, record.assetId));
      }

      return res.status(200).json({ message: 'รับคืนอุปกรณ์สำเร็จ!' });
    }
    
    // กรณีที่ 3: เคยคืนไปแล้ว
    else if (record.status === 'returned') {
      return res.status(400).json({ error: 'อุปกรณ์นี้ถูกส่งคืนไปเรียบร้อยแล้ว' });
    }

    return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });

  } catch (error) {
    console.error("Scan QR Error:", error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสแกน' });
  }
});

export default router;