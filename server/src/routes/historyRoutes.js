import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';
import { addHistoryEntry, getHistoryByUser } from '../db/historyStore.js';

const router = Router();

const historyEntrySchema = z.object({
  barcode: z.string().optional(),
  productName: z.string(),
  healthScore: z.number().min(0).max(100),
  expiryStatus: z.enum(['Expired', 'Expiring Soon', 'Safe', 'Unknown']),
  scannedAt: z.string().datetime(),
  warnings: z.array(z.string()).default([])
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await getHistoryByUser(req.user.uid);
    return res.json({ items });
  })
);

router.post(
  '/',
  validate(historyEntrySchema),
  asyncHandler(async (req, res) => {
    const items = await addHistoryEntry(req.user.uid, req.body);
    return res.status(201).json({ items });
  })
);

export default router;
