import admin from 'firebase-admin';
import { env } from './env.js';

let initialized = false;
let disabledReason = null;

const isPlaceholder = (value = '') => {
  if (!value) return true;
  const normalized = String(value).trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes('your_') ||
    normalized.includes('your-project') ||
    normalized.includes('your_project') ||
    normalized.includes('your_key') ||
    normalized.includes('xxxxx@your_project_id') ||
    normalized.includes('placeholder')
  );
};

const hasValidConfig =
  !isPlaceholder(env.FIREBASE_PROJECT_ID) &&
  !isPlaceholder(env.FIREBASE_CLIENT_EMAIL) &&
  !isPlaceholder(env.FIREBASE_PRIVATE_KEY);

export const isFirebaseConfigured = hasValidConfig;

export const initializeFirebaseAdmin = () => {
  if (initialized || !hasValidConfig) {
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });

    initialized = true;
  } catch (error) {
    disabledReason = error.message || 'Unknown Firebase Admin initialization error.';
    console.warn(
      '[NutriScan] Firebase Admin disabled due to invalid credentials. Update server/.env.',
      disabledReason
    );
  }
};

export const getFirebaseAuth = () => {
  if (!hasValidConfig || !initialized) {
    return null;
  }

  return admin.auth();
};

export const getFirebaseDisabledReason = () => disabledReason;
