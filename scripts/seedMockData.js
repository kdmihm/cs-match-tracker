import admin from "firebase-admin";

const FALLBACK_LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='24' fill='%23182730'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' fill='%23f5c85f' font-family='Arial' font-size='26' font-weight='700'%3ECS%3C/text%3E%3C/svg%3E";

const teams = [
  { id: "team_spirit", name: "Team Spirit", slug: "team-spirit", region: "EU", logoUrl: FALLBACK_LOGO },
  { id: "team_faze", name: "FaZe Clan", slug: "faze-clan", region: "EU", logoUrl: FALLBACK_LOGO },
  { id: "team_vitality", name: "Team Vitality", slug: "team-vitality", region: "EU", logoUrl: FALLBACK_LOGO },
  { id: "team_g2", name: "G2 Esports", slug: "g2-esports", region: "EU", logoUrl: FALLBACK_LOGO },
];

const now = Date.now();
const matches = [
  {
    id: "match_live_1",
    externalId: "seed_live_1",
    status: "live",
    format: "bo3",
    startTime: new Date(now - 36 * 60 * 1000).toISOString(),
    eventId: "event_iem_seed",
    eventName: "IEM Spring Seed",
    team1: teams[0],
    team2: teams[1],
    teamIds: [teams[0].id, teams[1].id],
    score: { team1: 1, team2: 0 },
    maps: [{ name: "Mirage", team1Score: 13, team2Score: 9, status: "finished" }],
    winnerId: null,
    source: "seed",
  },
  {
    id: "match_upcoming_1",
    externalId: "seed_upcoming_1",
    status: "upcoming",
    format: "bo3",
    startTime: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    eventId: "event_iem_seed",
    eventName: "IEM Spring Seed",
    team1: teams[2],
    team2: teams[3],
    teamIds: [teams[2].id, teams[3].id],
    score: { team1: 0, team2: 0 },
    maps: [],
    winnerId: null,
    source: "seed",
  },
  {
    id: "match_finished_1",
    externalId: "seed_finished_1",
    status: "finished",
    format: "bo1",
    startTime: new Date(now - 20 * 60 * 60 * 1000).toISOString(),
    eventId: "event_iem_seed",
    eventName: "IEM Spring Seed",
    team1: teams[0],
    team2: teams[2],
    teamIds: [teams[0].id, teams[2].id],
    score: { team1: 13, team2: 11 },
    maps: [{ name: "Ancient", team1Score: 13, team2Score: 11, status: "finished" }],
    winnerId: teams[0].id,
    source: "seed",
  },
];

async function seed() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("Missing project id. Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT before running npm run seed.");
  }

  admin.initializeApp({ projectId });
  const db = admin.firestore();
  const batch = db.batch();
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

  teams.forEach((team) => {
    batch.set(db.collection("teams").doc(team.id), { ...team, updatedAt: serverTimestamp() }, { merge: true });
  });

  batch.set(
    db.collection("events").doc("event_iem_seed"),
    {
      id: "event_iem_seed",
      name: "IEM Spring Seed",
      slug: "iem-spring-seed",
      location: "Cologne",
      startDate: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  matches.forEach((match) => {
    batch.set(
      db.collection("matches").doc(match.id),
      {
        ...match,
        lastSyncedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  await batch.commit();
  console.log(`Seeded ${teams.length} teams and ${matches.length} matches.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
