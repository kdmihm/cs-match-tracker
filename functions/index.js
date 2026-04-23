const admin = require("firebase-admin");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { TOP_RANKED_TEAMS, normalizeTeamName } = require("./rankedTeams");
const { getCanonicalTeamId, isCanonicalTeamId } = require("./teamIdentity");

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

async function fetchPandascorePages(path, params = {}, maxPages = 5) {
  const results = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const pageResults = await fetchPandascore(path, { ...params, page });
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
  const rawTeam1Score = game.results?.[0]?.score ?? game.team1_score ?? game.team1Score ?? null;
  const rawTeam2Score = game.results?.[1]?.score ?? game.team2_score ?? game.team2Score ?? null;

  return {
    name: game.map?.name || game.name || `Map ${index + 1}`,
    position: Number(game.position ?? index + 1),
    team1Score: rawTeam1Score === null ? null : Number(rawTeam1Score),
    team2Score: rawTeam2Score === null ? null : Number(rawTeam2Score),
    hasScore: rawTeam1Score !== null && rawTeam2Score !== null,
    status: normalizeStatus(game.status || "upcoming"),
    winnerId: game.winner?.id ? `team_${game.winner.id}` : game.winner_id ? `team_${game.winner_id}` : null,
    complete: Boolean(game.complete),
    finished: Boolean(game.finished),
    forfeit: Boolean(game.forfeit),
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function indexTeamByNames(index, team, names = []) {
  names
    .filter(Boolean)
    .forEach((name) => {
      const key = normalizeTeamName(name);
      if (!key) return;

      const candidates = index.get(key) || [];
      if (!candidates.some((candidate) => candidate.id === team.id)) {
        candidates.push(team);
        index.set(key, candidates);
      }
    });
}

function getTeamsByNames(index, names = []) {
  const seenIds = new Set();
  const candidates = [];

  names
    .filter(Boolean)
    .forEach((name) => {
      const key = normalizeTeamName(name);
      if (!key) return;

      (index.get(key) || []).forEach((team) => {
        if (seenIds.has(team.id)) return;
        seenIds.add(team.id);
        candidates.push(team);
      });
    });

  return candidates;
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
  const teamTotal = await upsertTeamsFromMatches(normalizedMatches);
  logger.info(`Synced ${total} matches from ${path} and ${teamTotal} matched teams.`);
  return total;
}

async function syncRecentResults() {
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
  const total = await commitInBatches("matches", normalizedMatches);
  const teamTotal = await upsertTeamsFromMatches(normalizedMatches);
  logger.info(`Synced ${total} recent result matches and ${teamTotal} matched teams.`);
  return total;
}

async function syncCollection(path, collectionName, normalizer, params = {}) {
  const apiDocuments = await fetchPandascore(path, params);
  const normalizedDocuments = apiDocuments.map(normalizer);
  const total = await commitInBatches(collectionName, normalizedDocuments);
  logger.info(`Synced ${total} ${collectionName} from ${path}.`);
  return total;
}

async function upsertTeamsFromMatches(matches) {
  const teamsById = new Map();

  matches.forEach((match) => {
    [match.team1, match.team2].forEach((team) => {
      if (!team?.id) return;

      teamsById.set(team.id, {
        id: team.id,
        name: team.name || "Unknown team",
        logoUrl: team.logoUrl || FALLBACK_LOGO,
        region: "Unknown",
        source: "pandascore_match",
        activeInSyncedMatches: true,
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenInMatchAt: FieldValue.serverTimestamp(),
      });
    });
  });

  return commitInBatches("teams", Array.from(teamsById.values()));
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

async function migrateFavoriteTeamIds(favoriteIdMigrations) {
  if (!favoriteIdMigrations.size) {
    return 0;
  }

  const snapshot = await db.collection("users").get();
  const userUpdates = [];

  snapshot.docs.forEach((docSnapshot) => {
    const favoriteTeamIds = Array.isArray(docSnapshot.data().favoriteTeamIds) ? docSnapshot.data().favoriteTeamIds : [];
    let changed = false;
    const seenIds = new Set();
    const nextFavoriteTeamIds = [];

    favoriteTeamIds.forEach((teamId) => {
      const nextTeamId = favoriteIdMigrations.get(teamId) || teamId;
      if (nextTeamId !== teamId) {
        changed = true;
      }

      if (!nextTeamId || seenIds.has(nextTeamId)) {
        return;
      }

      seenIds.add(nextTeamId);
      nextFavoriteTeamIds.push(nextTeamId);
    });

    if (!changed) {
      return;
    }

    userUpdates.push({
      id: docSnapshot.id,
      favoriteTeamIds: nextFavoriteTeamIds,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  if (!userUpdates.length) {
    return 0;
  }

  await commitInBatches("users", userUpdates);
  return userUpdates.length;
}

async function syncRankedTeams() {
  const snapshot = await db.collection("teams").get();
  const existingTeamsByName = new Map();
  const existingTeamsByExternalId = new Map();
  const previousRankedDocuments = [];

  snapshot.docs.forEach((docSnapshot) => {
    const team = { id: docSnapshot.id, ...docSnapshot.data() };
    if (team.isRankedTeam || team.isTop50Team) {
      previousRankedDocuments.push({
        id: docSnapshot.id,
        isRankedTeam: false,
        isTop50Team: false,
        previousRankedAt: FieldValue.serverTimestamp(),
      });
    }

    const externalId = String(team.externalId ?? "").trim();
    if (externalId) {
      existingTeamsByExternalId.set(externalId, team);
    }

    indexTeamByNames(existingTeamsByName, team, [
      team.name,
      team.slug,
      team.rankingName,
      ...(team.rankingAliases || []),
    ]);
  });

  if (previousRankedDocuments.length) {
    await commitInBatches("teams", previousRankedDocuments);
  }

  const rankedDocuments = [];
  const favoriteIdMigrations = new Map();

  for (const rankedTeam of TOP_RANKED_TEAMS) {
    const candidates = [rankedTeam.name, ...rankedTeam.aliases];
    const existingCandidates = getTeamsByNames(existingTeamsByName, candidates);
    const apiTeam = await findPandascoreTeam(candidates);
    const apiTeamId = String(apiTeam?.id ?? "").trim();
    const canonicalExistingTeam =
      (apiTeamId ? existingTeamsByExternalId.get(apiTeamId) : null) ||
      existingCandidates.find((team) => String(team.externalId ?? "").trim()) ||
      existingCandidates.find((team) => isCanonicalTeamId(team.id)) ||
      existingCandidates[0] ||
      null;
    const externalId = apiTeam?.id || canonicalExistingTeam?.externalId || null;
    const id = externalId ? `team_${externalId}` : getCanonicalTeamId(canonicalExistingTeam) || `ranked_${slugify(rankedTeam.name)}`;

    const rankedDocument = {
      id,
      externalId,
      name: apiTeam?.name || canonicalExistingTeam?.name || rankedTeam.name,
      slug: apiTeam?.slug || canonicalExistingTeam?.slug || slugify(rankedTeam.name),
      logoUrl: apiTeam?.image_url || canonicalExistingTeam?.logoUrl || FALLBACK_LOGO,
      region: apiTeam?.location || canonicalExistingTeam?.region || "Unknown",
      source: apiTeam ? "pandascore_ranked_lookup" : canonicalExistingTeam?.source || "hltv_ranking",
      isRankedTeam: true,
      isTop50Team: true,
      hltvRank: rankedTeam.rank,
      hltvPoints: rankedTeam.points,
      rankingName: rankedTeam.name,
      rankingAliases: rankedTeam.aliases,
      rankingSource: "hltv",
      rankingSyncedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    rankedDocuments.push(rankedDocument);

    if (externalId) {
      existingTeamsByExternalId.set(String(externalId), rankedDocument);
    }

    indexTeamByNames(existingTeamsByName, rankedDocument, [
      rankedDocument.name,
      rankedDocument.slug,
      rankedDocument.rankingName,
      ...(rankedDocument.rankingAliases || []),
    ]);

    existingCandidates
      .filter((team) => team.id !== id)
      .forEach((team) => favoriteIdMigrations.set(team.id, id));
  }

  const total = await commitInBatches("teams", rankedDocuments);
  const migratedUsers = await migrateFavoriteTeamIds(favoriteIdMigrations);
  logger.info(`Synced ${total} ranked teams and repaired ${migratedUsers} user favorite lists.`);
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
  () => syncRecentResults(),
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

exports.syncRankedTeams = onSchedule(
  {
    ...scheduleOptions,
    schedule: "every 6 hours",
  },
  () => syncRankedTeams(),
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
