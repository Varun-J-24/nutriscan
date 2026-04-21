import fs from 'node:fs';
import path from 'node:path';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initializeFirebaseAdmin, isFirebaseConfigured } from './config/firebaseAdmin.js';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (isFirebaseConfigured) {
  initializeFirebaseAdmin();
}

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`NutriScan server running on http://localhost:${env.PORT}`);
});
