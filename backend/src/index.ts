import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import debug from 'debug';

const app = express();
const log = debug('app:server');
const PORT = process.env.PORT || 3000;

// เปิดใช้งาน Middlewares พื้นฐาน
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// API สำหรับทดสอบระบบ (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running smoothly!' });
});

// ตรวจสอบว่าไม่ได้อยู่ในโหมดเทสต์ ถึงจะเปิด Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}: http://localhost:${PORT}`);
  });
}

// ส่งออก app เพื่อใช้ใน Vitest + Supertest
export default app;