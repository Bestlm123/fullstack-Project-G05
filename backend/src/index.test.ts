import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app.js'; // หรือ './index.js' ตามโครงสร้างโฟลเดอร์ของคุณเบส

describe('Full System Integration Tests (Assets & Quantity-based Borrowing System)', () => {
  const testAssetId = 'MIC010'; // ID พัสดุทดสอบ (ความยาว <= 10 ตัวอักษร)
  const testStudentId = '650510001';
  let createdBorrowingId: number;

  // =========================================================================
  // 1. ASSET MANAGEMENT TESTS (การจัดการพัสดุ & Validation)
  // =========================================================================
  describe('1. Asset Management API (/api/items)', () => {
    
    it('1.1 [Happy Path] ควรสร้างพัสดุใหม่พร้อมจำนวน 10 อันสำเร็จ', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({
          id: testAssetId,
          name: 'ไมโครโฟนไร้สาย Shure',
          category: 'อุปกรณ์เสียง',
          quantity: 10,
          status: 'available',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(testAssetId);
      expect(res.body.name).toBe('ไมโครโฟนไร้สาย Shure');
      expect(res.body.quantity).toBe(10);
      expect(res.body.availableQuantity).toBe(10); // ตอนเริ่มต้น พร้อมใช้งานต้องเท่ากับจำนวนทั้งหมด (10)
      expect(res.body.status).toBe('available');
    });

    it('1.2 [Validation Error] ควรตอบกลับ 400 เมื่อไม่ได้ส่ง field "name" หรือ "category"', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({
          id: 'TEST001',
          name: 'ขาตั้งไมค์', // ขาด category
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('1.3 [Validation Error] ควรตอบกลับ 400 เมื่อ ID พัสดุยาวเกิน 10 ตัวอักษร', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({
          id: 'TOOLONGID12345',
          name: 'สว่านไฟฟ้า',
          category: 'เครื่องมือช่าง',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('1.4 [GET] ควรดึงรายการพัสดุทั้งหมดสำเร็จ และเจอพัสดุที่สร้างไว้', async () => {
      const res = await request(app).get('/api/items');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const foundAsset = res.body.find((item: any) => item.id === testAssetId);
      expect(foundAsset).toBeDefined();
      expect(foundAsset.quantity).toBe(10);
    });

    it('1.5 [PUT] ควรแก้ไขข้อมูลพัสดุตาม ID สำเร็จ', async () => {
      const res = await request(app)
        .put(`/api/items/${testAssetId}`)
        .send({
          name: 'ไมโครโฟนไร้สาย Shure (ชุดประธาน)',
          category: 'อุปกรณ์เสียง',
          quantity: 10,
          availableQuantity: 10,
          status: 'available',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('ไมโครโฟนไร้สาย Shure (ชุดประธาน)');
    });

    it('1.6 [PUT Error] ควรตอบกลับ 404 เมื่อพยายามแก้ไขพัสดุที่ไม่มีอยู่จริง', async () => {
      const res = await request(app)
        .put('/api/items/NOTFOUND')
        .send({
          name: 'ของไม่มีจริง',
          category: 'ทดสอบ',
        });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // =========================================================================
  // 2. BORROW & RETURN SYSTEM TESTS (ระบบตัด/คืนสต็อกพัสดุ)
  // =========================================================================
  describe('2. Borrowing & Return System API (/api/borrow & /api/return)', () => {

    it('2.1 [Happy Path] ยืมของ 5 อันจาก 10 อัน -> ตัดสต็อกเหลือพร้อมใช้งาน 5 อัน', async () => {
      const res = await request(app)
        .post('/api/borrow')
        .send({
          studentId: testStudentId,
          fullName: 'นายเบส สายโค้ด',
          assetId: testAssetId,
          quantity: 5, // ขอยืม 5 อัน
          borrowDate: '2026-07-30',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('borrowing');
      expect(res.body.borrowing.studentId).toBe(testStudentId);
      expect(res.body.borrowing.quantity).toBe(5);
      expect(res.body.borrowing.status).toBe('borrowed');

      // เก็บ ID รายการยืมไว้นำไปทดสอบส่งคืน
      createdBorrowingId = res.body.borrowing.id;

      // ตรวจสอบสต็อกพัสดุใน Database ว่าตัดถูกต้องหรือไม่
      const assetRes = await request(app).get('/api/items');
      const targetAsset = assetRes.body.find((item: any) => item.id === testAssetId);
      
      expect(targetAsset.quantity).toBe(10);         // จำนวนทั้งหมด = 10
      expect(targetAsset.availableQuantity).toBe(5); // พร้อมใช้งานคงเหลือ = 5 (10 - 5)
      expect(targetAsset.status).toBe('available');  // ยังมีเหลือให้ยืม จึงเป็น available
    });

    it('2.2 [Borrow Error] ควรตอบกลับ 400 เมื่อระบุจำนวนยืมมากกว่าจำนวนที่พร้อมใช้งาน', async () => {
      const res = await request(app)
        .post('/api/borrow')
        .send({
          studentId: testStudentId,
          fullName: 'นายเบส สายโค้ด',
          assetId: testAssetId,
          quantity: 999, // ขอยืมเกินจำนวนคงเหลือที่มี (มีแค่ 5)
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('2.3 [Happy Path] คืนของ 5 อันที่ยืมไป -> สต็อกกลับมาพร้อมใช้งาน 10 อันเต็ม', async () => {
      const res = await request(app)
        .post('/api/return')
        .send({
          borrowingId: createdBorrowingId,
        });

      expect(res.status).toBe(200);
      expect(res.body.borrowing.status).toBe('returned');

      // ตรวจสอบสต็อกพัสดุใน Database ว่าบวกกลับมาครบไหม
      const assetRes = await request(app).get('/api/items');
      const targetAsset = assetRes.body.find((item: any) => item.id === testAssetId);

      expect(targetAsset.quantity).toBe(10);
      expect(targetAsset.availableQuantity).toBe(10); // บวกคืนเป็น 10 ตามเดิม
    });

    it('2.4 [Return Error] ควรตอบกลับ 400 เมื่อพยายามคืนซ้ำรายการเดิมที่คืนไปแล้ว', async () => {
      const res = await request(app)
        .post('/api/return')
        .send({
          borrowingId: createdBorrowingId, // คืนซ้ำรอบสอง
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('2.5 [GET] ควรดึงประวัติรายการยืม-คืนทั้งหมดสำเร็จ', async () => {
      const res = await request(app).get('/api/borrowings');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3. CLEANUP & DELETE TEST (ทำความสะอาดข้อมูลหลัง Test)
  // =========================================================================
  describe('3. Cleanup Test Data', () => {
    it('3.1 [DELETE Error] ควรตอบกลับ 404 เมื่อลบพัสดุที่ไม่มีอยู่จริง', async () => {
      const res = await request(app).delete('/api/items/NOTFOUND');
      expect(res.status).toBe(404);
    });

    it('3.2 [DELETE] ควรลบพัสดุทดสอบสำเร็จ', async () => {
      const res = await request(app).delete(`/api/items/${testAssetId}`);
      expect(res.status).toBe(204);
    });
  });
});