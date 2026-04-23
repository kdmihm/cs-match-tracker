# CS2 Match Tracker

A full-stack web app for tracking professional Counter-Strike 2 matches. The frontend reads from Firestore, while local scripts or Firebase Cloud Functions ingest and normalize data from PandaScore.

## Features

- Live, upcoming, and recent CS2 match feeds
- Match detail pages with score and map breakdowns
- Searchable teams page
- Firebase email/password authentication
- Favorite teams and personalized favorite match feed
- Local PandaScore sync scripts for matches, teams, and events
- Optional scheduled Cloud Functions for matches, teams, and events
- Firestore security rules that keep synced collections backend-owned

## Setup

1. Install dependencies:

   ```bash
   npm install
   cd functions && npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Firebase web app config.

3. For the free/local sync path, add these values to `.env.local`:

   ```env
   PANDASCORE_TOKEN=your-pandascore-token
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
   ```

4. Download a Firebase Admin service account JSON from Firebase Console > Project settings > Service accounts > Generate new private key. Place it in the project root as `service-account.json`. This file is ignored by git.

5. Run the app locally:

   ```bash
   npm run dev
   ```

6. Sync real PandaScore data into Firestore from your machine:

   ```bash
   npm run sync
   ```

   To keep syncing while you are working, run this in a second terminal:

   ```bash
   npm run sync:watch
   ```

   To refresh only the ranked/featured teams list:

   ```bash
   npm run sync:rankings
   ```

7. Optional: seed sample Firestore data with Admin SDK credentials or the Firestore emulator:

   ```bash
   npm run seed
   ```

## Firebase

Deploy Firestore rules and indexes:

```bash
firebase deploy --only firestore
```

Deploy functions:

```bash
firebase deploy --only functions
```

The Functions deploy path requires the Firebase Blaze plan because it uses Secret Manager and scheduled Cloud Functions. For a no-billing hobby setup, skip Functions deployment and use `npm run sync` or `npm run sync:watch` instead.

Build and deploy hosting:

```bash
npm run build
firebase deploy --only hosting
```

## Data Flow

The browser never calls PandaScore directly. For local development, `scripts/syncPandascoreLocal.js` fetches PandaScore CS data through the legacy `/csgo/` endpoints, normalizes it, and upserts Firestore documents. React hooks subscribe to Firestore for live UI updates.
