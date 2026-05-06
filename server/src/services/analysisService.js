import OpenAI from 'openai';
import { env } from '../config/env.js';

const openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

/**
 * Ingredient Knowledge Base - providing detailed context for common concerning ingredients
 */
const INGREDIENT_KB = [
  {
    pattern: /(high fructose corn syrup|corn syrup|glucose-fructose syrup)/i,
    name: 'High Fructose Corn Syrup',
    severity: 'high',
    color: 'red',
    explanation: 'A highly processed sweetener linked to insulin resistance, obesity, and fatty liver disease.',
    recommendation: 'Avoid products with this as a primary sweetener.'
  },
  {
    pattern: /(palm oil|hydrogenated|partially hydrogenated)/i,
    name: 'Processed / Hydrogenated Oils',
    severity: 'medium',
    color: 'yellow',
    explanation: 'Contains high levels of saturated or trans fats which can raise bad cholesterol (LDL).',
    recommendation: 'Look for products using olive oil, avocado oil, or high-oleic sunflower oil.'
  },
  {
    pattern: /(sodium benzoate|potassium sorbate|calcium propionate|nitrite|nitrate|sulphite|sulfite)/i,
    name: 'Synthetic Preservatives',
    severity: 'medium',
    color: 'yellow',
    explanation: 'Used to extend shelf life but may cause sensitivity or allergic reactions in some individuals.',
    recommendation: 'Prefer fresh or minimally processed alternatives when possible.'
  },
  {
    pattern: /(artificial flavor|artificial colour|artificial color|e102|e110|e129|e133|e150d|caramel color)/i,
    name: 'Artificial Additives',
    severity: 'medium',
    color: 'yellow',
    explanation: 'Synthetic dyes and flavors provide no nutritional value and may impact behavior in sensitive children.',
    recommendation: 'Choose products colored with natural fruit or vegetable extracts.'
  },
  {
    pattern: /(aspartame|sucralose|acesulfame|saccharin)/i,
    name: 'Artificial Sweeteners',
    severity: 'medium',
    color: 'yellow',
    explanation: 'Low-calorie sugar substitutes that may negatively affect gut microbiome health.',
    recommendation: 'If you want sweetness, small amounts of honey or maple syrup are often preferred.'
  },
  {
    pattern: /(monosodium glutamate|msg|yeast extract|hydrolyzed protein)/i,
    name: 'Flavor Enhancers (MSG types)',
    severity: 'medium',
    color: 'yellow',
    explanation: 'Ingredients designed to over-stimulate taste receptors; often found in highly processed savory snacks.',
    recommendation: 'Use whole spices and herbs for flavor instead.'
  },
  {
    pattern: /(titanium dioxide|e171)/i,
    name: 'Titanium Dioxide',
    severity: 'high',
    color: 'red',
    explanation: 'A whitening agent recently banned in the EU due to concerns about its ability to damage DNA.',
    recommendation: 'Avoid candies and white-coated snacks containing this additive.'
  }
];

/**
 * Continuous Health Scoring Logic (WHO/FDA Aligned)
 * Range: 0-100
 */
const calculateHealthScore = (product) => {
  const nutrition = product.nutritionalValues || {};
  let score = 85; // Starting base score

  // Extract values (per 100g)
  const sugar = Number(nutrition.sugars ?? 0);
  const satFat = Number(nutrition.saturatedFat ?? 0);
  const sodium = Number(nutrition.sodium ?? 0);
  const fiber = Number(nutrition.fiber ?? 0);
  const protein = Number(nutrition.proteins ?? 0);
  const energy = Number(nutrition.energyKcal ?? 0);

  // 1. Sugars Deduction (WHO: <5% or 10% of energy)
  // Penalty: -2 pts per gram above 5g
  if (sugar > 5) {
    score -= Math.min(30, (sugar - 5) * 2);
  }

  // 2. Saturated Fat Deduction
  // Penalty: -3 pts per gram above 2g
  if (satFat > 2) {
    score -= Math.min(25, (satFat - 2) * 3);
  }

  // 3. Sodium Deduction (Target: <0.4g per 100g)
  // Penalty: -40 pts per gram
  if (sodium > 0.4) {
    score -= Math.min(30, (sodium - 0.4) * 40);
  }

  // 4. Energy Density Deduction
  // Penalty: -1 pt per 50kcal above 200kcal
  if (energy > 200) {
    score -= Math.min(15, (energy - 200) / 50);
  }

  // 5. Beneficial Bonuses
  // Fiber: +2 per gram (max +10)
  score += Math.min(10, fiber * 2);
  // Protein: +1 per gram above 5g (max +8)
  if (protein > 5) {
    score += Math.min(8, (protein - 5) * 1);
  }

  // 6. External Quality Indicators
  // Nutri-Score Adjustment
  if (product.nutriscoreGrade) {
    const grades = { a: 10, b: 5, c: 0, d: -10, e: -20 };
    score += grades[product.nutriscoreGrade.toLowerCase()] || 0;
  }

  // NOVA Group (Processing level)
  if (product.novaGroup === 4) score -= 15; // Ultra-processed
  if (product.novaGroup === 1) score += 5;  // Minimally processed

  return Math.max(0, Math.min(100, Math.round(score)));
};

