import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';

export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  quantity: integer('quantity').notNull().default(0),
});