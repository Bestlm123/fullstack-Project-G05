import { pgTable, serial, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
export const roleEnum = pgEnum('role', ['admin', 'user']);

// 1. ตาราง users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  studentId: varchar('student_id', { length: 20 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: roleEnum('role').default('user').notNull(),
  faculty: varchar('faculty', { length: 100 }).default('Engineering').notNull(),
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

export type User = typeof users.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Borrowing = typeof borrowings.$inferSelect;