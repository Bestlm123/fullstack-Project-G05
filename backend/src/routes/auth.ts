import { Router } from 'express';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getFacultyFromStudentId } from '../utils/helpers.js';

const router = Router();

// ==========================================
// 🔍 DEBUG: เช็คว่าดึงค่าจาก .env มาได้ไหม
// ==========================================
console.log("----------------------------------------");
console.log("🔍 [Auth.ts] CLIENT_ID:", process.env.CMU_OAUTH_CLIENT_ID ? "Loaded Successfully ✅" : "MISSING ❌");
console.log("🔍 [Auth.ts] CALLBACK_URL:", process.env.CMU_OAUTH_CALLBACK_URL);
console.log("----------------------------------------");

// ==========================================
// 1. ตั้งค่า Session สำหรับจำสถานะการ Login
// ==========================================
router.use(session({
  secret: process.env.SESSION_SECRET || 'admin123',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

router.use(passport.initialize());
router.use(passport.session());

// ==========================================
// 2. ตั้งค่า Serialize / Deserialize User
// ==========================================
passport.serializeUser((user: any, done) => {
  done(null, user.studentId);
});

passport.deserializeUser(async (studentId: string, done) => {
  try {
    const user = await db.select().from(users).where(eq(users.studentId, studentId));
    done(null, user[0]);
  } catch (err) {
    done(err, null);
  }
});

// ==========================================
// 3. CMU OAuth Strategy (ป้องกันค่า undefined)
// ==========================================
passport.use('cmu-oauth', new OAuth2Strategy({
    authorizationURL: 'https://oauth497.cpecmu.com/application/o/authorize/',
    tokenURL: 'https://oauth497.cpecmu.com/application/o/token/',
    clientID: process.env.CMU_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.CMU_OAUTH_CLIENT_SECRET || '',
    callbackURL: process.env.CMU_OAUTH_CALLBACK_URL || 'http://localhost:3001/api/auth/callback',
  },
  async (accessToken: string, refreshToken: string, results: any, profile: any, done: any) => {
    try {
      const idToken = results.id_token;
      if (!idToken) {
        return done(new Error("id_token is missing from OAuth response"));
      }
      
      const decodedInfo: any = jwt.decode(idToken); 
      const studentEmail = decodedInfo.email; 
      const studentId = studentEmail.split('@')[0];
      const fullName = decodedInfo.name || "Unknown";
      const finalFaculty = getFacultyFromStudentId(studentId);

      const loggedInUser = await db.insert(users)
        .values({
          studentId, fullName, email: studentEmail, faculty: finalFaculty, role: 'user'
        })
        .onConflictDoUpdate({
          target: users.studentId,
          set: { fullName, email: studentEmail, faculty: finalFaculty }
        })
        .returning();

      return done(null, loggedInUser[0]);
    } catch (err) {
      return done(err);
    }
  }
));

// ==========================================
// 4. Routes ต่างๆ
// ==========================================

// Route 1: เอาไว้เทสต์ยิง Postman
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

// Route 2: สำหรับให้หน้าเว็บกดเข้ามาเพื่อไปหน้า Login มหาลัย
router.get('/login/cmu', passport.authenticate('cmu-oauth', { 
    scope: ['openid', 'profile', 'email', 'basic_info'] 
}));

// Route 3: สำหรับรับข้อมูลกลับมาจากมหาลัย (Callback)
router.get('/callback', 
  passport.authenticate('cmu-oauth', { failureRedirect: '/login-failed' }),
  (req, res) => {
    res.redirect('http://localhost:5173/'); 
  }
);

// Route 4: เช็คสถานะการล็อกอิน
router.get('/me', (req, res) => {
  if ((req as any).isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Route 5: ล็อกเอาท์
router.post('/logout', (req, res, next) => {
  (req as any).logout((err: any) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });
});

export default router;