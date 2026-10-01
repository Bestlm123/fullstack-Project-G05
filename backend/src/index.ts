import 'dotenv/config'; // 🌟 ต้องอยู่บรรทัดที่ 1 (บนสุด) เท่านั้น!
import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});