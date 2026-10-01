import { Router } from 'express';
import { db } from '../../db/index.js';
import { assets } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../utils/authMiddleware.js'; 

const router = Router();

// API: GET /items (ทุกคนดูพัสดุได้)
router.get('/', async (req, res) => {
  try {
    const allAssets = await db.select().from(assets);
    res.status(200).json(allAssets);
  } catch (error) {
    console.error("🚨 GET /items error:", error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// API: POST /items (เฉพาะ Admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, name, category, quantity, status, imageUrl } = req.body;
    if (!id || !name || !category) {
      return res.status(400).json({ error: 'ID, name, and category required' });
    }

    const totalQty = quantity !== undefined ? Number(quantity) : 1;
    
    // 🌟 ดักถ้าไม่ได้ใส่รูปลิงก์มา (ค่าว่าง) ให้ใช้รูป Placeholder Default
    const finalImageUrl = (imageUrl && imageUrl.trim() !== '') 
      ? imageUrl 
      : 'https://placehold.co/400x400?text=No+Image';

    const newAsset = await db.insert(assets).values({
        id, 
        name, 
        category, 
        quantity: totalQty, 
        availableQuantity: totalQty, 
        status: status || 'available', 
        imageUrl: finalImageUrl
      }).returning();
      
    res.status(201).json(newAsset[0]);
  } catch (error: any) {
    console.error("🚨 POST /items error:", error);
    
    // ดัก Error กรณีรหัส ID อุปกรณ์ซ้ำในฐานข้อมูล
    if (error.code === '23505') {
      return res.status(400).json({ error: 'รหัสอุปกรณ์นี้มีอยู่ในระบบแล้ว (ID ซ้ำ)' });
    }
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

// API: PUT /items/:id (เฉพาะ Admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, category, quantity, availableQuantity, status, imageUrl } = req.body;
    
    const finalImageUrl = (imageUrl && imageUrl.trim() !== '') 
      ? imageUrl 
      : 'https://placehold.co/400x400?text=No+Image';

    const updatedAsset = await db.update(assets).set({ 
        name, 
        category, 
        quantity: quantity !== undefined ? Number(quantity) : undefined, 
        availableQuantity: availableQuantity !== undefined ? Number(availableQuantity) : undefined, 
        status, 
        imageUrl: finalImageUrl 
      })
      .where(eq(assets.id, req.params.id as string)).returning(); 
      
    if (updatedAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.status(200).json(updatedAsset[0]);
  } catch (error) {
    console.error("🚨 PUT /items error:", error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// API: DELETE /items/:id (เฉพาะ Admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deletedAsset = await db.delete(assets).where(eq(assets.id, req.params.id as string)).returning();
    if (deletedAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.status(204).send();
  } catch (error) {
    console.error("🚨 DELETE /items error:", error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;