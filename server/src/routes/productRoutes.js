import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';
import { fetchProductByBarcode } from '../services/openFoodFactsService.js';

const router = Router();

const paramsSchema = z.object({
  barcode: z.string().min(6).max(32).regex(/^[0-9A-Za-z-]+$/)
});

router.get(
  '/:barcode',
  validate(paramsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const product = await fetchProductByBarcode(req.params.barcode);

    if (!product) {
      return res.status(404).json({ error: 'Product not found for this barcode.' });
    }

    return res.json({ product });
  })
);

export default router;
