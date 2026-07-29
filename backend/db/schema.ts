import { pgTable, serial, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

// ==========================================
// 1. ตาราง users (ข้อมูลผู้ใช้งาน)
// ==========================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  studentId: varchar('student_id', { length: 20 }).notNull().unique(), // รหัสนักศึกษา
  fullName: varchar('full_name', { length: 255 }).notNull(),          // ชื่อ-นามสกุล
});

// ==========================================
// 2. ตาราง assets (คลังพัสดุ)
// ==========================================
export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),                                      // รหัสอุปกรณ์ (Primary Key)
  name: varchar('name', { length: 255 }).notNull(),                   // ชื่ออุปกรณ์
  category: varchar('category', { length: 100 }).notNull(),            // หมวดหมู่
  status: varchar('status', { length: 50 }).default('available').notNull(), // สถานะ (เช่น available, borrowed)
});

// ==========================================
// 3. ตาราง borrowings (ประวัติการยืม-คืน)
// ==========================================
export const borrowings = pgTable('borrowings', {
  id: serial('id').primaryKey(),
  
  // เชื่อม Foreign Key เพื่อระบุว่าใครยืม และ ยืมอุปกรณ์ชิ้นไหน
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),            // รหัสผู้ยืม (ดึงชื่อ-นามสกุล ได้ผ่าน Relation)
    
  assetId: integer('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),           // รหัสอุปกรณ์ (ดึงชื่ออุปกรณ์ ได้ผ่าน Relation)

  borrowDate: timestamp('borrow_date').defaultNow().notNull(),       // วันที่ยืม (ตั้งเวลาปัจจุบันให้อัตโนมัติ)
  returnDate: timestamp('return_date'),                               // วันที่คืน (ใส่ค่าเมื่อนำของมาคืน)
  
  status: varchar('status', { length: 50 }).default('pending').notNull(), // สถานะการยืม (เช่น pending, active, returned)
});

// ==========================================
// Type Exports สำหรับนำไปใช้ใน Express Controller
// ==========================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type Borrowing = typeof borrowings.$inferSelect;
export type NewBorrowing = typeof borrowings.$inferInsert;