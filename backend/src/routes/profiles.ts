import { Router } from 'express';
import { db } from '../../db/index.js';
import { userProfiles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// API: GET /profile/:studentId
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const profile = await db.select().from(userProfiles).where(eq(userProfiles.studentId, studentId));
    
    if (profile.length === 0) {
      return res.status(200).json({ hasProfile: false, message: 'Profile not found, please fill in your details.' });
    }
    res.status(200).json({ hasProfile: true, profile: profile[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// API: POST /profile
router.post('/', async (req, res) => {
  try {
    const { 
      studentId, nickname, hasShopShirt, major, height, 
      medicalCondition, drugAllergies, foodAllergies, contactChannel, phoneNumber 
    } = req.body;

    if (!studentId || !nickname || hasShopShirt === undefined || !major || !height || !contactChannel || !phoneNumber) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const upsertedProfile = await db.insert(userProfiles)
      .values({
        studentId, nickname, hasShopShirt, major, height, 
        medicalCondition: medicalCondition || null, 
        drugAllergies: drugAllergies || null, 
        foodAllergies: foodAllergies || null, 
        contactChannel, phoneNumber
      })
      .onConflictDoUpdate({
        target: userProfiles.studentId,
        set: { 
          nickname, hasShopShirt, major, height, 
          medicalCondition: medicalCondition || null, 
          drugAllergies: drugAllergies || null, 
          foodAllergies: foodAllergies || null, 
          contactChannel, phoneNumber, updatedAt: new Date() 
        }
      })
      .returning();

    res.status(200).json({ message: 'Profile saved successfully', profile: upsertedProfile[0] });
  } catch (error) {
    console.error("Profile Save Error:", error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;