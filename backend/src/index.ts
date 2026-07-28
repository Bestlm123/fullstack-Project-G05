import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import debug from 'debug';
import adminRoutes from './routes/admin.js'; // <- เพิ่มบรรทัดนี้

const app = express();
const log = debug('app:server');
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// เสียบ API ไว้ที่ path /api/admin
app.use('/api/admin', adminRoutes); // <- เพิ่มบรรทัดนี้

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}: http://localhost:${PORT}`);
  });
}

export default app;