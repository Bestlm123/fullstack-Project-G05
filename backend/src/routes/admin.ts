import { Router } from 'express';
import { db } from '../../db/index.js';
// 🚨 อัปเดต Import ตารางใหม่ (news, banners, siteSettings) เข้ามาด้วย
import { assets, users, borrowings, news, banners, siteSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// ==========================================
// 🧠 ฟังก์ชันช่วยแยกคณะจากรหัสนักศึกษา (อัปเดตรหัสครบ 28 คณะ)
// ==========================================
function getFacultyFromStudentId(studentId: string): string {
  // เช็คก่อนว่ามีรหัสและยาวพอไหม (กัน error)
  if (!studentId || studentId.length < 4) return 'Other';

  // ดึงตัวเลขตำแหน่งที่ 3 และ 4 ออกมาเช็ค (Index ที่ 2 และ 3)
  const facultyCode = studentId.substring(2, 4);

  // ใช้ Object Mapping แทน Switch-Case เพื่อให้อ่านง่ายและโค้ดสะอาดขึ้น
  const facultyMap: Record<string, string> = {
    '01': 'Humanities',                      // คณะมนุษยศาสตร์
    '02': 'Education',                       // คณะศึกษาศาสตร์
    '03': 'Fine Arts',                       // คณะวิจิตรศิลป์
    '04': 'Social Sciences',                 // คณะสังคมศาสตร์
    '05': 'Science',                         // คณะวิทยาศาสตร์
    '06': 'Engineering',                     // คณะวิศวกรรมศาสตร์
    '07': 'Medicine',                        // คณะแพทยศาสตร์
    '08': 'Agriculture',                     // คณะเกษตรศาสตร์
    '09': 'Dentistry',                       // คณะทันตแพทยศาสตร์
    '10': 'Pharmacy',                        // คณะเภสัชศาสตร์
    '11': 'Associated Medical Sciences',     // คณะเทคนิคการแพทย์
    '12': 'Nursing',                         // คณะพยาบาลศาสตร์
    '13': 'Agro-Industry',                   // คณะอุตสาหกรรมเกษตร
    '14': 'Veterinary Medicine',             // คณะสัตวแพทยศาสตร์
    '15': 'Business Administration',         // คณะบริหารธุรกิจ
    '16': 'Economics',                       // คณะเศรษฐศาสตร์
    '17': 'Architecture',                    // คณะสถาปัตยกรรมศาสตร์
    '18': 'Mass Communication',              // คณะการสื่อสารมวลชน
    '19': 'Political Science',               // คณะรัฐศาสตร์และรัฐประศาสนศาสตร์
    '20': 'Law',                             // คณะนิติศาสตร์
    '21': 'CAMT',                            // วิทยาลัยศิลปะ สื่อ และเทคโนโลยี
    '22': 'Public Health',                   // คณะสาธารณสุขศาสตร์
    '23': 'Marine Education and Management', // วิทยาลัยการศึกษาและการจัดการทางทะเล
    '24': 'ICDI',                            // วิทยาลัยนานาชาตินวัตกรรมดิจิทัล
    '25': 'Public Policy',                   // วิทยาลัยนโยบายสาธารณะ
    '26': 'Biomedical Engineering',          // สถาบันวิศวกรรมชีวการแพทย์
    '27': 'Health Sciences Research',        // สถาบันวิจัยวิทยาศาสตร์สุขภาพ
    '28': 'Multidisciplinary Studies',       // สำนักวิชาพหุวิทยาการและสหวิทยาการ
  };

  // ค้นหาชื่อคณะจากรหัส ถ้าไม่เจอรหัสในระบบให้คืนค่าเป็น 'Other'
  return facultyMap[facultyCode] || 'Other';
}

// ==========================================
// 🔐 ระบบ Login (ที่อัปเดตให้สกัดคณะอัตโนมัติแล้ว)
// ==========================================
router.post('/auth/login', async (req, res) => {
  try {
    const { email, fullName, faculty } = req.body;

    // 1. สกัดรหัสนักศึกษาจากอีเมล (เช่น 650610123@cmu.ac.th -> 650610123)
    const studentId = email.split('@')[0]; 

    // 2. 🚨 กำหนดชื่อคณะ (ถ้าหน้าบ้านส่งมาให้ใช้ตามนั้น ถ้าไม่ส่งมาให้ดึงจากฟังก์ชันแทน)
    const finalFaculty = faculty || getFacultyFromStudentId(studentId);

    // 3. ค้นหา หรือ สร้าง User ใหม่ลง Database
    const loggedInUser = await db.insert(users)
      .values({
        studentId: studentId,
        fullName: fullName,
        email: email,
        faculty: finalFaculty, // 👈 ใช้ตัวแปรที่เราผ่านการสกัดชื่อคณะมาแล้ว
        role: 'user'
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { fullName: fullName } // อัปเดตแค่ชื่อเผื่อเปลี่ยนชื่อ
      })
      .returning();

    res.status(200).json({
      message: 'Login successful',
      user: loggedInUser[0]
    });

  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==========================================
// 📦 ASSET MANAGEMENT (จัดการพัสดุ)
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
        availableQuantity: totalQty,
        status: status || 'available',
      })
      .returning();

    res.status(201).json(newAsset[0]);
  } catch (error) {
    console.error("🔥 DB Error:", error);
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

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
router.post('/borrow', async (req, res) => {
  try {
    const { studentId, fullName, assetId, quantity, borrowDate, returnDate } = req.body;
    const borrowQty = quantity !== undefined ? Number(quantity) : 1;

    if (!studentId || !fullName || !assetId) {
      return res.status(400).json({ error: 'studentId, fullName, and assetId are required' });
    }

    const targetAsset = await db.select().from(assets).where(eq(assets.id, assetId));
    if (targetAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });

    const currentAsset = targetAsset[0];
    if (currentAsset.availableQuantity < borrowQty) {
      return res.status(400).json({ 
        error: `Not enough assets available. Requested: ${borrowQty}, Available: ${currentAsset.availableQuantity}` 
      });
    }

    let user = await db.select().from(users).where(eq(users.studentId, studentId));
    if (user.length === 0) {
      const newUser = await db.insert(users).values({ studentId, fullName }).returning();
      user = newUser;
    }

    const newBorrowing = await db
      .insert(borrowings)
      .values({
        studentId,
        assetId,
        quantity: borrowQty,
        borrowDate: borrowDate ? new Date(borrowDate) : new Date(),
        returnDate: returnDate ? new Date(returnDate) : new Date(),
        status: 'borrowed',
      })
      .returning();

    const newAvailableQty = currentAsset.availableQuantity - borrowQty;
    const newStatus = newAvailableQty === 0 ? 'unavailable' : 'available';

    await db
      .update(assets)
      .set({ availableQuantity: newAvailableQty, status: newStatus })
      .where(eq(assets.id, assetId));

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
    const updatedBorrowing = await db
      .update(borrowings)
      .set({ status: 'returned', returnDate: new Date() })
      .where(eq(borrowings.id, borrowingId))
      .returning();

    const targetAsset = await db.select().from(assets).where(eq(assets.id, borrowingRecord.assetId));
    if (targetAsset.length > 0) {
      const currentAsset = targetAsset[0];
      const newAvailableQty = currentAsset.availableQuantity + borrowingRecord.quantity;
      await db
        .update(assets)
        .set({ availableQuantity: newAvailableQty, status: 'available' })
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
// 📰 NEWS SYSTEM (ข่าวประชาสัมพันธ์)
// ==========================================
// ดูข่าวทั้งหมด
router.get('/news', async (req, res) => {
  try {
    const allNews = await db.select().from(news);
    res.status(200).json(allNews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// เพิ่มข่าวใหม่
router.post('/news', async (req, res) => {
  try {
    const { title, content, authorId } = req.body;
    if (!title || !content || !authorId) {
      return res.status(400).json({ error: 'title, content, and authorId are required' });
    }
    const newArticle = await db.insert(news).values({ title, content, authorId }).returning();
    res.status(201).json(newArticle[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add news' });
  }
});

// ลบข่าว
router.delete('/news/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deletedNews = await db.delete(news).where(eq(news.id, id)).returning();
    if (deletedNews.length === 0) return res.status(404).json({ error: 'News not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

// ==========================================
// 🖼️ BANNERS SYSTEM (แบนเนอร์สไลด์รูป)
// ==========================================
// ดึงรูปแบนเนอร์ทั้งหมด
router.get('/banners', async (req, res) => {
  try {
    const allBanners = await db.select().from(banners);
    res.status(200).json(allBanners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// เพิ่มรูปแบนเนอร์
router.post('/banners', async (req, res) => {
  try {
    const { imageUrl, altText, isActive } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
    
    const newBanner = await db.insert(banners).values({
      imageUrl,
      altText,
      isActive: isActive !== undefined ? isActive : true
    }).returning();
    res.status(201).json(newBanner[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add banner' });
  }
});

// ปิด/เปิด การแสดงผลรูปแบนเนอร์ (อัปเดต isActive)
router.put('/banners/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isActive } = req.body;
    const updatedBanner = await db.update(banners)
      .set({ isActive })
      .where(eq(banners.id, id))
      .returning();
      
    if (updatedBanner.length === 0) return res.status(404).json({ error: 'Banner not found' });
    res.status(200).json(updatedBanner[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

// ลบรูปแบนเนอร์ทิ้ง
router.delete('/banners/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deletedBanner = await db.delete(banners).where(eq(banners.id, id)).returning();
    if (deletedBanner.length === 0) return res.status(404).json({ error: 'Banner not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// ==========================================
// ⚙️ SITE SETTINGS (ตั้งค่าเว็บ เช่น นับถอยหลัง)
// ==========================================
// ดึงการตั้งค่าทั้งหมด
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.select().from(siteSettings);
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// บันทึก/อัปเดต การตั้งค่า (ถ้ามีคีย์ซ้ำจะอัปเดตให้ทันที)
router.post('/settings', async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'key and value are required' });

    const upsertedSetting = await db.insert(siteSettings)
      .values({ key, value, description })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, description, updatedAt: new Date() }
      })
      .returning();
      
    res.status(200).json(upsertedSetting[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save setting' });
  }
});



export default router;