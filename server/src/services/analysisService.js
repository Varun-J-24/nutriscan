import OpenAI from 'openai';
import { env } from '../config/env.js';

const openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const RISK_PATTERNS = [
  { pattern: /(high fructose corn syrup|corn syrup)/i, label: 'Added sugar syrup', severity: 'high' },
  { pattern: /(palm oil|hydrogenated)/i, label: 'Processed fats', severity: 'medium' },
  { pattern: /(sodium benzoate|potassium sorbate|nitrite|nitrate)/i, label: 'Preservatives', severity: 'medium' },
  { pattern: /(artificial flavor|artificial colour|artificial color|e\d{3})/i, label: 'Artificial additives', severity: 'medium' },
  { pattern: /(aspartame|sucralose|acesulfame)/i, label: 'Artificial sweeteners', severity: 'medium' }
];

const colorBySeverity = {
  low: 'green',
  medium: 'yellow',
  high: 'red'
};

const scoreFromNutrition = (nutrition = {}) => {
  let score = 100;

  const sugar = Number(nutrition.sugars ?? 0);
  const saturatedFat = Number(nutrition.saturatedFat ?? 0);
  const sodium = Number(nutrition.sodium ?? 0);
  const fiber = Number(nutrition.fiber ?? 0);
  const protein = Number(nutrition.proteins ?? 0);

  if (sugar > 10) score -= 20;
  else if (sugar > 5) score -= 10;

  if (saturatedFat > 5) score -= 15;
  else if (saturatedFat > 2) score -= 8;

  if (sodium > 0.6) score -= 20;
  else if (sodium > 0.3) score -= 10;

  if (fiber >= 3) score += 6;
  if (protein >= 8) score += 4;

  return Math.max(0, Math.min(100, score));
};

const detectIngredients = (ingredientsText = '') => {
  const matches = [];

  for (const rule of RISK_PATTERNS) {
    if (rule.pattern.test(ingredientsText)) {
      matches.push({
        label: rule.label,
        severity: rule.severity,
        color: colorBySeverity[rule.severity]
      });
    }
  }

  return matches;
};

const fallbackAnalysis = (product, expiryStatus) => {
  const issues = detectIngredients(product.ingredients || '');
  const healthScore = scoreFromNutrition(product.nutritionalValues);

  const warnings = [];
  if (issues.length > 0) {
    warnings.push(`Potential concern ingredients detected: ${issues.map((x) => x.label).join(', ')}.`);
  }

  if ((product.nutritionalValues?.sugars ?? 0) > 10) {
    warnings.push('High sugar content per 100g.');
  }

  if (expiryStatus === 'Expired') {
    warnings.push('Product appears expired based on detected date.');
  }

  const suitability = {
    diabetic: (product.nutritionalValues?.sugars ?? 0) <= 5 ? 'Better option' : 'Use caution',
    fitness: healthScore >= 70 ? 'Suitable for regular consumption' : 'Moderate use recommended',
    general: healthScore >= 60 ? 'Generally acceptable' : 'Consume occasionally'
  };

  return {
    simplifiedExplanation:
      'This product was analyzed using ingredient and nutrition heuristics. Check sugar, sodium, and additives before frequent use.',
    warnings,
    suitability,
    highlightedIngredients: issues,
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
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a food safety and nutrition assistant. Return strict JSON with keys: simplifiedExplanation (string), warnings (string[]), suitability (object with diabetic, fitness, general strings), highlightedIngredients (array of {label,severity,color}), healthScore (number 0-100).'
        },
        {
          role: 'user',
          content: JSON.stringify({
            product,
            expiryStatus,
            fallbackHealthScore: fallback.healthScore
          })
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    const parsed = JSON.parse(content);
    return {
      simplifiedExplanation: parsed.simplifiedExplanation || fallback.simplifiedExplanation,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : fallback.warnings,
      suitability: parsed.suitability || fallback.suitability,
      highlightedIngredients: Array.isArray(parsed.highlightedIngredients)
        ? parsed.highlightedIngredients
        : fallback.highlightedIngredients,
      healthScore: Number.isFinite(parsed.healthScore)
        ? Math.max(0, Math.min(100, Math.round(parsed.healthScore)))
        : fallback.healthScore
    };
  } catch (error) {
    console.warn('AI analysis failed. Using deterministic fallback.', error.message);
    return fallback;
  }
};

export const analyzeProduct = async (productPayload, expiryStatus) => {
  const fallback = fallbackAnalysis(productPayload, expiryStatus);
  return tryAiAnalysis(productPayload, expiryStatus, fallback);
};
