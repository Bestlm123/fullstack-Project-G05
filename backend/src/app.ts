import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import adminRoutes from './routes/admin.js';

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes (เชื่อมต่อ API ตาม Preflight Spec)
app.use('/api', adminRoutes);

// Export ตัว app ออกไปเพื่อใช้ใน index.ts และไฟล์ Test (Vitest / Supertest)
export default app;