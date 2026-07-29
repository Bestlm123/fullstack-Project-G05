// src/index.ts
import express from 'express';
import adminRouter from './routes/admin.js';

const app = express();
app.use(express.json());

// Routes
app.use('/api', adminRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ✅ Export app ออกไปเพื่อใช้ทำ Supertest
export default app;