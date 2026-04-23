const admin = require("firebase-admin");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const pandascoreToken = defineSecret("PANDASCORE_TOKEN");
const PANDASCORE_BASE_URL = "https://api.pandascore.co";
const FALLBACK_LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='24' fill='%23182730'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' fill='%23f5c85f' font-family='Arial' font-size='26' font-weight='700'%3ECS%3C/text%3E%3C/svg%3E";

function getToken() {
  const token = pandascoreToken.value() || process.env.PANDASCORE_TOKEN;

  if (!token) {
    throw new Error("Missing PANDASCORE_TOKEN secret.");
  }

  return token;
}

async function fetchPandascore(path, params = {}) {
  const url = new URL(`${PANDASCORE_BASE_URL}${path}`);
  Object.entries({
    per_page: 100,
    ...params,
  }).forEach(([key, value]) => {
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
    throw new Error(`PandaScore ${response.status} for ${path}: ${body}`);
  }

  return response.json();
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
    lastSyncedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
    updatedAt: FieldValue.serverTimestamp(),
  };
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
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function commitInBatches(collectionName, documents) {
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

async function syncMatches(path, params = {}) {
  const apiMatches = await fetchPandascore(path, params);
  const normalizedMatches = apiMatches.map(normalizeMatch);
  const total = await commitInBatches("matches", normalizedMatches);
  logger.info(`Synced ${total} matches from ${path}.`);
  return total;
}

async function syncCollection(path, collectionName, normalizer, params = {}) {
  const apiDocuments = await fetchPandascore(path, params);
  const normalizedDocuments = apiDocuments.map(normalizer);
  const total = await commitInBatches(collectionName, normalizedDocuments);
  logger.info(`Synced ${total} ${collectionName} from ${path}.`);
  return total;
}

const scheduleOptions = {
  secrets: [pandascoreToken],
  timeoutSeconds: 540,
  memory: "512MiB",
  region: "us-central1",
};

exports.syncLiveMatches = onSchedule(
  {
    ...scheduleOptions,
    schedule: "every 1 minutes",
  },
  () => syncMatches("/csgo/matches/running"),
);

exports.syncUpcomingMatches = onSchedule(
  {
    ...scheduleOptions,
    schedule: "every 5 minutes",
  },
  () => syncMatches("/csgo/matches/upcoming", { sort: "begin_at" }),
);

exports.syncRecentResults = onSchedule(
  {
    ...scheduleOptions,
    schedule: "every 10 minutes",
  },
  () => syncMatches("/csgo/matches/past", { sort: "-end_at" }),
);

exports.syncTeams = onSchedule(
  {
    ...scheduleOptions,
    schedule: "every 6 hours",
  },
  () => syncCollection("/csgo/teams", "teams", normalizeTeamDocument),
);

exports.syncEvents = onSchedule(
  {
    ...scheduleOptions,
    schedule: "every 6 hours",
  },
  () => syncCollection("/csgo/tournaments", "events", normalizeEventDocument, { sort: "-begin_at" }),
);

exports.getMatchDetail = onRequest(
  {
    secrets: [pandascoreToken],
    region: "us-central1",
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const matchId = request.query.id;
    if (!matchId) {
      response.status(400).json({ error: "Missing id query parameter" });
      return;
    }

    try {
      const externalId = String(matchId).replace("match_", "");
      const apiMatch = await fetchPandascore(`/csgo/matches/${externalId}`);
      const normalizedMatch = normalizeMatch(apiMatch);

      await db.collection("matches").doc(normalizedMatch.id).set(normalizedMatch, { merge: true });
      response.json(normalizedMatch);
    } catch (error) {
      logger.error("Failed to fetch match detail", error);
      response.status(500).json({ error: "Failed to fetch match detail" });
    }
  },
);
