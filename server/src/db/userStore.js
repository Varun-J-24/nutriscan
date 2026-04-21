import path from 'node:path';
import crypto from 'node:crypto';
import { JSONFilePreset } from 'lowdb/node';

const USERS_FILE = path.resolve(process.cwd(), 'data', 'users.json');
const dbPromise = JSONFilePreset(USERS_FILE, { users: [] });

const normalizeEmail = (email) => email.trim().toLowerCase();

export const findUserByEmail = async (email) => {
  const db = await dbPromise;
  const normalizedEmail = normalizeEmail(email);
  return db.data.users.find((user) => user.email === normalizedEmail) || null;
};

export const createUser = async ({ email, name, passwordHash }) => {
  const db = await dbPromise;
  const normalizedEmail = normalizeEmail(email);

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: name?.trim() || normalizedEmail.split('@')[0],
    passwordHash,
    createdAt: new Date().toISOString()
  };

  db.data.users.push(user);
  await db.write();

  return user;
};
