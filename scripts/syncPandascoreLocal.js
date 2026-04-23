import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";
import { normalizeTeamName, TOP_RANKED_TEAMS } from "../src/utils/rankedTeams.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const PANDASCORE_BASE_URL = "https://api.pandascore.co";
const FALLBACK_LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='24' fill='%23182730'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' fill='%23f5c85f' font-family='Arial' font-size='26' font-weight='700'%3ECS%3C/text%3E%3C/svg%3E";

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID;
}

function findServiceAccountPath() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const configuredPath = path.resolve(rootDir, process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(configuredPath)) {
      return configuredPath;
    }
  }

  const generatedKey = fs
    .readdirSync(rootDir)
    .find((fileName) => fileName.includes("firebase-adminsdk") && fileName.endsWith(".json"));

  return generatedKey ? path.join(rootDir, generatedKey) : null;
}

function initializeAdmin() {
  if (admin.apps.length) return admin.firestore();

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID.");
  }

  const serviceAccountPath = findServiceAccountPath();
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
    return admin.firestore();
  }

  admin.initializeApp({ projectId });
  return admin.firestore();
}

function getToken() {
  if (!process.env.PANDASCORE_TOKEN) {
    throw new Error("Missing PANDASCORE_TOKEN. Add it to .env.local or set it in your terminal.");
  }

  return process.env.PANDASCORE_TOKEN;
}

