import { Router } from 'express';
import { db } from '../../db/index.js';
import { assets, users, borrowings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// ==========================================
// 📦 ASSET MANAGEMENT (จัดการพัสดุ)
// ==========================================

// GET /api/items - ดึงรายการพัสดุทั้งหมด
router.get('/items', async (req, res) => {
  try {
    const allAssets = await db.select().from(assets);
    res.status(200).json(allAssets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// POST /api/items - เพิ่มพัสดุใหม่
router.post('/items', async (req, res) => {
  try {
    const { id, name, category, quantity, status } = req.body;

    if (!id || !name || !category) {
      return res.status(400).json({ error: 'ID, name, and category are required' });
    }
    if (id.length > 10) {
      return res.status(400).json({ error: 'ID length must not exceed 10 characters' });
    }

    const totalQty = quantity !== undefined ? Number(quantity) : 1;

    const newAsset = await db
      .insert(assets)
      .values({
        id,
        name,
        category,
        quantity: totalQty,
        availableQuantity: totalQty, // 👈 เริ่มต้นสร้าง ให้พร้อมใช้งาน = จำนวนทั้งหมด
        status: status || 'available',
      })
      .returning();

    res.status(201).json(newAsset[0]);
  } catch (error) {
    console.error("🔥 DB Error:", error); // 👈 เพิ่มบรรทัดนี้เข้าไป
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

// PUT /api/items/:id - แก้ไขข้อมูลพัสดุ
router.put('/items/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, category, quantity, availableQuantity, status } = req.body;

    const updatedAsset = await db
      .update(assets)
      .set({ name, category, quantity, availableQuantity, status })
      .where(eq(assets.id, id))
      .returning();

    if (updatedAsset.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.status(200).json(updatedAsset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE /api/items/:id - ลบพัสดุ
router.delete('/items/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deletedAsset = await db.delete(assets).where(eq(assets.id, id)).returning();

    if (deletedAsset.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ==========================================
// 🔄 BORROW & RETURN SYSTEM (ระบบยืม-คืน)
// ==========================================

// POST /api/borrow - ยืมพัสดุ (ตัดสต็อกตามจำนวนที่ระบุ)
router.post('/borrow', async (req, res) => {
  try {
    const { studentId, fullName, assetId, quantity, borrowDate, returnDate } = req.body;
    const borrowQty = quantity !== undefined ? Number(quantity) : 1;

    if (!studentId || !fullName || !assetId) {
      return res.status(400).json({ error: 'studentId, fullName, and assetId are required' });
    }

    // 1. ตรวจสอบพัสดุและจำนวนคงเหลือ
    const targetAsset = await db.select().from(assets).where(eq(assets.id, assetId));
    if (targetAsset.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const currentAsset = targetAsset[0];
    if (currentAsset.availableQuantity < borrowQty) {
      return res.status(400).json({ 
        error: `Not enough assets available. Requested: ${borrowQty}, Available: ${currentAsset.availableQuantity}` 
      });
    }

    // 2. จัดการผู้ใช้งาน
    let user = await db.select().from(users).where(eq(users.studentId, studentId));
    if (user.length === 0) {
      const newUser = await db.insert(users).values({ studentId, fullName }).returning();
      user = newUser;
    }

    // 3. บันทึกรายการยืม
    const newBorrowing = await db
      .insert(borrowings)
      .values({
        studentId,
        assetId,
        quantity: borrowQty,
        borrowDate: borrowDate ? new Date(borrowDate) : new Date(),
        returnDate: returnDate ? new Date(returnDate) : null,
        status: 'borrowed',
      })
      .returning();

    // 4. ตัดจำนวนพร้อมใช้งาน (availableQuantity)
    const newAvailableQty = currentAsset.availableQuantity - borrowQty;
    const newStatus = newAvailableQty === 0 ? 'unavailable' : 'available';

    await db
      .update(assets)
      .set({ 
        availableQuantity: newAvailableQty,
        status: newStatus 
      })
      .where(eq(assets.id, assetId));

    res.status(201).json({
      message: 'Borrowing successful',
      borrowing: newBorrowing[0],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process borrowing' });
  }
});

// POST /api/return - คืนพัสดุ (บวกสต็อกคืน)
router.post('/return', async (req, res) => {
  try {
    const { borrowingId } = req.body;

    if (!borrowingId) {
      return res.status(400).json({ error: 'borrowingId is required' });
    }

    // 1. ค้นหารายการยืม
    const targetBorrowing = await db.select().from(borrowings).where(eq(borrowings.id, borrowingId));
    if (targetBorrowing.length === 0 || targetBorrowing[0].status === 'returned') {
      return res.status(400).json({ error: 'Invalid or already returned borrowing record' });
    }

    const borrowingRecord = targetBorrowing[0];

    // 2. อัปเดตสถานะการยืมเป็น returned
    const updatedBorrowing = await db
      .update(borrowings)
      .set({
        status: 'returned',
        returnDate: new Date(),
      })
      .where(eq(borrowings.id, borrowingId))
      .returning();

    // 3. บวกคืนจำนวนพร้อมใช้งาน (availableQuantity)
    const targetAsset = await db.select().from(assets).where(eq(assets.id, borrowingRecord.assetId));
    if (targetAsset.length > 0) {
      const currentAsset = targetAsset[0];
      const newAvailableQty = currentAsset.availableQuantity + borrowingRecord.quantity;

      await db
        .update(assets)
        .set({ 
          availableQuantity: newAvailableQty,
          status: 'available' 
        })
        .where(eq(assets.id, borrowingRecord.assetId));
    }

    res.status(200).json({
      message: 'Return successful',
      borrowing: updatedBorrowing[0],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process return' });
  }
});

// GET /api/borrowings - ดึงประวัติ
router.get('/borrowings', async (req, res) => {
  try {
    const history = await db.select().from(borrowings);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch borrowings' });
  }
});

export default router;