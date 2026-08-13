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
});

// 3. ตาราง borrowings (เพิ่ม quantity ยืมกี่ชิ้น)
export const borrowings = pgTable('borrowings', {
  id: serial('id').primaryKey(),
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