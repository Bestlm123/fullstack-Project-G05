// import { Router } from 'express';
// import { db } from '../../db/index.js';
// import { assets, users, borrowings, news, banners, siteSettings, userProfiles, applications, eventRoles } from '../../db/schema.js';
// import { eq } from 'drizzle-orm';

// const router = Router();

// // ==========================================
// //  1. ฟังก์ชันช่วยแยกคณะจากรหัสนักศึกษา (อัปเดตล่าสุด 28 คณะ)
// // ==========================================
// function getFacultyFromStudentId(studentId: string): string {
//   if (!studentId || studentId.length < 4) return 'Other';
//   const facultyCode = studentId.substring(2, 4);

//   const facultyMap: Record<string, string> = {
//     '01': 'Humanities', '02': 'Education', '03': 'Fine Arts', '04': 'Social Sciences',
//     '05': 'Science', '06': 'Engineering', '07': 'Medicine', '08': 'Agriculture',
//     '09': 'Dentistry', '10': 'Pharmacy', '11': 'Associated Medical Sciences', '12': 'Nursing',
//     '13': 'Agro-Industry', '14': 'Veterinary Medicine', '15': 'Business Administration',
//     '16': 'Economics', '17': 'Architecture', '18': 'Mass Communication', '19': 'Political Science',
//     '20': 'Law', '21': 'CAMT', '22': 'Public Health', '23': 'Marine Education and Management', 
//     '24': 'ICDI', '25': 'Public Policy', '26': 'Biomedical Engineering', 
//     '27': 'Health Sciences Research', '28': 'Multidisciplinary Studies',
//   };
//   return facultyMap[facultyCode] || 'Other';
// }

// // ==========================================
// //  2. AUTH SYSTEM (ระบบ Login / บันทึกข้อมูลผู้ใช้)
// // ==========================================
// router.post('/auth/login', async (req, res) => {
//   try {
//     const { studentId, email, fullName, faculty, role } = req.body;

//     if (!studentId || !fullName) {
//       return res.status(400).json({ error: 'studentId and fullName are required' });
//     }

//     //  ใช้ studentId เช็คคณะตรงๆ ได้เลย
//     const finalFaculty = faculty || getFacultyFromStudentId(studentId);

//     const loggedInUser = await db.insert(users)
//       .values({
//         studentId: studentId,
//         fullName: fullName,
//         email: email || null,
//         faculty: finalFaculty, 
//         role: role || 'user'
//       })
//       .onConflictDoUpdate({
//         target: users.studentId, 
//         set: { 
//           fullName: fullName,
//           email: email || null,
//           faculty: finalFaculty
//         }
//       })
//       .returning();

//     res.status(200).json({
//       message: 'Login / Register successful',
//       user: loggedInUser[0]
//     });

//   } catch (error) {
//     console.error(" Login Error:", error);
//     res.status(500).json({ error: 'Failed to process login' });
//   }
// });

// // ==========================================
// //  3. ASSET MANAGEMENT (จัดการพัสดุ)
// // ==========================================
// router.get('/items', async (req, res) => {
//   try {
//     const allAssets = await db.select().from(assets);
//     res.status(200).json(allAssets);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch assets' });
//   }
// });

// router.post('/items', async (req, res) => {
//   try {
//     //  รับค่า imageUrl มาจากหน้าบ้านด้วย
//     const { id, name, category, quantity, status, imageUrl } = req.body;

//     if (!id || !name || !category) return res.status(400).json({ error: 'ID, name, and category are required' });
//     if (id.length > 10) return res.status(400).json({ error: 'ID length must not exceed 10 characters' });

//     const totalQty = quantity !== undefined ? Number(quantity) : 1;
//     const newAsset = await db.insert(assets).values({
//         id, 
//         name, 
//         category, 
//         quantity: totalQty, 
//         availableQuantity: totalQty, 
//         status: status || 'available',
//         imageUrl //  บันทึกลงฐานข้อมูล
//       }).returning();

//     res.status(201).json(newAsset[0]);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to add asset' });
//   }
// });

