import path from 'node:path';
import { JSONFilePreset } from 'lowdb/node';

const HISTORY_FILE = path.resolve(process.cwd(), 'data', 'history.json');
const dbPromise = JSONFilePreset(HISTORY_FILE, { histories: {} });

export const getHistoryByUser = async (uid) => {
  const db = await dbPromise;
  const history = db.data.histories[uid] || [];
  return history.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
};

export const addHistoryEntry = async (uid, entry) => {
  const db = await dbPromise;
  const current = db.data.histories[uid] || [];
  const next = [entry, ...current].slice(0, 100);

  db.data.histories[uid] = next;
  await db.write();

  return next;
};
