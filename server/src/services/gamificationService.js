// ── Points Calculation ───────────────────────────────────────────────

/**
 * Convert health score → base points.
 */
const basePoints = (healthScore) => {
  if (healthScore >= 80) return 50;
  if (healthScore >= 60) return 30;
  if (healthScore >= 40) return 10;
  return 5;
};

/**
 * Streak multiplier: 1.0 + (min(streakDays, 30) * 0.05).
 * Caps at 2.5x on day 30.
 */
const streakMultiplier = (streakDays) =>
  1.0 + Math.min(streakDays, 30) * 0.05;

/**
 * Diminishing returns based on daily scan count.
 * Scans 1–5: 100%, 6–10: 50%, 11+: 0%.
 */
const dailyDecay = (dailyScanCount) => {
  if (dailyScanCount <= 5) return 1.0;
  if (dailyScanCount <= 10) return 0.5;
  return 0.0;
};

/**
 * Full points formula.
 * Points = round((base + discoveryBonus) * streakMul * dailyDecayMul)
 */
export const calculatePoints = (healthScore, streakDays, dailyScanCount, isUniqueScan) => {
  const base = basePoints(healthScore);
  const discovery = isUniqueScan ? 20 : 0;
  const ms = streakMultiplier(streakDays);
  const md = dailyDecay(dailyScanCount);
  const total = Math.round((base + discovery) * ms * md);

  return {
    total,
    breakdown: {
      base,
      discoveryBonus: discovery,
      streakMultiplier: parseFloat(ms.toFixed(2)),
      dailyDecay: md
    }
  };
};

// ── Streak Logic ─────────────────────────────────────────────────────

const toDateString = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Update streak based on the last scan date.
 * Returns the updated streak fields.
 */
export const updateStreak = (profile, now = new Date()) => {
  const todayStr = toDateString(now);
  const lastScanStr = profile.lastScanDate ? toDateString(profile.lastScanDate) : null;

  // Already scanned today — no streak change
  if (lastScanStr === todayStr) {
    return {
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      streakFreezes: profile.streakFreezes,
      streakMaintained: true,
      streakIncremented: false
    };
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateString(yesterday);

  // Last scan was yesterday — increment streak
  if (lastScanStr === yesterdayStr) {
    const newStreak = profile.currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(profile.longestStreak, newStreak),
      streakFreezes: profile.streakFreezes,
      streakMaintained: true,
      streakIncremented: true
    };
  }

  // Last scan was 2 days ago — try to use a freeze
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = toDateString(twoDaysAgo);

  if (lastScanStr === twoDaysAgoStr && profile.streakFreezes > 0) {
    const newStreak = profile.currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(profile.longestStreak, newStreak),
      streakFreezes: profile.streakFreezes - 1,
      streakMaintained: true,
      streakIncremented: true,
      freezeUsed: true
    };
  }

  // Streak is broken — reset to 1 (this scan starts a new streak)
  return {
    currentStreak: 1,
    longestStreak: profile.longestStreak,
    streakFreezes: profile.streakFreezes,
    streakMaintained: false,
    streakIncremented: false
  };
};

// ── Daily Scan Counter ───────────────────────────────────────────────

export const getDailyScanCount = (profile, now = new Date()) => {
  const todayStr = toDateString(now);
  if (profile.lastScanResetDate === todayStr) {
    return profile.dailyScanCount;
  }
  return 0; // new day, counter resets
};

// ── Leveling ─────────────────────────────────────────────────────────

/**
 * Level = floor((totalPoints / 200) ^ (2/3)), minimum 1.
 */
export const computeLevel = (totalPoints) => {
  if (totalPoints <= 0) return 1;
  return Math.max(1, Math.floor(Math.pow(totalPoints / 200, 2 / 3)));
};

/**
 * Points required for a given level.
 * Inverse of computeLevel: requiredPoints = 200 * L^1.5
 */
export const pointsForLevel = (level) =>
  Math.round(200 * Math.pow(level, 1.5));

/**
 * Progress fraction to the next level (0..1).
 */
export const levelProgress = (totalPoints) => {
  const currentLevel = computeLevel(totalPoints);
  const currentReq = pointsForLevel(currentLevel);
  const nextReq = pointsForLevel(currentLevel + 1);
  if (nextReq <= currentReq) return 1;
  return Math.min(1, Math.max(0, (totalPoints - currentReq) / (nextReq - currentReq)));
};

