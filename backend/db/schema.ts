import { pgTable, serial, varchar, integer, timestamp, pgEnum, text, boolean } from 'drizzle-orm/pg-core';
export const roleEnum = pgEnum('role', ['admin', 'user']);

// ==========================================
// 1. ตาราง users
// ==========================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  studentId: varchar('student_id', { length: 20 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: roleEnum('role').default('user').notNull(),
  faculty: varchar('faculty', { length: 100 }).default('Other').notNull(),
  email: varchar('email', { length: 255 }).unique(),
});

// ==========================================
// 2. ตาราง assets (เพิ่ม available_quantity)
// ==========================================
export const assets = pgTable('assets', {
  id: varchar('id', { length: 10 }).primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),                 // จำนวนพัสดุทั้งหมดที่มี
  availableQuantity: integer('available_quantity').default(1).notNull(), // จำนวนที่พร้อมใช้งานคงเหลือ
  status: varchar('status', { length: 50 }).default('available').notNull(),
  // ✅ FIX: ใส่ Placeholder Image เป็น Default ให้ของเก่า เพื่อไม่ให้หน้า Frontend แครชเวลาโหลดรูปไม่ขึ้น
  imageUrl: text('image_url').default('https://placehold.co/400x400?text=No+Image').notNull(),
});

// ==========================================
// 3. ตาราง borrowings (เพิ่ม quantity ยืมกี่ชิ้น)
// ==========================================
export const borrowings = pgTable('borrowings', {
  id: serial('id').primaryKey(),
  // ✅ FIX: ข้อมูลเก่าที่ไม่มีบิล จะถูกใส่ชื่อ LEGACY-TXN เพื่อให้รู้ว่าเป็นข้อมูลเก่าก่อนระบบใหม่
  transactionId: varchar('transaction_id', { length: 50 }).default('LEGACY-TXN').notNull(), 
  // ✅ FIX: ใส่ชื่อโปรเจกต์ Default ให้ข้อมูลเก่า
  projectName: varchar('project_name', { length: 255 }).default('General Borrowing').notNull(), 
  // ✅ FIX: วันที่รับของของเก่า ให้ใช้วันที่ปัจจุบันที่บันทึกข้อมูลแทนไปก่อน
  pickupDate: timestamp('pickup_date').defaultNow().notNull(), 
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
  id: serial('id').primaryKey(), 
  title: varchar('title', { length: 255}).notNull(),           
  content: text('content').notNull(),                          
  imageUrl: text('image_url'),
  authorId: varchar('author_id', { length: 20 })
    .notNull()
    .references(() => users.studentId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),   
  updatedAt: timestamp('updated_at').defaultNow().notNull(),   
});

// ==========================================
// 5. ตาราง banners (แบนเนอร์สไลด์รูปภาพ)
// ==========================================
export const banners = pgTable('banners', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),                   
  altText: varchar('alt_text', { length: 255 }),           
  isActive: boolean('is_active').default(true).notNull(),  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 6. ตาราง site_settings (การตั้งค่าเว็บ เช่น วันที่นับถอยหลัง)
// ==========================================
export const siteSettings = pgTable('site_settings', {
  key: varchar('key', { length: 100 }).primaryKey().notNull(), 
  value: text('value').notNull(),                              
  description: varchar('description', { length: 255 }),        
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// 7. ตาราง events (กิจกรรมที่เปิดรับสต๊าฟ)
// ==========================================
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('open').notNull(), 
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
  roleName: varchar('role_name', { length: 100 }).notNull(), 
  totalQuota: integer('total_quota').notNull(),              
  availableQuota: integer('available_quota').notNull(),      
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
  status: varchar('status', { length: 50 }).default('pending').notNull(), 
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
});

// ==========================================
// 10. ตาราง user_profiles (ข้อมูลส่วนตัวเชิงลึกสำหรับสมัครกิจกรรม)
// ==========================================
export const userProfiles = pgTable('user_profiles', {
  studentId: varchar('student_id', { length: 20 })
    .primaryKey()
    .references(() => users.studentId, { onDelete: 'cascade' }),
  nickname: varchar('nickname', { length: 50 }).notNull(),
  hasShopShirt: boolean('has_shop_shirt').notNull(),
  major: varchar('major', { length: 20 }).notNull(),
  height: integer('height').notNull(),
  medicalCondition: text('medical_condition'),
  drugAllergies: text('drug_allergies'),
  foodAllergies: text('food_allergies'),
  contactChannel: varchar('contact_channel', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 15 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// Export Types
// ==========================================
export type User = typeof users.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Borrowing = typeof borrowings.$inferSelect;
export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;
export type Banner = typeof banners.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventRole = typeof eventRoles.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;