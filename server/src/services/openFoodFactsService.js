const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';

const pickNutrients = (nutriments = {}) => ({
  energyKcal: nutriments['energy-kcal_100g'] ?? null,
  proteins: nutriments.proteins_100g ?? null,
  carbohydrates: nutriments.carbohydrates_100g ?? null,
  sugars: nutriments.sugars_100g ?? null,
  fat: nutriments.fat_100g ?? null,
  saturatedFat: nutriments['saturated-fat_100g'] ?? null,
  fiber: nutriments.fiber_100g ?? null,
  sodium: nutriments.sodium_100g ?? null,
  salt: nutriments.salt_100g ?? null
});

const mapProduct = (rawProduct, barcode) => ({
  barcode,
  productName: rawProduct.product_name || 'Unknown Product',
  brands: rawProduct.brands || null,
  categories: rawProduct.categories || null,
  quantity: rawProduct.quantity || null,
  storageConditions:
    rawProduct.conservation_conditions_en ||
    rawProduct.conservation_conditions ||
    null,
  ingredients:
    rawProduct.ingredients_text_en ||
    rawProduct.ingredients_text ||
    (rawProduct.ingredients || []).map((i) => i.text).join(', ') ||
    null,
  nutritionalValues: pickNutrients(rawProduct.nutriments),
  nutriscoreGrade:
    rawProduct.nutriscore_grade ||
    (rawProduct.nutrition_grades_tags || [])[0] ||
    null,
  novaGroup: rawProduct.nova_group ?? rawProduct.nova_groups ?? null,
  expiryInfo:
    rawProduct.expiration_date ||
    (rawProduct.expiration_date_tags || []).join(', ') ||
    null,
  imageUrl: rawProduct.image_front_url || rawProduct.image_url || null
});

export const fetchProductByBarcode = async (barcode) => {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(barcode)}.json`);

  if (!response.ok) {
    throw new Error('Failed to fetch data from Open Food Facts.');
  }

  const data = await response.json();

  if (data.status !== 1 || !data.product) {
    return null;
  }

  return mapProduct(data.product, barcode);
};