export const levelTitle = (level) => {
  if (level >= 100) return 'NutriScan Elite';
  if (level >= 50) return 'Wellness Architect';
  if (level >= 25) return 'Nutrition Advocate';
  if (level >= 10) return 'Label Reader';
  return 'Novice Scanner';
};

export const levelColor = (level) => {
  if (level >= 100) return 'prismatic';
  if (level >= 50) return 'emerald';
  if (level >= 25) return 'gold';
  if (level >= 10) return 'silver';
  return 'bronze';
};

// ── Achievements ─────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  {
    id: 'first_bite',
    name: 'First Bite',
    description: 'Scan your very first item.',
    icon: '🍎',
    bonus: 50,
    check: (profile) => profile.totalScans >= 1
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Maintain a 7-day streak.',
    icon: '🔥',
    bonus: 200,
    check: (profile) => profile.currentStreak >= 7
  },
  {
    id: 'green_eater',
    name: 'Green Eater',
    description: 'Scan 10 items with Health Score > 85.',
    icon: '🥗',
    bonus: 300,
    check: (profile) => {
      const highScores = (profile.healthScoreHistory || []).filter((s) => s > 85);
      return highScores.length >= 10;
    }
  },
  {
    id: 'label_detective',
    name: 'Label Detective',
    description: 'Scan 100 unique products.',
    icon: '🔍',
    bonus: 500,
    check: (profile) => (profile.uniqueScansCount || 0) >= 100
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Maintain your streak using a Streak Freeze.',
    icon: '❄️',
    bonus: 100,
    check: (_profile, _scanData, streakResult) => streakResult?.freezeUsed === true
  },
  {
    id: 'sugar_sleuth',
    name: 'Sugar Sleuth',
    description: 'Scan 5 items with Health Score under 40.',
    icon: '🍬',
    bonus: 100,
    check: (profile) => {
      const lowScores = (profile.healthScoreHistory || []).filter((s) => s < 40);
      return lowScores.length >= 5;
    }
  },
  {
    id: 'consistency_king',
    name: 'Consistency King',
    description: 'Reach a 30-day streak.',
    icon: '👑',
    bonus: 1000,
    check: (profile) => profile.currentStreak >= 30
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Scan on 4 consecutive weekends.',
    icon: '🏋️',
    bonus: 400,
    check: (profile) => (profile.weekendScansWeeks || []).length >= 4
  },
  {
    id: 'trendsetter',
    name: 'Trendsetter',
    description: 'Improve weekly avg health score 3 weeks in a row.',
    icon: '📈',
    bonus: 800,
    check: (profile) => {
      const avgs = profile.weeklyAverages || [];
      if (avgs.length < 4) return false;
      const last4 = avgs.slice(-4);
      return last4[1] > last4[0] && last4[2] > last4[1] && last4[3] > last4[2];
    }
  },
  {
    id: 'pinnacle',
    name: 'Pinnacle',
    description: 'Reach Level 50.',
    icon: '🏆',
    bonus: 2000,
    check: (profile) => (profile.level || 1) >= 50
  }
];

export const getAllAchievements = () =>
  ACHIEVEMENTS.map(({ check, ...rest }) => rest);

/**
 * Check which achievements are newly unlocked.
 * Returns array of { id, name, bonus, icon }.
 */
export const checkAchievements = (profile, scanData, streakResult) => {
  const existing = new Set(profile.badges || []);
  const newBadges = [];

  for (const achievement of ACHIEVEMENTS) {
    if (existing.has(achievement.id)) continue;
    if (achievement.check(profile, scanData, streakResult)) {
      newBadges.push({
        id: achievement.id,
        name: achievement.name,
        icon: achievement.icon,
        bonus: achievement.bonus
      });
    }
  }

  return newBadges;
};

// ── Health Classification ────────────────────────────────────────────

export const getHealthClassification = (avgScore) => {
  if (avgScore >= 86) return { tier: 'Elite Nourisher', color: 'emerald' };
  if (avgScore >= 66) return { tier: 'Health Optimizer', color: 'green' };
  if (avgScore >= 41) return { tier: 'Conscious Consumer', color: 'amber' };
  return { tier: 'Needs Attention', color: 'red' };
};

export const computeAvgHealthScore = (history) => {
  if (!history || history.length === 0) return 0;
  const recent = history.slice(-30);
  return Math.round(recent.reduce((sum, s) => sum + s, 0) / recent.length);
};
