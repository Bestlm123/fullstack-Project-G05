import { Router } from 'express';
import { db } from '../../db/index.js';
import { news, banners, siteSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../utils/authMiddleware.js'; 

const router = Router();

// --- News ---
router.get('/news', async (req, res) => {
  try {
    const allNews = await db.select().from(news);
    res.status(200).json(allNews);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch news' }); }
});

router.post('/news', requireAdmin, async (req, res) => {
  try {
    const { title, content, authorId } = req.body;
    const newArticle = await db.insert(news).values({ title, content, authorId }).returning();
    res.status(201).json(newArticle[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to add news' }); }
});

router.delete('/news/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(news).where(eq(news.id, parseInt(req.params.id as string))); // 👈 แก้ตรงนี้
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: 'Failed to delete news' }); }
});

// --- Banners ---
router.get('/banners', async (req, res) => {
  try {
    const allBanners = await db.select().from(banners);
    res.status(200).json(allBanners);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch banners' }); }
});

router.post('/banners', requireAdmin, async (req, res) => {
  try {
    const { imageUrl, altText, isActive } = req.body;
    const newBanner = await db.insert(banners).values({ imageUrl, altText, isActive: isActive ?? true }).returning();
    res.status(201).json(newBanner[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to add banner' }); }
});

router.put('/banners/:id', requireAdmin, async (req, res) => {
  try {
    const updatedBanner = await db.update(banners).set({ isActive: req.body.isActive })
      .where(eq(banners.id, parseInt(req.params.id as string))).returning();
    res.status(200).json(updatedBanner[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to update banner' }); }
});

router.delete('/banners/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(banners).where(eq(banners.id, parseInt(req.params.id as string)));
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: 'Failed to delete banner' }); }
});

// --- Site Settings ---
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.select().from(siteSettings);
    res.status(200).json(settings);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

router.post('/settings', requireAdmin, async (req, res) => {
  try {
    const { key, value, description } = req.body;
    const upsertedSetting = await db.insert(siteSettings).values({ key, value, description })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, description, updatedAt: new Date() } }).returning();
    res.status(200).json(upsertedSetting[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to save setting' }); }
});

export default router;