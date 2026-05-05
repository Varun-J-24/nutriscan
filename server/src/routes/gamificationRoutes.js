import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';
import { getProfile, upsertProfile } from '../db/gamificationStore.js';
import {
  calculatePoints,
  updateStreak,
  getDailyScanCount,
  computeLevel,
  levelProgress,
  levelTitle,
  levelColor,
  checkAchievements,
  getAllAchievements,
  computeAvgHealthScore,
  getHealthClassification,
  pointsForLevel
} from '../services/gamificationService.js';
import {
  getRewardsCatalog,
  redeemReward
} from '../services/rewardsService.js';

const router = Router();

// ── GET /profile ─────────────────────────────────────────────────────
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const profile = await getProfile(req.user.uid);
    const avgScore = computeAvgHealthScore(profile.healthScoreHistory);
    const classification = getHealthClassification(avgScore);
    const progress = levelProgress(profile.totalPoints);
    const nextLevelPoints = pointsForLevel(computeLevel(profile.totalPoints) + 1);

    return res.json({
      profile: {
        totalPoints: profile.totalPoints,
        currentBalance: profile.currentBalance,
        level: profile.level,
        levelTitle: levelTitle(profile.level),
        levelColor: levelColor(profile.level),
        progressToNextLevel: parseFloat(progress.toFixed(3)),
        nextLevelPoints,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        streakFreezes: profile.streakFreezes,
        totalScans: profile.totalScans,
        uniqueScansCount: profile.uniqueScansCount,
        badges: profile.badges,
        avgHealthScore: avgScore,
        healthClassification: classification
      },
      achievements: getAllAchievements().map((a) => ({
        ...a,
        unlocked: (profile.badges || []).includes(a.id)
      }))
    });
  })
);

// ── POST /process-scan ───────────────────────────────────────────────
const processScanSchema = z.object({
  barcode: z.string().min(1),
  healthScore: z.number().min(0).max(100)
});

router.post(
  '/process-scan',
  validate(processScanSchema),
  asyncHandler(async (req, res) => {
    const { barcode, healthScore } = req.body;
    const uid = req.user.uid;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let profile = await getProfile(uid);

    // ── Anti-cheat: duplicate barcode cooldown (48 hours) ──
    const lastScanTime = profile.scannedBarcodes?.[barcode];
    const cooldownMs = 48 * 60 * 60 * 1000;
    const isDuplicate = lastScanTime && (now.getTime() - new Date(lastScanTime).getTime()) < cooldownMs;

    // ── Daily scan count ──
    let dailyCount = getDailyScanCount(profile, now);
    dailyCount += 1;

    // ── Is this a first-ever scan of this barcode? ──
    const isUniqueScan = !profile.scannedBarcodes?.[barcode];

    // ── Streak ──
    const streakResult = updateStreak(profile, now);

    // ── Points ──
    let pointsResult;
    if (isDuplicate) {
      pointsResult = {
        total: 0,
        breakdown: { base: 0, discoveryBonus: 0, streakMultiplier: 0, dailyDecay: 0, reason: 'Duplicate barcode cooldown (48h)' }
      };
    } else {
      pointsResult = calculatePoints(healthScore, streakResult.currentStreak, dailyCount, isUniqueScan);
    }

    // ── Update profile fields ──
    const newTotalPoints = profile.totalPoints + pointsResult.total;
    const newBalance = profile.currentBalance + pointsResult.total;
    const newLevel = computeLevel(newTotalPoints);
    const newTotalScans = (profile.totalScans || 0) + 1;
    const newUniqueScans = (profile.uniqueScansCount || 0) + (isUniqueScan ? 1 : 0);

    // Track health score history (keep last 60)
    const healthHistory = [...(profile.healthScoreHistory || []), healthScore].slice(-60);

    // Track weekend scans
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekNumber = `${now.getFullYear()}-W${Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)}`;
    let weekendWeeks = [...(profile.weekendScansWeeks || [])];
    if (isWeekend && !weekendWeeks.includes(weekNumber)) {
      weekendWeeks = [...weekendWeeks, weekNumber].slice(-8);
    }

    // Update scanned barcodes map
    const scannedBarcodes = { ...(profile.scannedBarcodes || {}), [barcode]: now.toISOString() };

    const updatedProfile = {
      totalPoints: newTotalPoints,
      currentBalance: newBalance,
      level: newLevel,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      streakFreezes: streakResult.streakFreezes,
      lastScanDate: now.toISOString(),
      dailyScanCount: dailyCount,
      lastScanResetDate: todayStr,
      scannedBarcodes,
      totalScans: newTotalScans,
      uniqueScansCount: newUniqueScans,
      healthScoreHistory: healthHistory,
      weekendScansWeeks: weekendWeeks
    };

    // ── Check achievements ──
    const tempProfile = { ...profile, ...updatedProfile };
    const newBadges = checkAchievements(tempProfile, { barcode, healthScore }, streakResult);
    let achievementBonus = 0;
    if (newBadges.length > 0) {
      achievementBonus = newBadges.reduce((sum, b) => sum + b.bonus, 0);
      updatedProfile.totalPoints += achievementBonus;
      updatedProfile.currentBalance += achievementBonus;
      updatedProfile.level = computeLevel(updatedProfile.totalPoints);
      updatedProfile.badges = [...(profile.badges || []), ...newBadges.map((b) => b.id)];
    } else {
      updatedProfile.badges = profile.badges || [];
    }

    await upsertProfile(uid, updatedProfile);

    const leveledUp = newLevel > (profile.level || 1);

    return res.json({
      pointsEarned: pointsResult.total,
      achievementBonus,
      breakdown: pointsResult.breakdown,
      newTotalPoints: updatedProfile.totalPoints,
      newBalance: updatedProfile.currentBalance,
      level: updatedProfile.level,
      levelTitle: levelTitle(updatedProfile.level),
      levelColor: levelColor(updatedProfile.level),
      leveledUp,
      progressToNextLevel: parseFloat(levelProgress(updatedProfile.totalPoints).toFixed(3)),
      streak: {
        current: streakResult.currentStreak,
        maintained: streakResult.streakMaintained,
        freezeUsed: streakResult.freezeUsed || false
      },
      newBadges,
      isDuplicate
    });
  })
);

// ── GET /rewards ─────────────────────────────────────────────────────
router.get(
  '/rewards',
  asyncHandler(async (req, res) => {
    const profile = await getProfile(req.user.uid);
    const catalog = getRewardsCatalog();
    return res.json({
      balance: profile.currentBalance,
      rewards: catalog
    });
  })
);

// ── POST /redeem ─────────────────────────────────────────────────────
const redeemSchema = z.object({
  rewardId: z.string().min(1)
});

router.post(
  '/redeem',
  validate(redeemSchema),
  asyncHandler(async (req, res) => {
    const profile = await getProfile(req.user.uid);
    const result = redeemReward(profile, req.body.rewardId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const updates = {
      currentBalance: profile.currentBalance - result.pointsDeducted
    };

    // Special handling for streak freeze
    if (result.reward.id === 'streak_freeze') {
      updates.streakFreezes = (profile.streakFreezes || 0) + 1;
    }

    await upsertProfile(req.user.uid, updates);

    return res.json({
      success: true,
      reward: result.reward,
      newBalance: updates.currentBalance
    });
  })
);

export default router;
