import { Router } from 'express';
import { db } from '../../db/index.js';
import { assets } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// API: GET /items
router.get('/', async (req, res) => {
  try {
    const allAssets = await db.select().from(assets);
    res.status(200).json(allAssets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// API: POST /items
router.post('/', async (req, res) => {
  try {
    const { id, name, category, quantity, status, imageUrl } = req.body;
    if (!id || !name || !category) return res.status(400).json({ error: 'ID, name, and category required' });

    const totalQty = quantity !== undefined ? Number(quantity) : 1;
    const newAsset = await db.insert(assets).values({
        id, name, category, quantity: totalQty, availableQuantity: totalQty, status: status || 'available', imageUrl
      }).returning();
    res.status(201).json(newAsset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

// API: PUT /items/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, category, quantity, availableQuantity, status, imageUrl } = req.body;
    const updatedAsset = await db.update(assets).set({ name, category, quantity, availableQuantity, status, imageUrl })
      .where(eq(assets.id, req.params.id)).returning();
    if (updatedAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.status(200).json(updatedAsset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// API: DELETE /items/:id
router.delete('/:id', async (req, res) => {
  try {
    const deletedAsset = await db.delete(assets).where(eq(assets.id, req.params.id)).returning();
    if (deletedAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;