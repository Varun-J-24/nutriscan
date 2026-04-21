import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';
import { analyzeProduct } from '../services/analysisService.js';

const router = Router();

const analyzeSchema = z.object({
  product: z.object({
    barcode: z.string().optional(),
    productName: z.string(),
    ingredients: z.string().nullable().optional(),
    nutritionalValues: z.object({
      energyKcal: z.number().nullable().optional(),
      proteins: z.number().nullable().optional(),
      carbohydrates: z.number().nullable().optional(),
      sugars: z.number().nullable().optional(),
      fat: z.number().nullable().optional(),
      saturatedFat: z.number().nullable().optional(),
      fiber: z.number().nullable().optional(),
      sodium: z.number().nullable().optional(),
      salt: z.number().nullable().optional()
    })
  }),
  expiryStatus: z.enum(['Expired', 'Expiring Soon', 'Safe', 'Unknown']).default('Unknown')
});

router.post(
  '/',
  validate(analyzeSchema),
  asyncHandler(async (req, res) => {
    const analysis = await analyzeProduct(req.body.product, req.body.expiryStatus);
    return res.json({ analysis });
  })
);

export default router;
