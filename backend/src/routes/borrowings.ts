import { Router } from 'express';
import { db } from '../../db/index.js';
import { borrowings, assets } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
// ✅ นำเข้าด่านตรวจมาทั้ง 2 ตัว
import { requireAuth, requireAdmin } from '../utils/authMiddleware.js'; 

const router = Router();

// ==========================================
// 🛡️ API 1: ทำรายการยืมของ (ผู้ใช้ทั่วไปทำได้)
// ==========================================
// สังเกตว่าผมเปลี่ยนจาก /borrow เป็น / เฉยๆ เพื่อให้ตรงกับที่หน้าบ้าน Frontend ยิงมาครับ
router.post('/', requireAuth, async (req, res) => {
  try {
    // ❌ เราจะไม่รับ studentId จาก req.body อีกต่อไป (กันการใช้ F12 แฮ็ก)
    const { assetId, quantity, borrowDate, returnDate } = req.body;

    // ✅ ดึงรหัสนักศึกษาจาก Session (Token) ที่ผ่านการยืนยันตัวตนแล้วเท่านั้น!
    const studentId = (req as any).user.studentId;

    if (!assetId || !quantity || !borrowDate || !returnDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const borrowQty = Number(quantity);

    const targetAsset = await db.select().from(assets).where(eq(assets.id, assetId));
    if (targetAsset.length === 0) return res.status(404).json({ error: `Asset ID ${assetId} not found` });

    const currentAsset = targetAsset[0];
    if (currentAsset.availableQuantity < borrowQty) {
      return res.status(400).json({ error: `Not enough assets for ${currentAsset.name}.` });
    }

    // สร้าง Transaction ID แบบสุ่ม
    const randomDigits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const transactionId = `REQ-${randomDigits}`;

    const newBorrowing = await db.insert(borrowings).values({
        transactionId, 
        studentId, // 👉 ใช้รหัสจริงจาก Backend
        assetId, 
        quantity: borrowQty, 
        borrowDate: new Date(borrowDate), 
        returnDate: new Date(returnDate), 
        status: 'borrowed',
      }).returning();

    // ตัดสต๊อกอุปกรณ์
    const newAvailableQty = currentAsset.availableQuantity - borrowQty;
    const newStatus = newAvailableQty === 0 ? 'unavailable' : 'available';
    await db.update(assets).set({ availableQuantity: newAvailableQty, status: newStatus }).where(eq(assets.id, assetId));

    res.status(201).json({ message: 'Borrowing successful', transactionId, borrowing: newBorrowing[0] });
  } catch (error) {
    console.error("Borrow Error:", error);
    res.status(500).json({ error: 'Failed to process borrowing' });
  }
});

// ==========================================
// 🛡️ API 2: รับคืนอุปกรณ์ (เฉพาะ Admin เท่านั้น)
// ==========================================
// ✅ อัปเกรดความปลอดภัย: เปลี่ยนจาก requireAuth เป็น requireAdmin
router.post('/return', requireAdmin, async (req, res) => {
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

// ==========================================
// 🛡️ API 3: ดูประวัติการยืม (กรองความปลอดภัยจาก Backend)
// ==========================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    let history;

    // ✅ อัปเกรดความปลอดภัย: กรองข้อมูลให้ตรงกับสิทธิ์
    if (currentUser.role === 'admin') {
      // ถ้าเป็น Admin ดึงมาดูได้ทั้งหมด
      history = await db.select().from(borrowings);
    } else {
      // ถ้าเป็น User ธรรมดา บังคับดึงเฉพาะประวัติที่ studentId ตรงกับ Session ตัวเองเท่านั้น!
      history = await db.select().from(borrowings).where(eq(borrowings.studentId, currentUser.studentId));
    }

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch borrowings' });
  }
});

export default router;