// router.put('/items/:id', async (req, res) => {
//   try {
//     const id = req.params.id;
//     //  รับ imageUrl มาเพื่ออัปเดต
//     const { name, category, quantity, availableQuantity, status, imageUrl } = req.body;
    
//     const updatedAsset = await db.update(assets).set({ 
//       name, category, quantity, availableQuantity, status, imageUrl // 👈 สั่งอัปเดต
//     }).where(eq(assets.id, id)).returning();

//     if (updatedAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });
//     res.status(200).json(updatedAsset[0]);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update asset' });
//   }
// });

// router.delete('/items/:id', async (req, res) => {
//   try {
//     const id = req.params.id;
//     const deletedAsset = await db.delete(assets).where(eq(assets.id, id)).returning();
//     if (deletedAsset.length === 0) return res.status(404).json({ error: 'Asset not found' });
//     res.status(204).send();
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to delete asset' });
//   }
// });

// // ==========================================
// //  4. BORROW & RETURN SYSTEM (ระบบยืม-คืน)
// // ==========================================

// router.post('/borrow', async (req, res) => {
//   try {
//     // 🚨 1. อัปเดตการรับค่าใหม่: รับ items เป็น Array และเพิ่ม projectName, pickupDate
//     const { studentId, fullName, projectName, pickupDate, returnDate, role, email, faculty, items } = req.body;

//     // เช็คข้อมูลที่จำเป็น (items ต้องเป็น Array และมีของอย่างน้อย 1 ชิ้น)
//     if (!studentId || !fullName || !projectName || !pickupDate || !returnDate || !items || !items.length) {
//       return res.status(400).json({ error: 'Missing required fields or items array is empty' });
//     }

//     // 2. จัดการข้อมูลผู้ใช้ (ถ้าเพิ่งเคยยืมครั้งแรก ให้สร้าง User ใหม่)
//     let user = await db.select().from(users).where(eq(users.studentId, studentId));
//     if (user.length === 0) {
//       const newUser = await db.insert(users).values({ 
//         studentId, 
//         fullName,
//         role: role || 'user', 
//         email: email || null,
//         faculty: faculty || getFacultyFromStudentId(studentId)
//       }).returning();
//       user = newUser;
//     }

//     //  3. สร้างรหัสรายการ (Transaction ID) 
//     const randomDigits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
//     const transactionId = `ENTrent${randomDigits}`;
//     const borrowedRecords = [];

//     //  4. ลูปทำรายการพัสดุทีละชิ้นตามที่ส่งมาในตะกร้า (items)
//     for (const item of items) {
//       const { assetId, quantity } = item;
//       const borrowQty = Number(quantity);

//       // เช็คว่าพัสดุมีในระบบไหม และสต็อกพอไหม
//       const targetAsset = await db.select().from(assets).where(eq(assets.id, assetId));
//       if (targetAsset.length === 0) {
//         return res.status(404).json({ error: `Asset ID ${assetId} not found` });
//       }

//       const currentAsset = targetAsset[0];
//       if (currentAsset.availableQuantity < borrowQty) {
//         return res.status(400).json({ 
//           error: `Not enough assets for ${currentAsset.name}. Requested: ${borrowQty}, Available: ${currentAsset.availableQuantity}` 
//         });
//       }

//       // บันทึกประวัติการยืม (ใส่ transactionId, projectName, pickupDate เข้าไปด้วย)
//       const newBorrowing = await db.insert(borrowings).values({
//           transactionId,
//           projectName,
//           pickupDate: new Date(pickupDate),
//           studentId, 
//           assetId, 
//           quantity: borrowQty,
//           borrowDate: new Date(), // ออก ณ (เวลาที่กดทำรายการ)
//           returnDate: new Date(returnDate), 
//           status: 'borrowed',
//         }).returning();

//       borrowedRecords.push(newBorrowing[0]);

//       // ตัดสต็อกพัสดุ
//       const newAvailableQty = currentAsset.availableQuantity - borrowQty;
//       const newStatus = newAvailableQty === 0 ? 'unavailable' : 'available';
//       await db.update(assets).set({ availableQuantity: newAvailableQty, status: newStatus }).where(eq(assets.id, assetId));
//     }

