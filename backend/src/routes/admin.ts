import { Router } from 'express';
import { db } from '../../db/index.js';
import { inventoryItems } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/items', async (req, res) => {
  try {
    const items = await db.select().from(inventoryItems);
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.post('/items', async (req, res) => {
  try {
    const { name, description, quantity } = req.body;
    const newItem = await db.insert(inventoryItems).values({ name, description, quantity }).returning();
    res.status(201).json(newItem[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, quantity } = req.body;
    const updatedItem = await db.update(inventoryItems)
      .set({ name, description, quantity })
      .where(eq(inventoryItems.id, id)).returning();
    res.status(200).json(updatedItem[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;