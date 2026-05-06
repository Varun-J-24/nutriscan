import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSONFilePreset } from 'lowdb/node';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
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