//     //  5. ส่งรหัส transactionId และข้อมูลกลับไปให้หน้าบ้านทำใบเสร็จ + QR Code
//     res.status(201).json({ 
//       message: 'Borrowing successful', 
//       transactionId: transactionId,
//       borrowings: borrowedRecords 
//     });

//   } catch (error) {
//     console.error(" Borrow Error:", error);
//     res.status(500).json({ error: 'Failed to process borrowing' });
//   }
// });

// router.post('/return', async (req, res) => {
//   try {
//     const { borrowingId } = req.body;
//     if (!borrowingId) return res.status(400).json({ error: 'borrowingId is required' });

//     const targetBorrowing = await db.select().from(borrowings).where(eq(borrowings.id, borrowingId));
//     if (targetBorrowing.length === 0 || targetBorrowing[0].status === 'returned') {
//       return res.status(400).json({ error: 'Invalid or already returned borrowing record' });
//     }

//     const borrowingRecord = targetBorrowing[0];
//     const updatedBorrowing = await db.update(borrowings).set({ status: 'returned', returnDate: new Date() })
//       .where(eq(borrowings.id, borrowingId)).returning();

//     const targetAsset = await db.select().from(assets).where(eq(assets.id, borrowingRecord.assetId));
//     if (targetAsset.length > 0) {
//       const currentAsset = targetAsset[0];
//       const newAvailableQty = currentAsset.availableQuantity + borrowingRecord.quantity;
//       await db.update(assets).set({ availableQuantity: newAvailableQty, status: 'available' })
//         .where(eq(assets.id, borrowingRecord.assetId));
//     }
//     res.status(200).json({ message: 'Return successful', borrowing: updatedBorrowing[0] });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to process return' });
//   }
// });

// router.get('/borrowings', async (req, res) => {
//   try {
//     const history = await db.select().from(borrowings);
//     res.status(200).json(history);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch borrowings' });
//   }
// });

// // ==========================================
// //  5. NEWS SYSTEM (ข่าวประชาสัมพันธ์)
// // ==========================================
// router.get('/news', async (req, res) => {
//   try {
//     const allNews = await db.select().from(news);
//     res.status(200).json(allNews);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch news' });
//   }
// });

// router.post('/news', async (req, res) => {
//   try {
//     const { title, content, authorId } = req.body;
//     if (!title || !content || !authorId) return res.status(400).json({ error: 'title, content, and authorId are required' });
//     const newArticle = await db.insert(news).values({ title, content, authorId }).returning();
//     res.status(201).json(newArticle[0]);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to add news' });
//   }
// });

// router.delete('/news/:id', async (req, res) => {
//   try {
//     const deletedNews = await db.delete(news).where(eq(news.id, parseInt(req.params.id))).returning();
//     if (deletedNews.length === 0) return res.status(404).json({ error: 'News not found' });
//     res.status(204).send();
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to delete news' });
//   }
// });

// // ==========================================
// //  6. BANNERS SYSTEM (แบนเนอร์สไลด์รูป)
// // ==========================================
// router.get('/banners', async (req, res) => {
//   try {
//     const allBanners = await db.select().from(banners);
//     res.status(200).json(allBanners);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch banners' });
//   }
// });

// router.post('/banners', async (req, res) => {
//   try {
//     const { imageUrl, altText, isActive } = req.body;
//     if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
//     const newBanner = await db.insert(banners).values({
//       imageUrl, altText, isActive: isActive !== undefined ? isActive : true
//     }).returning();
//     res.status(201).json(newBanner[0]);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to add banner' });
//   }
// });

// router.put('/banners/:id', async (req, res) => {
//   try {
//     const { isActive } = req.body;
//     const updatedBanner = await db.update(banners).set({ isActive })
//       .where(eq(banners.id, parseInt(req.params.id))).returning();
//     if (updatedBanner.length === 0) return res.status(404).json({ error: 'Banner not found' });
//     res.status(200).json(updatedBanner[0]);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update banner' });
//   }
// });

