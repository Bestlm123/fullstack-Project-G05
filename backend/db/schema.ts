import { pgTable, serial, varchar, integer, timestamp, pgEnum, text, boolean } from 'drizzle-orm/pg-core';
export const roleEnum = pgEnum('role', ['admin', 'user']);

// 1. ตาราง users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  studentId: varchar('student_id', { length: 20 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: roleEnum('role').default('user').notNull(),
  faculty: varchar('faculty', { length: 100 }).default('Other').notNull(),
  email: varchar('email', { length: 255 }).unique(),
});

// 2. ตาราง assets (เพิ่ม available_quantity)
export const assets = pgTable('assets', {
  id: varchar('id', { length: 10 }).primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),                 // จำนวนพัสดุทั้งหมดที่มี
  availableQuantity: integer('available_quantity').default(1).notNull(), // จำนวนที่พร้อมใช้งานคงเหลือ
  status: varchar('status', { length: 50 }).default('available').notNull(),
  imageUrl: text('image_url').notNull(),
});

// 3. ตาราง borrowings (เพิ่ม quantity ยืมกี่ชิ้น)
export const borrowings = pgTable('borrowings', {
  id: serial('id').primaryKey(),
  transactionId: varchar('transaction_id', { length: 50 }).notNull(), // รหัสบิล
  projectName: varchar('project_name', { length: 255 }).notNull(), // ชื่องาน/กิจกรรม
  pickupDate: timestamp('pickup_date').notNull(), // วันที่นัดมารับของ
  studentId: varchar('student_id', { length: 20 })
    .notNull()
    .references(() => users.studentId, { onDelete: 'cascade' }),
  assetId: varchar('asset_id', { length: 10 })
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').default(1).notNull(), // 👈 จำนวนชิ้นที่ยืมในครั้งนี้
  borrowDate: timestamp('borrow_date').defaultNow().notNull(),
  returnDate: timestamp('return_date').notNull(),
  status: varchar('status', { length: 50 }).default('borrowed').notNull(),
});
// ==========================================
// 4. ตาราง news (ข่าวประชาสัมพันธ์ / Announcements)
// ==========================================
export const news = pgTable('news', {
  id: serial('id').primaryKey(), // รหัสข่าว
  title: varchar('title', { length: 255}).notNull(),          // หัวข้อข่าว
  content: text('content').notNull(),                          // เนื้อหาข่าว (ใช้ text เพื่อรองรับข้อความยาวๆ)
  
  imageUrl: text('image_url'),
  // เก็บว่าใครเป็นคนโพสต์ข่าวนี้ (เชื่อมไปยัง studentId ของผู้โพสต์ที่เป็น admin)
  authorId: varchar('author_id', { length: 20 })
    .notNull()
    .references(() => users.studentId, { onDelete: 'cascade' }),
    
  createdAt: timestamp('created_at').defaultNow().notNull(),   // วันที่โพสต์ข่าว
  updatedAt: timestamp('updated_at').defaultNow().notNull(),   // วันที่แก้ไขข่าวล่าสุด
});
// ==========================================
// 5. ตาราง banners (แบนเนอร์สไลด์รูปภาพ)
// ==========================================
export const banners = pgTable('banners', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),                   // ลิงก์/ที่อยู่ของรูปภาพ
  altText: varchar('alt_text', { length: 255 }),           // คำอธิบายรูปภาพสั้นๆ (เผื่อรูปโหลดไม่ขึ้น)
  isActive: boolean('is_active').default(true).notNull(),  // แอดมินสามารถสลับเปิด/ปิดการแสดงผลได้โดยไม่ต้องลบทิ้ง
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 6. ตาราง site_settings (การตั้งค่าเว็บ เช่น วันที่นับถอยหลัง)
// ==========================================
// เราออกแบบเป็นแบบ Key-Value จะทำให้ยืดหยุ่นมาก อนาคตอยากตั้งค่าอะไรเพิ่มก็แค่แทรกแถวใหม่
export const siteSettings = pgTable('site_settings', {
  key: varchar('key', { length: 100 }).primaryKey().notNull(), // เช่น 'countdown_date', 'countdown_title'
  value: text('value').notNull(),                              // เช่น '2026-10-31 09:00:00'
  description: varchar('description', { length: 255 }),        // คำอธิบายให้แอดมินรู้ว่าคีย์นี้คืออะไร
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// สำหรับนำ Type ไปใช้งานใน API
export type Banner = typeof banners.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
// สำหรับนำ Type ไปใช้ใน API ต่อไป
export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;

export type User = typeof users.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Borrowing = typeof borrowings.$inferSelect;

// ==========================================
// 7. ตาราง events (กิจกรรมที่เปิดรับสต๊าฟ)
// ==========================================
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('open').notNull(), // open, closed
  createdBy: varchar('created_by', { length: 20 })
    .notNull()
    .references(() => users.studentId),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 8. ตาราง event_roles (ตำแหน่งสต๊าฟในแต่ละกิจกรรม + โควต้า)
// ==========================================
export const eventRoles = pgTable('event_roles', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  roleName: varchar('role_name', { length: 100 }).notNull(), // เช่น สวัสดิการ, พยาบาล
  totalQuota: integer('total_quota').notNull(),              // จำนวนที่ต้องการทั้งหมด
  availableQuota: integer('available_quota').notNull(),      // จำนวนที่ยังรับได้เหลืออยู่
});

// ==========================================
// 9. ตาราง applications (ข้อมูลการสมัครของนักศึกษา)
// ==========================================
export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  roleId: integer('role_id')
    .notNull()
    .references(() => eventRoles.id, { onDelete: 'cascade' }),
  studentId: varchar('student_id', { length: 20 })
    .notNull()
    .references(() => users.studentId, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, approved, rejected
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
});

