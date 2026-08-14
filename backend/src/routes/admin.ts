import { Router } from 'express';
import { db } from '../../db/index.js';
import { assets, users, borrowings, news, banners, siteSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// ==========================================
// 🧠 1. ฟังก์ชันช่วยแยกคณะจากรหัสนักศึกษา (อัปเดตล่าสุด 28 คณะ)
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
    '20': 'Law', '21': 'CAMT', '22': 'Public Health', '23': 'Marine Education and Management', 
    '24': 'ICDI', '25': 'Public Policy', '26': 'Biomedical Engineering', 
    '27': 'Health Sciences Research', '28': 'Multidisciplinary Studies',
  };
  return facultyMap[facultyCode] || 'Other';
}

// ==========================================
// 🔐 2. AUTH SYSTEM (ระบบ Login / บันทึกข้อมูลผู้ใช้)
// ==========================================
router.post('/auth/login', async (req, res) => {
  try {
    const { studentId, email, fullName, faculty, role } = req.body;

    if (!studentId || !fullName) {
      return res.status(400).json({ error: 'studentId and fullName are required' });
    }

    // 🚨 ใช้ studentId เช็คคณะตรงๆ ได้เลย
    const finalFaculty = faculty || getFacultyFromStudentId(studentId);

    const loggedInUser = await db.insert(users)
      .values({
        studentId: studentId,
        fullName: fullName,
        email: email || null,
        faculty: finalFaculty, 
        role: role || 'user'
      })
      .onConflictDoUpdate({
        target: users.studentId, 
        set: { 
          fullName: fullName,
          email: email || null,
          faculty: finalFaculty
        }
      })
      .returning();

    res.status(200).json({
      message: 'Login / Register successful',
      user: loggedInUser[0]
    });

  } catch (error) {
    console.error("🔥 Login Error:", error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

// ==========================================
// 📦 3. ASSET MANAGEMENT (จัดการพัสดุ)
// ==========================================
router.get('/items', async (req, res) => {
  try {
    const allAssets = await db.select().from(assets);
    res.status(200).json(allAssets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.post('/items', async (req, res) => {
  try {
    const { id, name, category, quantity, status } = req.body;

    if (!id || !name || !category) return res.status(400).json({ error: 'ID, name, and category are required' });
    if (id.length > 10) return res.status(400).json({ error: 'ID length must not exceed 10 characters' });

    const totalQty = quantity !== undefined ? Number(quantity) : 1;
    const newAsset = await db.insert(assets).values({
        id, name, category, quantity: totalQty, availableQuantity: totalQty, status: status || 'available',
      }).returning();

    res.status(201).json(newAsset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, category, quantity, availableQuantity, status } = req.body;
    const updatedAsset = await db.update(assets).set({ name, category, quantity, availableQuantity, status })
      .where(eq(assets.id, id)).returning();

    if (updatedAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.status(200).json(updatedAsset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deletedAsset = await db.delete(assets).where(eq(assets.id, id)).returning();
    if (deletedAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ==========================================
// 🔄 4. BORROW & RETURN SYSTEM (ระบบยืม-คืน)
// ==========================================
router.post('/borrow', async (req, res) => {
  try {
    const { studentId, fullName, assetId, quantity, borrowDate, returnDate, role, email, faculty } = req.body;
    const borrowQty = quantity !== undefined ? Number(quantity) : 1;

    if (!studentId || !fullName || !assetId || !returnDate) {
      return res.status(400).json({ error: 'studentId, fullName, assetId, and returnDate are required' });
    }

    const targetAsset = await db.select().from(assets).where(eq(assets.id, assetId));
    if (targetAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });

    const currentAsset = targetAsset[0];
    if (currentAsset.availableQuantity < borrowQty) {
      return res.status(400).json({ 
        error: `Not enough assets available. Requested: ${borrowQty}, Available: ${currentAsset.availableQuantity}` 
      });
    }

    // 🚨 อัปเดต: ให้ใช้ studentId เช็คคณะตรงๆ เผื่อกรณีมายืมของครั้งแรก
    let user = await db.select().from(users).where(eq(users.studentId, studentId));
    if (user.length === 0) {
      const newUser = await db.insert(users).values({ 
        studentId, 
        fullName,
        role: role || 'user', 
        email: email || null,
        faculty: faculty || getFacultyFromStudentId(studentId) // 👈 เช็คคณะจากฟังก์ชันทันที
      }).returning();
      user = newUser;
    }

    const newBorrowing = await db.insert(borrowings).values({
        studentId, assetId, quantity: borrowQty,
        borrowDate: borrowDate ? new Date(borrowDate) : new Date(),
        returnDate: new Date(returnDate), 
        status: 'borrowed',
      }).returning();

    const newAvailableQty = currentAsset.availableQuantity - borrowQty;
    const newStatus = newAvailableQty === 0 ? 'unavailable' : 'available';

    await db.update(assets).set({ availableQuantity: newAvailableQty, status: newStatus }).where(eq(assets.id, assetId));

    res.status(201).json({ message: 'Borrowing successful', borrowing: newBorrowing[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process borrowing' });
  }
});

router.post('/return', async (req, res) => {
  try {
    const { borrowingId } = req.body;
    if (!borrowingId) return res.status(400).json({ error: 'borrowingId is required' });

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

router.get('/borrowings', async (req, res) => {
  try {
    const history = await db.select().from(borrowings);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch borrowings' });
  }
});

// ==========================================
// 📰 5. NEWS SYSTEM (ข่าวประชาสัมพันธ์)
// ==========================================
router.get('/news', async (req, res) => {
  try {
    const allNews = await db.select().from(news);
    res.status(200).json(allNews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

router.post('/news', async (req, res) => {
  try {
    const { title, content, authorId } = req.body;
    if (!title || !content || !authorId) return res.status(400).json({ error: 'title, content, and authorId are required' });
    const newArticle = await db.insert(news).values({ title, content, authorId }).returning();
    res.status(201).json(newArticle[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add news' });
  }
});

router.delete('/news/:id', async (req, res) => {
  try {
    const deletedNews = await db.delete(news).where(eq(news.id, parseInt(req.params.id))).returning();
    if (deletedNews.length === 0) return res.status(404).json({ error: 'News not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

// ==========================================
// 🖼️ 6. BANNERS SYSTEM (แบนเนอร์สไลด์รูป)
// ==========================================
router.get('/banners', async (req, res) => {
  try {
    const allBanners = await db.select().from(banners);
    res.status(200).json(allBanners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

router.post('/banners', async (req, res) => {
  try {
    const { imageUrl, altText, isActive } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
    const newBanner = await db.insert(banners).values({
      imageUrl, altText, isActive: isActive !== undefined ? isActive : true
    }).returning();
    res.status(201).json(newBanner[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add banner' });
  }
});

router.put('/banners/:id', async (req, res) => {
  try {
    const { isActive } = req.body;
    const updatedBanner = await db.update(banners).set({ isActive })
      .where(eq(banners.id, parseInt(req.params.id))).returning();
    if (updatedBanner.length === 0) return res.status(404).json({ error: 'Banner not found' });
    res.status(200).json(updatedBanner[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

router.delete('/banners/:id', async (req, res) => {
  try {
    const deletedBanner = await db.delete(banners).where(eq(banners.id, parseInt(req.params.id))).returning();
    if (deletedBanner.length === 0) return res.status(404).json({ error: 'Banner not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// ==========================================
// ⚙️ 7. SITE SETTINGS (ตั้งค่าเว็บ เช่น นับถอยหลัง)
// ==========================================
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.select().from(siteSettings);
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'key and value are required' });

    const upsertedSetting = await db.insert(siteSettings).values({ key, value, description })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, description, updatedAt: new Date() }
      }).returning();
      
    res.status(200).json(upsertedSetting[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

export default router;