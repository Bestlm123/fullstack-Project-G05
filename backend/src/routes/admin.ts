import { Router } from 'express';
import { db } from '../../db/index.js';
import { assets } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// 1. READ: ดึงพัสดุทั้งหมด (GET /api/assets หรือ /items)
router.get('/items', async (req, res) => {
  try {
    const allAssets = await db.select().from(assets);
    res.status(200).json(allAssets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// 2. CREATE: เพิ่มพัสดุใหม่ (รับ name, category, status)
router.post('/items', async (req, res) => {
  try {
    const { name, category, status } = req.body;

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const newAsset = await db
      .insert(assets)
      .values({
        name,
        category,
        status: status || 'available', // ถ้าไม่ส่ง status มา ให้ default เป็น 'available'
      })
      .returning();

    res.status(201).json(newAsset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

// 3. UPDATE: แก้ไขพัสดุตาม ID
router.put('/items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, status } = req.body;

    const updatedAsset = await db
      .update(assets)
      .set({ name, category, status })
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

// 4. DELETE: ลบพัสดุตาม ID
router.delete('/items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deletedAsset = await db
      .delete(assets)
      .where(eq(assets.id, id))
      .returning();

    if (deletedAsset.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;