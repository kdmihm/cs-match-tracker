function isCanonicalTeamId(teamId) {
  return typeof teamId === "string" && teamId.startsWith("team_");
}

function getCanonicalTeamId(team) {
  if (!team) return null;

  if (typeof team === "string") {
    return team;
  }

  const externalId = String(team.externalId ?? "").trim();
  if (externalId) {
    return isCanonicalTeamId(externalId) ? externalId : `team_${externalId}`;
  }

  return team.id || null;
}

module.exports = {
  getCanonicalTeamId,
  isCanonicalTeamId,
};
