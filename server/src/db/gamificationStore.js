import path from 'node:path';
import { JSONFilePreset } from 'lowdb/node';

const GAMIFICATION_FILE = path.resolve(process.cwd(), 'data', 'gamification.json');
const dbPromise = JSONFilePreset(GAMIFICATION_FILE, { profiles: {} });

const defaultProfile = () => ({
  totalPoints: 0,
  currentBalance: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastScanDate: null,
  streakFreezes: 0,
  dailyScanCount: 0,
  lastScanResetDate: null,
  scannedBarcodes: {},
  badges: [],
  healthScoreHistory: [],
  totalScans: 0,
  uniqueScansCount: 0,
  weekendScansWeeks: [],
  weeklyAverages: []
});

export const getProfile = async (uid) => {
  const db = await dbPromise;
  const existing = db.data.profiles[uid];
  if (!existing) {
    return { ...defaultProfile(), uid };
  }
  return { ...defaultProfile(), ...existing, uid };
};

export const upsertProfile = async (uid, data) => {
  const db = await dbPromise;
  const existing = db.data.profiles[uid] || defaultProfile();
  db.data.profiles[uid] = { ...existing, ...data };
  await db.write();
  return { ...db.data.profiles[uid], uid };
};
