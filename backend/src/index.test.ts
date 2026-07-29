import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './app.js'; // หรือ './index.js' ขึ้นอยู่กับโครงสร้างของคุณเบส

describe('Comprehensive Assets API Integration Tests', () => {
  let createdAssetId: number;

  // =========================================================================
  // 1. POST /api/items (CREATE)
  // =========================================================================
  describe('POST /api/items (Create Asset)', () => {
    it('1.1 [Happy Path] ควรสร้างพัสดุใหม่สำเร็จเมื่อใส่ข้อมูลครบถ้วน', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({
          name: 'ไมโครโฟนไร้สาย Shure',
          category: 'อุปกรณ์เสียง',
          status: 'available',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('number');
      expect(res.body.name).toBe('ไมโครโฟนไร้สาย Shure');
      expect(res.body.category).toBe('อุปกรณ์เสียง');
      expect(res.body.status).toBe('available');

      // เก็บ ID ไว้ใช้ทดสอบในบทต่อๆ ไป
      createdAssetId = res.body.id;
    });

    it('1.2 [Happy Path] ควรใช้ Default Status ("available") เมื่อไม่ระบุ status', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({
          name: 'โต๊ะพับอเนกประสงค์',
          category: 'เฟอร์นิเจอร์',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('available');
    });

    it('1.3 [Edge Case] ควรตอบกลับ 400 เมื่อไม่ได้ส่ง field "name"', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({
          category: 'อุปกรณ์เสียง',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('1.4 [Edge Case] ควรตอบกลับ 400 เมื่อไม่ได้ส่ง field "category"', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({
          name: 'ลำโพงบลูทูธ',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // =========================================================================
  // 2. GET /api/items (READ)
  // =========================================================================
  describe('GET /api/items (Read Assets)', () => {
    it('2.1 [Happy Path] ควรคืนค่าข้อมูลพัสดุเป็น Array และมีรายการที่สร้างไว้', async () => {
      const res = await request(app).get('/api/items');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // เช็คว่าในรายการที่ดึงมา มี ID ที่เราเพิ่งสร้างไปอยู่ด้วยหรือไม่
      const foundItem = res.body.find((item: any) => item.id === createdAssetId);
      expect(foundItem).toBeDefined();
      expect(foundItem.name).toBe('ไมโครโฟนไร้สาย Shure');
    });
  });

  // =========================================================================
  // 3. PUT /api/items/:id (UPDATE)
  // =========================================================================
  describe('PUT /api/items/:id (Update Asset)', () => {
    it('3.1 [Happy Path] ควรแก้ไขข้อมูลพัสดุ (เช่น เปลี่ยนสถานะเป็น borrowed) สำเร็จ', async () => {
      const res = await request(app)
        .put(`/api/items/${createdAssetId}`)
        .send({
          name: 'ไมโครโฟนไร้สาย Shure (อัปเดต)',
          category: 'อุปกรณ์เสียง',
          status: 'borrowed',
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdAssetId);
      expect(res.body.name).toBe('ไมโครโฟนไร้สาย Shure (อัปเดต)');
      expect(res.body.status).toBe('borrowed');
    });

    it('3.2 [Edge Case] ควรตอบกลับ 404 เมื่อพยายามแก้ไขพัสดุที่ไม่มีอยู่จริง (ID ไม่เจอ)', async () => {
      const nonExistentId = 999999;
      const res = await request(app)
        .put(`/api/items/${nonExistentId}`)
        .send({
          name: 'เก้าอี้',
          category: 'เฟอร์นิเจอร์',
          status: 'available',
        });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // =========================================================================
  // 4. DELETE /api/items/:id (DELETE)
  // =========================================================================
  describe('DELETE /api/items/:id (Delete Asset)', () => {
    it('4.1 [Edge Case] ควรตอบกลับ 404 เมื่อพยายามลบพัสดุที่ไม่มีอยู่จริง', async () => {
      const nonExistentId = 999999;
      const res = await request(app).delete(`/api/items/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('4.2 [Happy Path] ควรลบพัสดุสำเร็จเมื่อระบุ ID ที่มีอยู่จริง', async () => {
      const res = await request(app).delete(`/api/items/${createdAssetId}`);

      expect(res.status).toBe(204);
    });

    it('4.3 [Verification] หลังสั่งลบแล้ว พยายามดึงข้อมูลพัสดุ ID นั้น ต้องไม่เจออีกต่อไป', async () => {
      const res = await request(app).get('/api/items');
      const foundItem = res.body.find((item: any) => item.id === createdAssetId);
      
      expect(foundItem).toBeUndefined();
    });
  });
});