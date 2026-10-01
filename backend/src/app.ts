import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session'; // 👈 นำเข้า session
import passport from 'passport';       // 👈 นำเข้า passport
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

// ==========================================
// 🌟 FIX: ย้าย Session และ Passport มาไว้ที่ส่วนกลาง (เพื่อให้ทุก Route รู้จัก)
// ==========================================
app.use(session({
  secret: process.env.SESSION_SECRET || 'admin123',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// Routes หลัก
// ==========================================
app.use('/api', mainRoutes);

// Export ตัว app ออกไปเพื่อใช้ใน index.ts
export default app;