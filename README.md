# NutriScan

NutriScan is a production-grade full-stack web app that scans food barcodes, fetches product nutrition data, detects expiry dates with OCR, generates AI health insights, and stores per-user scan history.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Auth:
  - Google OAuth (Firebase)
  - Local email/password auth (JWT + bcrypt)
- Barcode scanning: `@zxing/browser`
- OCR: `tesseract.js`
- Product API: Open Food Facts
- AI layer: OpenAI API (with deterministic fallback)
- Storage: JSON-based persistent history using `lowdb`

## Project Structure

- `client` - React frontend
- `server` - Express backend

## Environment Setup

### 1. Server env

Create `server/.env` from `server/.env.example`:

```bash
cp server/.env.example server/.env
```

Fill in:

- `OPENAI_API_KEY`
- `JWT_SECRET` (required for local email/password auth)
- Firebase auth verification:
  - `FIREBASE_PROJECT_ID` (required for Google OAuth flow)
- Optional Firebase Admin credentials (recommended for production):
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

### 2. Client env

Create `client/.env` from `client/.env.example`:

```bash
cp client/.env.example client/.env
```

Fill in Firebase Web App credentials from your Firebase project settings.

## Installation

```bash
cd server && npm install
cd ../client && npm install
```

## Run in Development

Open two terminals:

### Terminal 1 (Server)

```bash
cd server
npm run dev
```

Server runs on `http://localhost:4000`.

### Terminal 2 (Client)

```bash
cd client
npm run dev
```

Client runs on `http://localhost:5173`.

## Production Build

```bash
cd server && npm install --omit=dev
cd ../client && npm run build
```

## Firebase Setup Notes

1. Enable Google provider in Firebase Authentication.
2. Add `http://localhost:5173` to authorized domains.
3. Set `FIREBASE_PROJECT_ID` in `server/.env`.
4. Optional: add service account credentials for Admin SDK mode.

## Local Auth Endpoints

- `POST /api/auth/register` with `{ name, email, password }`
- `POST /api/auth/login` with `{ email, password }`
- Returns `{ token, user }` for local session usage

## Security Implemented

- API keys kept in environment variables.
- Protected API routes accept:
  - Firebase ID tokens (Google OAuth)
  - Local JWT tokens (email/password login)
- Request payload validation with `zod`.
- Basic rate limiting and security headers via `helmet`.
- Camera use requires explicit user action and can be stopped anytime.

## Feature Checklist

- Google OAuth with session persistence
- Live barcode scanning from device camera
- Product lookup from Open Food Facts
- OCR-driven expiry detection with status classification
- AI insights: explanation, warnings, suitability, health score
- Harmful ingredient highlighting (red/yellow/green)
- Per-user scan history
- Responsive startup-style dashboard UI