// router.delete('/banners/:id', async (req, res) => {
//   try {
//     const deletedBanner = await db.delete(banners).where(eq(banners.id, parseInt(req.params.id))).returning();
//     if (deletedBanner.length === 0) return res.status(404).json({ error: 'Banner not found' });
//     res.status(204).send();
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to delete banner' });
//   }
// });

// // ==========================================
// //  7. SITE SETTINGS (ตั้งค่าเว็บ เช่น นับถอยหลัง)
// // ==========================================
// router.get('/settings', async (req, res) => {
//   try {
//     const settings = await db.select().from(siteSettings);
//     res.status(200).json(settings);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch settings' });
//   }
// });

// router.post('/settings', async (req, res) => {
//   try {
//     const { key, value, description } = req.body;
//     if (!key || !value) return res.status(400).json({ error: 'key and value are required' });

//     const upsertedSetting = await db.insert(siteSettings).values({ key, value, description })
//       .onConflictDoUpdate({
//         target: siteSettings.key,
//         set: { value, description, updatedAt: new Date() }
//       }).returning();
      
//     res.status(200).json(upsertedSetting[0]);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to save setting' });
//   }
// });


// // ==========================================
// // 👤 8. USER PROFILE SYSTEM (จัดการข้อมูลส่วนตัว)
// // ==========================================

// // 1. API สำหรับเช็คว่านักศึกษาคนนี้กรอกข้อมูลหรือยัง (คุณไอซ์จะใช้เส้นนี้ตอนล็อกอินเสร็จ)
// router.get('/profile/:studentId', async (req, res) => {
//   try {
//     const { studentId } = req.params;
    
//     // ค้นหาข้อมูล profile จาก studentId
//     const profile = await db.select().from(userProfiles).where(eq(userProfiles.studentId, studentId));
    
//     // ถ้ายังไม่เคยกรอกข้อมูล จะส่ง false ไปบอกหน้าบ้าน
//     if (profile.length === 0) {
//       return res.status(200).json({ hasProfile: false, message: 'Profile not found, please fill in your details.' });
//     }
    
//     // ถ้าเคยกรอกแล้ว ส่ง true พร้อมข้อมูลเดิมไปให้
//     res.status(200).json({ hasProfile: true, profile: profile[0] });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch profile' });
//   }
// });

// // 2. API สำหรับบันทึกหรืออัปเดตข้อมูลส่วนตัว (คุณไอซ์จะยิงเส้นนี้ตอนนักศึกษากด Submit ฟอร์ม)
// router.post('/profile', async (req, res) => {
//   try {
//     const { 
//       studentId, nickname, hasShopShirt, major, height, 
//       medicalCondition, drugAllergies, foodAllergies, 
//       contactChannel, phoneNumber 
//     } = req.body;

//     // เช็คว่าส่งข้อมูลจำเป็นมาครบไหม (พวกช่องที่ห้ามว่าง)
//     if (!studentId || !nickname || hasShopShirt === undefined || !major || !height || !contactChannel || !phoneNumber) {
//       return res.status(400).json({ error: 'Missing required fields. Please fill in all mandatory information.' });
//     }

//     // ใช้คำสั่ง Upsert (ถ้าไม่มีให้ Insert, ถ้ามีแล้วให้ Update)
//     const upsertedProfile = await db.insert(userProfiles)
//       .values({
//         studentId, nickname, hasShopShirt, major, height, 
//         medicalCondition: medicalCondition || null, 
//         drugAllergies: drugAllergies || null, 
//         foodAllergies: foodAllergies || null, 
//         contactChannel, phoneNumber
//       })
//       .onConflictDoUpdate({
//         target: userProfiles.studentId, // ถ้า studentId ซ้ำ ให้ทำการอัปเดตข้อมูลแทน
//         set: { 
//           nickname, hasShopShirt, major, height, 
//           medicalCondition: medicalCondition || null, 
//           drugAllergies: drugAllergies || null, 
//           foodAllergies: foodAllergies || null, 
//           contactChannel, phoneNumber, 
//           updatedAt: new Date() 
//         }
//       })
//       .returning();

//     res.status(200).json({ 
//       message: 'Profile saved successfully', 
//       profile: upsertedProfile[0] 
//     });

