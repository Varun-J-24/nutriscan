const MONTHS = {
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

const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const buildDate = (day, month, year) => {
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

export const extractExpiryDate = (text) => {
  if (!text) return null;

  const cleaned = text.replace(/\s+/g, ' ').trim();

  const numericPatterns = [
    /(?:exp|expiry|best before|use by|bb)[:\s-]*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/i,
    /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/
  ];

  for (const pattern of numericPatterns) {
    const match = cleaned.match(pattern);
    if (!match) continue;

    let day = Number(match[1]);
    let month = Number(match[2]) - 1;
    let year = Number(match[3]);

    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }

    const parsed = buildDate(day, month, year);
    if (parsed) {
      return parsed;
    }
  }

  const monthPattern =
    /(?:exp|expiry|best before|use by|bb)[:\s-]*(\d{1,2})\s*([a-zA-Z]{3,9})\s*(\d{2,4})/i;
  const monthMatch = cleaned.match(monthPattern);

  if (monthMatch) {
    const day = Number(monthMatch[1]);
    const monthToken = monthMatch[2].slice(0, 3).toLowerCase();
    let year = Number(monthMatch[3]);

    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }

    const month = MONTHS[monthToken];
    if (month !== undefined) {
      return buildDate(day, month, year);
    }
  }

  return null;
};

export const classifyExpiry = (date) => {
  if (!date) {
    return { status: 'Unknown', daysRemaining: null };
  }

  const today = normalizeDate(new Date());
  const target = normalizeDate(date);
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'Expired', daysRemaining: diffDays };
  }

  if (diffDays <= 7) {
    return { status: 'Expiring Soon', daysRemaining: diffDays };
  }

  return { status: 'Safe', daysRemaining: diffDays };
};
