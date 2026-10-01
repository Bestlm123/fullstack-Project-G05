import { Router } from 'express';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { getFacultyFromStudentId } from '../utils/helpers.js';

const router = Router();

// API จะกลายเป็น POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { studentId, email, fullName, faculty, role } = req.body;

    if (!studentId || !fullName) {
      return res.status(400).json({ error: 'studentId and fullName are required' });
    }

    const finalFaculty = faculty || getFacultyFromStudentId(studentId);

    const loggedInUser = await db.insert(users)
      .values({ studentId, fullName, email: email || null, faculty: finalFaculty, role: role || 'user' })
      .onConflictDoUpdate({
        target: users.studentId, 
        set: { fullName, email: email || null, faculty: finalFaculty }
      })
      .returning();

    res.status(200).json({ message: 'Login / Register successful', user: loggedInUser[0] });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

export default router;