import { Router } from 'express';
import { db } from '../../db/index.js';
import { assets, users, borrowings, news, banners, siteSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// ==========================================
// 🧠 ฟังก์ชันช่วยแยกคณะ
// ==========================================
function getFacultyFromStudentId(studentId: string): string {
  if (!studentId || studentId.length < 4) return 'Other';
  const facultyCode = studentId.substring(2, 4);
  const facultyMap: Record<string, string> = {
    '01': 'Humanities', '02': 'Education', '03': 'Fine Arts', '04': 'Social Sciences',
    '05': 'Science', '06': 'Engineering', '07': 'Medicine', '08': 'Agriculture',
    '09': 'Dentistry', '10': 'Pharmacy', '11': 'Associated Medical Sciences', '12': 'Nursing',
    '13': 'Agro-Industry', '14': 'Veterinary Medicine', '15': 'Business Administration',
    '16': 'Economics', '17': 'Architecture', '18': 'Mass Communication', '19': 'Political Science',
    '20': 'Law', '21': 'CAMT', '22': 'Public Health', '23': 'Marine', '24': 'ICDI',
    '25': 'Public Policy', '26': 'Biomedical Engineering', '27': 'Health Sciences', '28': 'Multidisciplinary'
  };
  return facultyMap[facultyCode] || 'Other';
}

// ==========================================
// 🔐 ระบบ Login
// ==========================================
router.post('/auth/login', async (req, res) => {
  try {
    const { email, studentId, fullName, faculty } = req.body;

    if (!email || !studentId || !fullName) {
      return res.status(400).json({ error: 'email, studentId, and fullName are required' });
    }

    const finalFaculty = faculty || getFacultyFromStudentId(studentId);

    const existingUser = await db.select().from(users).where(eq(users.studentId, studentId));

    if (existingUser.length > 0) {
      const updatedUser = await db.update(users)
        .set({ fullName, email, faculty: finalFaculty })
        .where(eq(users.studentId, studentId))
        .returning();
      return res.status(200).json(updatedUser[0]);
    } else {
      const newUser = await db.insert(users)
        .values({ studentId, fullName, email, faculty: finalFaculty, role: 'user' })
        .returning();
      return res.status(201).json(newUser[0]);
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==========================================
// 📦 ASSET MANAGEMENT (จัดการพัสดุ)
// ==========================================
router.get('/assets', async (req, res) => {
  try {
    const allAssets = await db.select().from(assets);
    res.status(200).json(allAssets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.post('/assets', async (req, res) => {
  try {
    const { id, name, category, quantity, status } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID and name are required' });

    const totalQty = quantity !== undefined ? Number(quantity) : 1;
    const newAsset = await db.insert(assets).values({
      id, name, category: category || 'General',
      quantity: totalQty, availableQuantity: totalQty, status: status || 'available'
    }).returning();

    res.status(201).json(newAsset[0]);
  } catch (error) {
    console.error("🔥 DB Error:", error);
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

// 🌟 API สำหรับแก้ไขข้อมูลที่เคยขาดไป อยู่ตรงนี้แล้วครับ! 🌟
router.put('/assets/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, category, quantity, status } = req.body;

    const targetAsset = await db.select().from(assets).where(eq(assets.id, id));
    if (targetAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });

    const currentAsset = targetAsset[0];
    const diffQty = quantity - currentAsset.quantity; 
    const newAvailable = currentAsset.availableQuantity + diffQty;

    const updatedAsset = await db.update(assets)
      .set({ 
        name, 
        category, 
        quantity, 
        availableQuantity: newAvailable >= 0 ? newAvailable : 0, 
        status 
      })
      .where(eq(assets.id, id))
      .returning();

    res.status(200).json(updatedAsset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

router.delete('/assets/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.delete(assets).where(eq(assets.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ==========================================
// 🔄 BORROW & RETURN SYSTEM (ระบบยืม-คืน)
// ==========================================
router.get('/borrowings', async (req, res) => {
  try {
    const history = await db.select().from(borrowings);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch borrowings' });
  }
});

router.post('/borrowings', async (req, res) => {
  try {
    const { assetId, studentId, quantity, borrowDate, returnDate } = req.body;
    const borrowQty = quantity !== undefined ? Number(quantity) : 1;

    if (!assetId || !studentId) return res.status(400).json({ error: 'assetId and studentId are required' });

    const targetAsset = await db.select().from(assets).where(eq(assets.id, assetId));
    if (targetAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });

    const currentAsset = targetAsset[0];
    if (currentAsset.availableQuantity < borrowQty) {
      return res.status(400).json({ error: 'Not enough available quantity' });
    }

    const newBorrowing = await db.insert(borrowings).values({
      assetId, studentId, quantity: borrowQty,
      borrowDate: borrowDate ? new Date(borrowDate) : new Date(),
      returnDate: returnDate ? new Date(returnDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending'
    }).returning();

    await db.update(assets)
      .set({ 
        availableQuantity: currentAsset.availableQuantity - borrowQty,
        status: (currentAsset.availableQuantity - borrowQty === 0) ? 'unavailable' : 'available'
      })
      .where(eq(assets.id, assetId));

    res.status(201).json(newBorrowing[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create borrowing' });
  }
});

router.patch('/borrowings/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const target = await db.select().from(borrowings).where(eq(borrowings.id, id));
    if (target.length === 0) return res.status(404).json({ error: 'Borrowing not found' });

    const record = target[0];

    if (status === 'returned' || status === 'rejected') {
      const targetAsset = await db.select().from(assets).where(eq(assets.id, record.assetId));
      if (targetAsset.length > 0) {
        const asset = targetAsset[0];
        await db.update(assets)
          .set({ availableQuantity: asset.availableQuantity + record.quantity, status: 'available' })
          .where(eq(assets.id, record.assetId));
      }
    }

    const updated = await db.update(borrowings)
      .set({ status })
      .where(eq(borrowings.id, id))
      .returning();

    res.status(200).json(updated[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update borrowing status' });
  }
});

// ==========================================
// 📰 NEWS, BANNERS & SETTINGS
// ==========================================
router.get('/news', async (req, res) => {
  try { const allNews = await db.select().from(news); res.status(200).json(allNews); } 
  catch (error) { res.status(500).json({ error: 'Failed to fetch news' }); }
});

router.post('/news', async (req, res) => {
  try {
    const { title, content, authorId, imageUrl } = req.body;
    const newArticle = await db.insert(news).values({ title, content, authorId, imageUrl }).returning();
    res.status(201).json(newArticle[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to add news' }); }
});

router.delete('/news/:id', async (req, res) => {
  try { await db.delete(news).where(eq(news.id, parseInt(req.params.id))); res.status(204).send(); } 
  catch (error) { res.status(500).json({ error: 'Failed to delete news' }); }
});

router.get('/banners', async (req, res) => {
  try { const allBanners = await db.select().from(banners); res.status(200).json(allBanners); } 
  catch (error) { res.status(500).json({ error: 'Failed to fetch banners' }); }
});

router.post('/banners', async (req, res) => {
  try {
    const { imageUrl, altText, isActive } = req.body;
    const newBanner = await db.insert(banners).values({ imageUrl, altText, isActive: isActive !== undefined ? isActive : true }).returning();
    res.status(201).json(newBanner[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to add banner' }); }
});

router.delete('/banners/:id', async (req, res) => {
  try { await db.delete(banners).where(eq(banners.id, parseInt(req.params.id))); res.status(204).send(); } 
  catch (error) { res.status(500).json({ error: 'Failed to delete banner' }); }
});

router.get('/settings', async (req, res) => {
  try { const settings = await db.select().from(siteSettings); res.status(200).json(settings); } 
  catch (error) { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

router.post('/settings', async (req, res) => {
  try {
    const { key, value, description } = req.body;
    const upsertedSetting = await db.insert(siteSettings)
      .values({ key, value, description })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, description, updatedAt: new Date() } })
      .returning();
    res.status(200).json(upsertedSetting[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to save setting' }); }
});

export default router;