//   } catch (error) {
//     console.error(" Profile Save Error:", error);
//     res.status(500).json({ error: 'Failed to save profile' });
//   }
// });

// // ==========================================
// //  9. RECRUITMENT SYSTEM (ระบบรับสมัครสตาฟ)
// // ==========================================

// // 1. API สำหรับกดสมัครกิจกรรม (จะเช็คประวัติก่อน)
// router.post('/events/apply', async (req, res) => {
//   try {
//     const { eventId, roleId, studentId } = req.body;

//     //  เช็คว่ามีประวัติใน userProfiles หรือยัง
//     const profile = await db.select().from(userProfiles).where(eq(userProfiles.studentId, studentId));
    
//     if (profile.length === 0) {
//       // ถ้ายังไม่มี ส่ง status 403 กลับไปบอกคุณไอซ์ (Frontend) ให้เด้งไปหน้าฟอร์มกรอกข้อมูล
//       return res.status(403).json({ 
//         requiresProfile: true, 
//         message: 'กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วนก่อนทำการสมัครกิจกรรมครับ' 
//       });
//     }

//     // ถ้ามีประวัติแล้ว ให้บันทึกการสมัครลงตาราง applications
//     const newApplication = await db.insert(applications).values({
//       eventId,
//       roleId,
//       studentId,
//       status: 'pending' // ค่าเริ่มต้นคือรอแอดมินอนุมัติ
//     }).returning();

//     res.status(201).json({ 
//       message: 'สมัครกิจกรรมสำเร็จ', 
//       application: newApplication[0] 
//     });

//   } catch (error) {
//     console.error(" Fetch Applicants Error:", error);
//     res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครกิจกรรม' });
//   }
// });
// // 2. API สำหรับให้แอดมินดูรายชื่อคนสมัคร พร้อมประวัติสุขภาพและข้อมูลส่วนตัว
// router.get('/events/:eventId/applications', async (req, res) => {
//   try {
//     const eventId = parseInt(req.params.eventId);

//     // ทำการ JOIN 4 ตารางเข้าด้วยกัน
//     const applicantsList = await db
//       .select({
//         applicationId: applications.id,
//         status: applications.status,
//         appliedAt: applications.appliedAt,
        
//         // ข้อมูลจากตาราง users (ข้อมูลพื้นฐาน)
//         studentId: users.studentId,
//         fullName: users.fullName,
        
//         // ข้อมูลจากตาราง eventRoles (ตำแหน่งที่สมัคร)
//         roleName: eventRoles.roleName,
        
//         //  ข้อมูลจากตาราง userProfiles (ข้อมูลสุขภาพและข้อมูลเชิงลึกที่แอดมินต้องรู้)
//         nickname: userProfiles.nickname,
//         major: userProfiles.major,
//         hasShopShirt: userProfiles.hasShopShirt,
//         medicalCondition: userProfiles.medicalCondition,
//         drugAllergies: userProfiles.drugAllergies,
//         foodAllergies: userProfiles.foodAllergies,
//         phoneNumber: userProfiles.phoneNumber
//       })
//       .from(applications)
//       // สะพานที่ 1: เชื่อมใบสมัคร กับ ข้อมูลผู้ใช้หลัก
//       .innerJoin(users, eq(applications.studentId, users.studentId))
//       // สะพานที่ 2: เชื่อมผู้ใช้หลัก กับ ประวัติสุขภาพ (userProfiles)
//       .innerJoin(userProfiles, eq(users.studentId, userProfiles.studentId))
//       // สะพานที่ 3: เชื่อมใบสมัคร กับ ตำแหน่ง (เพื่อให้รู้ว่าสมัครฝ่ายไหน)
//       .innerJoin(eventRoles, eq(applications.roleId, eventRoles.id))
//       .where(eq(applications.eventId, eventId));

//     // ส่งข้อมูลที่ประกอบร่างแล้วกลับไปให้หน้าบ้านแสดงเป็นตาราง
//     res.status(200).json(applicantsList);

//   } catch (error) {
//     console.error(" Fetch Applicants Error:", error);
//     res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้สมัครได้' });
//   }
// });

// export default router;