async function fetchPandascore(pathname, params = {}) {
  const url = new URL(`${PANDASCORE_BASE_URL}${pathname}`);
  Object.entries({ per_page: 100, ...params }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PandaScore ${response.status} for ${pathname}: ${body}`);
  }

  return response.json();
}

async function fetchPandascorePages(pathname, params = {}, maxPages = 5) {
  const results = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const pageResults = await fetchPandascore(pathname, { ...params, page });
    results.push(...pageResults);

    if (pageResults.length < (params.per_page || 100)) {
      break;
    }
  }

  return results;
}

function normalizeStatus(status) {
  const value = String(status || "upcoming").toLowerCase();
  if (["running", "in_progress", "live"].includes(value)) return "live";
  if (["finished", "completed", "closed"].includes(value)) return "finished";
  if (["cancelled", "canceled", "postponed"].includes(value)) return "cancelled";
  return "upcoming";
}

function normalizeTeam(opponent, fallbackName) {
  if (!opponent) {
    return {
      id: null,
      name: fallbackName,
      logoUrl: FALLBACK_LOGO,
    };
  }

  return {
    id: opponent.id ? `team_${opponent.id}` : null,
    name: opponent.name || fallbackName,
    logoUrl: opponent.image_url || FALLBACK_LOGO,
  };
}

function normalizeMap(game, index) {
  return {
    name: game.map?.name || game.name || `Map ${index + 1}`,
    team1Score: Number(game.results?.[0]?.score ?? game.team1_score ?? 0),
    team2Score: Number(game.results?.[1]?.score ?? game.team2_score ?? 0),
    status: normalizeStatus(game.status || "upcoming"),
  };
}

function normalizeMatch(apiMatch) {
  const status = normalizeStatus(apiMatch.status);
  const team1 = normalizeTeam(apiMatch.opponents?.[0]?.opponent, "TBD");
  const team2 = normalizeTeam(apiMatch.opponents?.[1]?.opponent, "TBD");
  const event = apiMatch.tournament || apiMatch.serie || apiMatch.league || {};
  const eventName =
    apiMatch.tournament?.name ||
    apiMatch.serie?.full_name ||
    apiMatch.serie?.name ||
    apiMatch.league?.name ||
    "Unknown event";
  const results = apiMatch.results || [];

  return {
    id: `match_${apiMatch.id}`,
    externalId: apiMatch.id,
    status,
    format: apiMatch.number_of_games ? `bo${apiMatch.number_of_games}` : "bo3",
    startTime: apiMatch.begin_at || apiMatch.scheduled_at || null,
    endTime: apiMatch.end_at || null,
    eventId: event.id ? `event_${event.id}` : null,
    eventName,
    team1,
    team2,
    teamIds: [team1.id, team2.id].filter(Boolean),
    score: {
      team1: status === "upcoming" ? 0 : Number(results[0]?.score ?? 0),
      team2: status === "upcoming" ? 0 : Number(results[1]?.score ?? 0),
    },
    maps: (apiMatch.games || []).map(normalizeMap),
    winnerId: apiMatch.winner_id ? `team_${apiMatch.winner_id}` : null,
    source: "pandascore",
    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function normalizeTeamDocument(apiTeam) {
  return {
    id: `team_${apiTeam.id}`,
    externalId: apiTeam.id,
    name: apiTeam.name || "Unknown team",
    slug: apiTeam.slug || null,
    logoUrl: apiTeam.image_url || FALLBACK_LOGO,
    region: apiTeam.location || apiTeam.region || "Unknown",
    source: "pandascore",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeEventDocument(apiEvent) {
  return {
    id: `event_${apiEvent.id}`,
    externalId: apiEvent.id,
    name: apiEvent.name || apiEvent.full_name || "Unknown event",
    slug: apiEvent.slug || null,
    location: apiEvent.location || null,
    startDate: apiEvent.begin_at || null,
    endDate: apiEvent.end_at || null,
    source: "pandascore",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function commitInBatches(db, collectionName, documents) {
  let batch = db.batch();
  let operationCount = 0;
  let total = 0;

  for (const document of documents) {
    batch.set(db.collection(collectionName).doc(document.id), document, { merge: true });
    operationCount += 1;
    total += 1;

    if (operationCount === 450) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  return total;
}

async function syncMatches(db, label, pathname, params = {}) {
  const apiMatches = await fetchPandascore(pathname, params);
  const normalizedMatches = apiMatches.map(normalizeMatch);
  const matchTotal = await commitInBatches(db, "matches", normalizedMatches);
  const teamTotal = await upsertTeamsFromMatches(db, normalizedMatches);
  console.log(`[${new Date().toLocaleTimeString()}] Synced ${matchTotal} ${label} matches and ${teamTotal} matched teams.`);
}

async function syncRecentResults(db) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  const apiMatches = await fetchPandascorePages(
    "/csgo/matches",
    {
      "range[end_at]": `${start.toISOString()},${end.toISOString()}`,
      sort: "-end_at",
      per_page: 100,
    },
    5,
  );
  const normalizedMatches = apiMatches.map(normalizeMatch).filter((match) => match.status === "finished");
  const matchTotal = await commitInBatches(db, "matches", normalizedMatches);
  const teamTotal = await upsertTeamsFromMatches(db, normalizedMatches);
  console.log(`[${new Date().toLocaleTimeString()}] Synced ${matchTotal} recent result matches and ${teamTotal} matched teams.`);
}

async function upsertTeamsFromMatches(db, matches) {
  const teamsById = new Map();

  for (const match of matches) {
    [match.team1, match.team2].forEach((team) => {
      if (!team?.id) return;

      teamsById.set(team.id, {
        id: team.id,
        name: team.name || "Unknown team",
        logoUrl: team.logoUrl || FALLBACK_LOGO,
        region: "Unknown",
        source: "pandascore_match",
        activeInSyncedMatches: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeenInMatchAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  }

  return commitInBatches(db, "teams", Array.from(teamsById.values()));
}

async function syncCollection(db, label, pathname, collectionName, normalizer, params = {}) {
  const apiDocuments = await fetchPandascore(pathname, params);
  const total = await commitInBatches(db, collectionName, apiDocuments.map(normalizer));
  console.log(`[${new Date().toLocaleTimeString()}] Synced ${total} ${label}.`);
}

async function syncRankedTeams(db) {
  const snapshot = await db.collection("teams").get();
  const existingTeamsByName = new Map();
  const previousRankedDocuments = [];

  snapshot.docs.forEach((docSnapshot) => {
    const team = { id: docSnapshot.id, ...docSnapshot.data() };
    if (team.isRankedTeam || team.isTop50Team) {
      previousRankedDocuments.push({
        id: docSnapshot.id,
        isRankedTeam: false,
        isTop50Team: false,
        previousRankedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    [team.name, team.slug, team.rankingName].filter(Boolean).forEach((name) => {
      existingTeamsByName.set(normalizeTeamName(name), team);
    });
  });

  if (previousRankedDocuments.length) {
    await commitInBatches(db, "teams", previousRankedDocuments);
  }

  const rankedDocuments = [];
  for (const rankedTeam of TOP_RANKED_TEAMS) {
    const candidates = [rankedTeam.name, ...rankedTeam.aliases];
    const apiTeam = await findPandascoreTeam(candidates);
    const existingTeam = apiTeam || candidates.map((name) => existingTeamsByName.get(normalizeTeamName(name))).find(Boolean);
    const id = apiTeam?.id ? `team_${apiTeam.id}` : existingTeam?.id || `ranked_${slugify(rankedTeam.name)}`;

    rankedDocuments.push({
      id,
      externalId: apiTeam?.id || existingTeam?.externalId || null,
      name: apiTeam?.name || existingTeam?.name || rankedTeam.name,
      slug: apiTeam?.slug || existingTeam?.slug || slugify(rankedTeam.name),
      logoUrl: apiTeam?.image_url || existingTeam?.logoUrl || FALLBACK_LOGO,
      region: apiTeam?.location || existingTeam?.region || "Unknown",
      source: apiTeam ? "pandascore_ranked_lookup" : existingTeam?.source || "hltv_ranking",
      isRankedTeam: true,
      isTop50Team: true,
      hltvRank: rankedTeam.rank,
      hltvPoints: rankedTeam.points,
      rankingName: rankedTeam.name,
      rankingAliases: rankedTeam.aliases,
      rankingSource: "hltv",
      rankingSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  const total = await commitInBatches(db, "teams", rankedDocuments);
  console.log(`[${new Date().toLocaleTimeString()}] Synced ${total} ranked teams.`);
}

async function findPandascoreTeam(candidates) {
  for (const candidate of candidates) {
    const exactMatches = await fetchPandascore("/csgo/teams", { "filter[name]": candidate, per_page: 10 });
    const exactMatch = exactMatches.find((team) => normalizeTeamName(team.name) === normalizeTeamName(candidate));
    if (exactMatch?.image_url) return exactMatch;

    const searchMatches = await fetchPandascore("/csgo/teams", { "search[name]": candidate, per_page: 10 });
    const searchMatch = searchMatches.find((team) => normalizeTeamName(team.name) === normalizeTeamName(candidate));
    if (searchMatch?.image_url) return searchMatch;
  }

  return null;
}

const jobs = {
  live: (db) => syncMatches(db, "live", "/csgo/matches/running"),
  upcoming: (db) => syncMatches(db, "upcoming", "/csgo/matches/upcoming", { sort: "begin_at" }),
  results: syncRecentResults,
  teams: (db) => syncCollection(db, "teams", "/csgo/teams", "teams", normalizeTeamDocument),
  events: (db) => syncCollection(db, "events", "/csgo/tournaments", "events", normalizeEventDocument, { sort: "-begin_at" }),
  rankings: syncRankedTeams,
};

async function runJob(db, jobName) {
  if (jobName === "all") {
    for (const name of ["teams", "events", "live", "upcoming", "results", "rankings"]) {
      await jobs[name](db);
    }
    return;
  }

  if (!jobs[jobName]) {
    throw new Error(`Unknown sync job "${jobName}". Use live, upcoming, results, teams, events, rankings, all, or watch.`);
  }

  await jobs[jobName](db);
}

async function watch(db) {
  await runJob(db, "all");

  const intervals = [
    setInterval(() => jobs.live(db).catch(console.error), 60 * 1000),
    setInterval(() => jobs.upcoming(db).catch(console.error), 5 * 60 * 1000),
    setInterval(() => jobs.results(db).catch(console.error), 10 * 60 * 1000),
    setInterval(() => jobs.teams(db).catch(console.error), 6 * 60 * 60 * 1000),
    setInterval(() => jobs.events(db).catch(console.error), 6 * 60 * 60 * 1000),
    setInterval(() => jobs.rankings(db).catch(console.error), 6 * 60 * 60 * 1000),
  ];

  console.log("Local PandaScore sync is watching. Press Ctrl+C to stop.");
  process.on("SIGINT", () => {
    intervals.forEach(clearInterval);
    process.exit(0);
  });
}

async function main() {
  const db = initializeAdmin();
  const jobName = process.argv[2] || "all";

  if (jobName === "watch") {
    await watch(db);
    return;
  }

  await runJob(db, jobName);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
