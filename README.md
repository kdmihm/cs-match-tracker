# CS2 Match Tracker

A full-stack web app for tracking professional Counter-Strike 2 matches. The frontend reads from Firestore, while Firebase Cloud Functions ingest and normalize data from PandaScore.

## Features

- Live, upcoming, and recent CS2 match feeds
- Match detail pages with score and map breakdowns
- Searchable teams page
- Firebase email/password authentication
- Favorite teams and personalized favorite match feed
- Scheduled Cloud Functions for matches, teams, and events
- Firestore security rules that keep synced collections backend-owned

## Setup

1. Install dependencies:

   ```bash
   npm install
   cd functions && npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Firebase web app config.

3. Set the PandaScore API token for Cloud Functions:

   ```bash
   firebase functions:secrets:set PANDASCORE_TOKEN
   ```

4. Run the app locally:

   ```bash
   npm run dev
   ```

5. Optional: seed sample Firestore data with Admin SDK credentials or the Firestore emulator:

   ```bash
   set FIREBASE_PROJECT_ID=your-project-id
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

Build and deploy hosting:

```bash
npm run build
firebase deploy --only hosting
```

## Data Flow

The browser never calls PandaScore directly. Scheduled Cloud Functions fetch PandaScore CS data through the legacy `/csgo/` endpoints, normalize it, and upsert Firestore documents. React hooks subscribe to Firestore for live UI updates.