const detectIngredients = (ingredientsText = '') => {
  const matches = [];
  const text = ingredientsText.toLowerCase();

  for (const item of INGREDIENT_KB) {
    if (item.pattern.test(text)) {
      matches.push({
        name: item.name,
        severity: item.severity,
        color: item.color,
        explanation: item.explanation,
        recommendation: item.recommendation
      });
    }
  }

  return matches;
};

const getNutritionHighlights = (product) => {
  const nutrition = product.nutritionalValues || {};
  const highlights = [];

  const add = (nutrient, value, unit, thresholdHigh, thresholdLow, higherIsBetter = false) => {
    if (value === null || value === undefined) return;
    
    let verdict = 'Moderate';
    let color = 'yellow';

    if (higherIsBetter) {
      if (value >= thresholdHigh) { verdict = 'High'; color = 'green'; }
      else if (value <= thresholdLow) { verdict = 'Low'; color = 'red'; }
    } else {
      if (value >= thresholdHigh) { verdict = 'High'; color = 'red'; }
      else if (value <= thresholdLow) { verdict = 'Low'; color = 'green'; }
    }

    highlights.push({ nutrient, value: `${value}${unit}`, verdict, color });
  };

  add('Sugar', nutrition.sugars, 'g', 15, 5);
  add('Sat. Fat', nutrition.saturatedFat, 'g', 5, 1.5);
  add('Sodium', nutrition.sodium, 'g', 0.6, 0.1);
  add('Fiber', nutrition.fiber, 'g', 6, 3, true);
  add('Protein', nutrition.proteins, 'g', 10, 5, true);

  return highlights;
};

const fallbackAnalysis = (product, expiryStatus) => {
  const ingredientAnalysis = detectIngredients(product.ingredients || '');
  const healthScore = calculateHealthScore(product);
  const nutritionHighlights = getNutritionHighlights(product);

  const warnings = [];
  if (ingredientAnalysis.length > 0) {
    warnings.push(`${ingredientAnalysis.length} concerning additive(s) found.`);
  }

  if ((product.nutritionalValues?.sugars ?? 0) > 15) {
    warnings.push('High sugar level detected.');
  }

  if (expiryStatus === 'Expired') {
    warnings.push('CRITICAL: Product is past its expiry date.');
  }

  const suitability = {
    diabetic: (product.nutritionalValues?.sugars ?? 0) <= 5 ? 'Safe option' : 'High Glycemic Risk',
    fitness: healthScore >= 75 ? 'Excellent fuel' : 'Limit to occasional use',
    general: healthScore >= 60 ? 'Regular consumption ok' : 'Eat in moderation'
  };

  return {
    simplifiedExplanation: `This product scores ${healthScore}/100. ${healthScore > 70 ? 'It is a nutritious choice for most diets.' : 'It contains ingredients that may warrant caution if consumed frequently.'}`,
    detailedBreakdown: `Analysis based on the nutritional profile (Energy: ${product.nutritionalValues?.energyKcal ?? 'N/A'}kcal/100g) and ingredient list. Key factors include ${product.nutritionalValues?.sugars > 10 ? 'elevated sugar content' : 'balanced sugar levels'} and ${ingredientAnalysis.length > 0 ? 'the presence of synthetic additives' : 'a clean ingredient label'}.`,
    warnings,
    suitability,
    ingredientAnalysis,
    nutritionHighlights,
    healthScore
  };
};

const tryAiAnalysis = async (product, expiryStatus, fallback) => {
  if (!openaiClient) {
    return fallback;
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert food scientist and nutritionist. Return strict JSON.
            Required Keys:
            - simplifiedExplanation: (string) A clear 1-sentence verdict.
            - detailedBreakdown: (string) A 4-sentence detailed analysis of nutrition and additives.
            - ingredientAnalysis: Array of objects { name, severity (low/medium/high), color (green/yellow/red), explanation, recommendation }.
            - nutritionHighlights: Array of objects { nutrient, value, verdict, color }.
            - suitability: Object { diabetic, fitness, general } with detailed string advice.
            - warnings: (string[]) Critical alerts.
            - healthScore: (number 0-100) Use the provided anchor but adjust based on AI expertise.`
        },
        {
          role: 'user',
          content: JSON.stringify({
            product,
            expiryStatus,
            calculatedAnchorScore: fallback.healthScore,
            fallbackIngredients: fallback.ingredientAnalysis
          })
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) return fallback;

    const parsed = JSON.parse(content);
    return {
      simplifiedExplanation: parsed.simplifiedExplanation || fallback.simplifiedExplanation,
      detailedBreakdown: parsed.detailedBreakdown || fallback.detailedBreakdown,
      ingredientAnalysis: Array.isArray(parsed.ingredientAnalysis) ? parsed.ingredientAnalysis : fallback.ingredientAnalysis,
      nutritionHighlights: Array.isArray(parsed.nutritionHighlights) ? parsed.nutritionHighlights : fallback.nutritionHighlights,
      suitability: parsed.suitability || fallback.suitability,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : fallback.warnings,
      healthScore: Number.isFinite(parsed.healthScore) ? Math.round(parsed.healthScore) : fallback.healthScore
    };
  } catch (error) {
    console.warn('AI analysis failed:', error.message);
    return fallback;
  }
};

export const analyzeProduct = async (productPayload, expiryStatus) => {
  const fallback = fallbackAnalysis(productPayload, expiryStatus);
  return tryAiAnalysis(productPayload, expiryStatus, fallback);
};
