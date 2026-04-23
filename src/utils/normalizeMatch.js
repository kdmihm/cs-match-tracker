const FALLBACK_LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='24' fill='%23182730'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' fill='%23f5c85f' font-family='Arial' font-size='26' font-weight='700'%3ECS%3C/text%3E%3C/svg%3E";

function normalizeStatus(status) {
  const value = String(status || "upcoming").toLowerCase();
  if (["running", "in_progress", "live"].includes(value)) return "live";
  if (["finished", "completed", "closed"].includes(value)) return "finished";
  if (["cancelled", "canceled", "postponed"].includes(value)) return "cancelled";
  return "upcoming";
}

function normalizeTeam(team, fallbackName) {
  if (!team) {
    return {
      id: null,
      name: fallbackName,
      logoUrl: FALLBACK_LOGO,
    };
  }

  const id = team.id ? `team_${team.id}` : team.uid || team.slug || null;

  return {
    id,
    name: team.name || fallbackName,
    logoUrl: team.image_url || team.logoUrl || team.logo || FALLBACK_LOGO,
  };
}

function pickOpponent(apiMatch, index) {
  return apiMatch.opponents?.[index]?.opponent || apiMatch.teams?.[index] || null;
}

function normalizeScore(apiMatch, status) {
  const results = apiMatch.results || [];
  const team1Score = results[0]?.score ?? apiMatch.score?.team1 ?? 0;
  const team2Score = results[1]?.score ?? apiMatch.score?.team2 ?? 0;

  if (status === "upcoming") {
    return { team1: 0, team2: 0 };
  }

  return {
    team1: Number(team1Score || 0),
    team2: Number(team2Score || 0),
  };
}

function normalizeMaps(apiMatch) {
  const games = apiMatch.games || apiMatch.maps || [];

  return games.map((game, index) => ({
    name: game.map?.name || game.name || `Map ${index + 1}`,
    team1Score: Number(game.results?.[0]?.score ?? game.team1Score ?? 0),
    team2Score: Number(game.results?.[1]?.score ?? game.team2Score ?? 0),
    status: normalizeStatus(game.status || game.winner_type || "upcoming"),
  }));
}

export function normalizeMatch(apiMatch) {
  const status = normalizeStatus(apiMatch.status);
  const team1 = normalizeTeam(pickOpponent(apiMatch, 0), "TBD");
  const team2 = normalizeTeam(pickOpponent(apiMatch, 1), "TBD");
  const event = apiMatch.league || apiMatch.serie || apiMatch.tournament || {};
  const eventName =
    apiMatch.tournament?.name ||
    apiMatch.serie?.full_name ||
    apiMatch.serie?.name ||
    apiMatch.league?.name ||
    "Unknown event";

  return {
    id: apiMatch.id ? `match_${apiMatch.id}` : apiMatch.id,
    externalId: apiMatch.id ?? null,
    status,
    format: apiMatch.number_of_games ? `bo${apiMatch.number_of_games}` : apiMatch.format || "bo3",
    startTime: apiMatch.begin_at || apiMatch.scheduled_at || apiMatch.startTime || null,
    eventId: event.id ? `event_${event.id}` : null,
    eventName,
    team1,
    team2,
    teamIds: [team1.id, team2.id].filter(Boolean),
    score: normalizeScore(apiMatch, status),
    maps: normalizeMaps(apiMatch),
    winnerId: apiMatch.winner_id ? `team_${apiMatch.winner_id}` : apiMatch.winnerId || null,
    source: apiMatch.source || "pandascore",
    lastSyncedAt: apiMatch.lastSyncedAt || new Date().toISOString(),
  };
}
