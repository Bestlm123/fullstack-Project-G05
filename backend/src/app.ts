import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mainRoutes from './routes/index.js';

const app = express();

// ==========================================
// 🌟 FIX: ตั้งค่า CORS ให้รองรับการส่ง Session Cookie ข้ามพอร์ต
// ==========================================
app.use(cors({
  origin: 'http://localhost:5173', // URL ของหน้าบ้านที่อนุญาต
  credentials: true,               // อนุญาตให้รับส่ง Cookie (Session)
}));

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use('/api', mainRoutes);

// Export ตัว app ออกไปเพื่อใช้ใน index.ts
export default app;