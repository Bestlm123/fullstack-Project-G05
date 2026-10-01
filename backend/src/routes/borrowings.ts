import { Router } from 'express';
import { db } from '../../db/index.js';
import { borrowings, assets, users } from '../../db/schema.js';
import { getFacultyFromStudentId } from '../utils/helpers.js';
import { eq } from 'drizzle-orm';

const router = Router();

// API: POST /borrowings/borrow
router.post('/borrow', async (req, res) => {
  try {
    const { studentId, fullName, projectName, pickupDate, returnDate, role, email, faculty, items } = req.body;

    if (!studentId || !fullName || !projectName || !pickupDate || !returnDate || !items || !items.length) {
      return res.status(400).json({ error: 'Missing required fields or items array is empty' });
    }

    let user = await db.select().from(users).where(eq(users.studentId, studentId));
    if (user.length === 0) {
      const newUser = await db.insert(users).values({ 
        studentId, fullName, role: role || 'user', email: email || null, faculty: faculty || getFacultyFromStudentId(studentId)
      }).returning();
      user = newUser;
    }

    const randomDigits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const transactionId = `ENTrent${randomDigits}`;
    const borrowedRecords = [];

    for (const item of items) {
      const { assetId, quantity } = item;
      const borrowQty = Number(quantity);

      const targetAsset = await db.select().from(assets).where(eq(assets.id, assetId));
      if (targetAsset.length === 0) return res.status(404).json({ error: `Asset ID ${assetId} not found` });

      const currentAsset = targetAsset[0];
      if (currentAsset.availableQuantity < borrowQty) {
        return res.status(400).json({ error: `Not enough assets for ${currentAsset.name}.` });
      }

      const newBorrowing = await db.insert(borrowings).values({
          transactionId, projectName, pickupDate: new Date(pickupDate), studentId, assetId, 
          quantity: borrowQty, borrowDate: new Date(), returnDate: new Date(returnDate), status: 'borrowed',
        }).returning();

      borrowedRecords.push(newBorrowing[0]);

      const newAvailableQty = currentAsset.availableQuantity - borrowQty;
      const newStatus = newAvailableQty === 0 ? 'unavailable' : 'available';
      await db.update(assets).set({ availableQuantity: newAvailableQty, status: newStatus }).where(eq(assets.id, assetId));
    }

    res.status(201).json({ message: 'Borrowing successful', transactionId, borrowings: borrowedRecords });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process borrowing' });
  }
});

// API: POST /borrowings/return
router.post('/return', async (req, res) => {
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

// API: GET /borrowings
router.get('/', async (req, res) => {
  try {
    const history = await db.select().from(borrowings);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch borrowings' });
  }
});

export default router;