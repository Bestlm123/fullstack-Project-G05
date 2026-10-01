import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mainRoutes from './routes/index.js';


const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use('/api', mainRoutes);

// Export ตัว app ออกไปเพื่อใช้ใน index.ts และไฟล์ Test (Vitest / Supertest)
export default app;