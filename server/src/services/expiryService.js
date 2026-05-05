const toDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const monthMap = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
};

const buildDate = (year, month, day) => {
  const date = new Date(year, month, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

const endOfMonth = (year, month) => new Date(year, month + 1, 0);

const normalizeYear = (year) => {
  if (year >= 100) return year;
  return year > 50 ? 1900 + year : 2000 + year;
};

const withinReasonableWindow = (date) => {
  const today = toDateOnly(new Date());
  const tenYears = new Date(today.getFullYear() + 10, today.getMonth(), today.getDate());
  const fiveYearsAgo = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());
  return date >= fiveYearsAgo && date <= tenYears;
};

const parseNumericDate = (a, b, c) => {
  const first = Number(a);
  const second = Number(b);
  const year = normalizeYear(Number(c));

  const ddmmyyyy = buildDate(year, second - 1, first);
  const mmddyyyy = buildDate(year, first - 1, second);

  if (first > 12 && ddmmyyyy) return ddmmyyyy;
  if (second > 12 && mmddyyyy) return mmddyyyy;

  return ddmmyyyy || mmddyyyy || null;
};

const parseCandidatesFromText = (text, source, confidenceBoost = 0) => {
  const input = String(text || '');
  if (!input.trim()) return [];

  const candidates = [];
  const pushCandidate = (date, matchedText, confidence, reason) => {
    if (!date || !withinReasonableWindow(date)) return;

    candidates.push({
      date,
      source,
      matchedText,
      confidence: Math.min(0.99, Math.max(0.2, confidence + confidenceBoost)),
      reason
    });
  };

  const lowered = input.toLowerCase();
  const hasExpiryKeyword = /(exp|expiry|best before|use by|bb|mfg|packed)/i.test(lowered);

  const numericPattern = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/g;
  for (const match of lowered.matchAll(numericPattern)) {
    const parsed = parseNumericDate(match[1], match[2], match[3]);
    pushCandidate(parsed, match[0], hasExpiryKeyword ? 0.88 : 0.72, 'numeric date pattern');
  }

  const isoPattern = /(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/g;
  for (const match of lowered.matchAll(isoPattern)) {
    const parsed = buildDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    pushCandidate(parsed, match[0], hasExpiryKeyword ? 0.9 : 0.76, 'iso date pattern');
  }

  const monthPattern = /(\d{1,2})\s*([a-z]{3,9})\s*(\d{2,4})/gi;
  for (const match of lowered.matchAll(monthPattern)) {
    const month = monthMap[match[2].slice(0, 3)];
    if (month === undefined) continue;
    const parsed = buildDate(normalizeYear(Number(match[3])), month, Number(match[1]));
    pushCandidate(parsed, match[0], hasExpiryKeyword ? 0.89 : 0.74, 'month name pattern');
  }

  const monthYearPattern = /([a-z]{3,9})\s*(20\d{2}|\d{2})/gi;
  for (const match of lowered.matchAll(monthYearPattern)) {
    const month = monthMap[match[1].slice(0, 3)];
    if (month === undefined) continue;
    const year = normalizeYear(Number(match[2]));
    const parsed = endOfMonth(year, month);
    pushCandidate(parsed, match[0], 0.6, 'month and year, assumed end-of-month');
  }

  const compactPattern = /\b(20\d{2})(\d{2})(\d{2})\b/g;
  for (const match of lowered.matchAll(compactPattern)) {
    const parsed = buildDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    pushCandidate(parsed, match[0], hasExpiryKeyword ? 0.87 : 0.7, 'compact yyyymmdd pattern');
  }

  return candidates;
};

const dedupeByDate = (candidates) => {
  const map = new Map();
  for (const candidate of candidates) {
    const key = candidate.date.toISOString().slice(0, 10);
    const existing = map.get(key);
    if (!existing || candidate.confidence > existing.confidence) {
      map.set(key, candidate);
    }
  }
  return [...map.values()];
};

const pickBestCandidate = (candidates) => {
  if (!candidates.length) return null;

  const today = toDateOnly(new Date());
  const scored = candidates
    .map((candidate) => {
      const days = Math.ceil((toDateOnly(candidate.date) - today) / (1000 * 60 * 60 * 24));
      let score = candidate.confidence;
      if (days >= 0 && days <= 3650) score += 0.05;
      if (days < -365) score -= 0.1;
      return { ...candidate, days, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0];
};

const inferFreshnessWindow = (product = {}) => {
  const haystack = `${product.categories || ''} ${product.storageConditions || ''} ${product.productName || ''}`.toLowerCase();

  if (/(milk|yogurt|cheese|paneer|curd|dairy|fresh juice|salad|sandwich|meat|fish|chicken)/.test(haystack)) {
    return 5;
  }
  if (/(bread|bakery|cake|pastry|fresh fruit|vegetable)/.test(haystack)) {
    return 4;
  }
  if (/(snack|chips|noodle|cereal|biscuit|chocolate|candy|protein bar|powder|drink mix)/.test(haystack)) {
    return 14;
  }

  return 7;
};

const classifyStatus = (date, freshnessWindowDays) => {
  if (!date) {
    return { status: 'Unknown', daysRemaining: null, riskLevel: 'unknown' };
  }

  const today = toDateOnly(new Date());
  const target = toDateOnly(date);
  const daysRemaining = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'Expired', daysRemaining, riskLevel: 'high' };
  }

  if (daysRemaining <= freshnessWindowDays) {
    return { status: 'Expiring Soon', daysRemaining, riskLevel: 'medium' };
  }

  return { status: 'Safe', daysRemaining, riskLevel: 'low' };
};

const buildActions = ({ status, daysRemaining, product }) => {
  if (status === 'Expired') {
    return [
      'Do not consume unless package specifically states product is still safe after this date.',
      'Check for spoilage signs: smell, gas buildup, texture change, or mold.',
      'Dispose safely if it is a perishable food item.'
    ];
  }

  if (status === 'Expiring Soon') {
    return [
      `Use within ${Math.max(0, daysRemaining)} day(s) for best safety and quality.`,
      'Prioritize this item in meal planning to avoid waste.',
      'Store as recommended and refrigerate immediately after opening.'
    ];
  }

  if (status === 'Safe') {
    return [
      'Product appears safe by date; continue normal storage practices.',
      'Once opened, follow on-pack storage and consume within the opened-product window.',
      'Re-check date before each use.'
    ];
  }

  const storageHint = product?.storageConditions
    ? `Storage hint from label: ${product.storageConditions}`
    : 'Storage hint unavailable; rely on package instructions and manufacturer label.';

  return [
    'No reliable expiry date found from scan or product metadata.',
    'Try scanning under better lighting and focus directly on the date label.',
    storageHint
  ];
};

export const analyzeExpiry = ({ ocrText = '', product = null } = {}) => {
  const ocrCandidates = parseCandidatesFromText(ocrText, 'ocr', 0);
  const productCandidates = parseCandidatesFromText(product?.expiryInfo || '', 'product_meta', 0.06);
  const combined = dedupeByDate([...productCandidates, ...ocrCandidates]);

  const best = pickBestCandidate(combined);
  const freshnessWindowDays = inferFreshnessWindow(product || {});
  const classification = classifyStatus(best?.date || null, freshnessWindowDays);

  const confidence = best ? Number(best.confidence.toFixed(2)) : 0;
  const source = best?.source || 'none';
  const reason = best?.reason || 'No parseable expiry date found in OCR text or product metadata.';

  return {
    status: classification.status,
    daysRemaining: classification.daysRemaining,
    expiryDate: best ? best.date.toISOString().slice(0, 10) : null,
    confidence,
    source,
    reason,
    riskLevel: classification.riskLevel,
    freshnessWindowDays,
    storageAdvice: product?.storageConditions || null,
    actions: buildActions({
      status: classification.status,
      daysRemaining: classification.daysRemaining,
      product: product || {}
    }),
    extractedCandidates: combined
      .slice(0, 5)
      .map((candidate) => ({
        date: candidate.date.toISOString().slice(0, 10),
        source: candidate.source,
        confidence: Number(candidate.confidence.toFixed(2)),
        matchedText: candidate.matchedText
      }))
  };
};
