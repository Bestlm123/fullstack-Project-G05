import type { Request, Response, NextFunction } from 'express';

// 1. ด่านตรวจว่า "ล็อกอินหรือยัง?" (ใช้สำหรับ API ที่นักศึกษาทุกคนต้องล็อกอินก่อนถึงจะใช้ได้ เช่น กดยืมของ)
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next(); // ผ่านได้
  }
  return res.status(401).json({ error: 'Please login first (ยังไม่ได้ล็อกอิน)' });
};

// 2. ด่านตรวจว่า "เป็น Admin หรือไม่?" (ใช้สำหรับ API จัดการระบบ เช่น สร้างกิจกรรม, เพิ่มสต๊อก)
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // ต้องล็อกอินก่อน และ ต้องมี role เป็น admin
  if (req.isAuthenticated() && (req.user as any).role === 'admin') {
    return next(); // ผ่านได้
  }
  return res.status(403).json({ error: 'Access denied. Admin only (ไม่มีสิทธิ์เข้าถึง)' });
};