// ==========================================
// 10. ตาราง user_profiles (ข้อมูลส่วนตัวเชิงลึกสำหรับสมัครกิจกรรม)
// ==========================================
export const userProfiles = pgTable('user_profiles', {
  // 4. รหัสนักศึกษา (เป็น Primary Key และโยงกับตาราง users อัตโนมัติ)
  studentId: varchar('student_id', { length: 20 })
    .primaryKey()
    .references(() => users.studentId, { onDelete: 'cascade' }),
    
  // 3. ชื่อเล่น
  nickname: varchar('nickname', { length: 50 }).notNull(),
  
  // 1. มีเสื้อช็อปหรือไม่ (เก็บเป็น boolean: true = YES, false = NO)
  hasShopShirt: boolean('has_shop_shirt').notNull(),
  
  // 5. สาขา (แนะนำให้เก็บเป็นตัวย่อภาษาอังกฤษ เช่น 'CPE', 'ME', 'IE-LM' เพื่อประหยัดพื้นที่)
  major: varchar('major', { length: 20 }).notNull(),
  
  // 6. ส่วนสูง (เซนติเมตร)
  height: integer('height').notNull(),
  
  // 7. โรคประจำตัว (ใช้ text เผื่อพิมพ์ยาว และปล่อยให้เป็น null ได้ถ้าไม่มีโรคประจำตัว)
  medicalCondition: text('medical_condition'),
  
  // 8. ยาที่แพ้
  drugAllergies: text('drug_allergies'),
  
  // 9. อาหารที่แพ้
  foodAllergies: text('food_allergies'),
  
  // 10. ช่องทางการติดต่อ (เช่น Line ID, Facebook URL, IG)
  contactChannel: varchar('contact_channel', { length: 255 }).notNull(),
  
  // 11. เบอร์โทรศัพท์
  phoneNumber: varchar('phone_number', { length: 15 }).notNull(),
  
  // เก็บเวลาที่อัปเดตข้อมูลล่าสุด
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;

export type Event = typeof events.$inferSelect;
export type EventRole = typeof eventRoles.$inferSelect;
export type Application = typeof applications.$inferSelect;