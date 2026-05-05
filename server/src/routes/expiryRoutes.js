import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';
import { analyzeExpiry } from '../services/expiryService.js';

const router = Router();

const expiryAnalyzeSchema = z.object({
  ocrText: z.string().max(20000).optional().default(''),
  product: z
    .object({
      productName: z.string().optional(),
      categories: z.string().nullable().optional(),
      expiryInfo: z.string().nullable().optional(),
      storageConditions: z.string().nullable().optional()
    })
    .nullable()
    .optional()
    .default(null)
});

router.post(
  '/analyze',
  validate(expiryAnalyzeSchema),
  asyncHandler(async (req, res) => {
    const expiry = analyzeExpiry(req.body);
    return res.json({ expiry });
  })
);

export default router;
