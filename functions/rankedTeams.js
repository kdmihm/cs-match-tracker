const TOP_RANKED_TEAMS = [
  { rank: 1, name: "Vitality", points: 1000, aliases: ["Team Vitality"] },
  { rank: 2, name: "Natus Vincere", points: 508, aliases: ["NAVI", "NaVi", "Natus Vincere"] },
  { rank: 3, name: "FURIA", points: 472, aliases: ["FURIA Esports"] },
  { rank: 4, name: "PARIVISION", points: 460, aliases: ["Parivision"] },
  { rank: 5, name: "Falcons", points: 430, aliases: ["Team Falcons"] },
  { rank: 6, name: "Aurora", points: 429, aliases: ["Aurora Gaming"] },
  { rank: 7, name: "The MongolZ", points: 388, aliases: ["MongolZ"] },
  { rank: 8, name: "MOUZ", points: 357, aliases: ["mousesports"] },
  { rank: 9, name: "Spirit", points: 307, aliases: ["Team Spirit"] },
  { rank: 10, name: "Astralis", points: 294, aliases: [] },
  { rank: 11, name: "FUT", points: 272, aliases: ["FUT Esports"] },
  { rank: 12, name: "G2", points: 199, aliases: ["G2 Esports"] },
  { rank: 13, name: "3DMAX", points: 150, aliases: [] },
  { rank: 14, name: "FaZe", points: 132, aliases: ["FaZe Clan"] },
  { rank: 15, name: "Legacy", points: 126, aliases: ["Legacy Esports"] },
  { rank: 16, name: "9z", points: 113, aliases: ["9z Team"] },
  { rank: 17, name: "B8", points: 105, aliases: [] },
  { rank: 18, name: "HEROIC", points: 97, aliases: ["Heroic"] },
  { rank: 19, name: "BetBoom", points: 85, aliases: ["BetBoom Team"] },
  { rank: 20, name: "TYLOO", points: 85, aliases: [] },
  { rank: 21, name: "Monte", points: 85, aliases: [] },
  { rank: 22, name: "GamerLegion", points: 85, aliases: ["Gamer Legion"] },
  { rank: 23, name: "M80", points: 82, aliases: [] },
  { rank: 24, name: "Alliance", points: 81, aliases: [] },
  { rank: 25, name: "Liquid", points: 80, aliases: ["Team Liquid"] },
  { rank: 26, name: "MIBR", points: 68, aliases: [] },
  { rank: 27, name: "paiN", points: 67, aliases: ["paiN Gaming", "Pain"] },
  { rank: 28, name: "BIG", points: 59, aliases: [] },
  { rank: 29, name: "Ninjas in Pyjamas", points: 59, aliases: ["NIP", "NiP"] },
  { rank: 30, name: "EYEBALLERS", points: 59, aliases: ["Eyeballers"] },
  { rank: 31, name: "FOKUS", points: 58, aliases: [] },
  { rank: 32, name: "SINNERS", points: 56, aliases: ["SINNERS Esports"] },
  { rank: 33, name: "NRG", points: 55, aliases: ["NRG Esports"] },
  { rank: 34, name: "Gentle Mates", points: 53, aliases: [] },
  { rank: 35, name: "Passion UA", points: 48, aliases: [] },
  { rank: 36, name: "BESTIA", points: 45, aliases: [] },
  { rank: 37, name: "HOTU", points: 44, aliases: [] },
  { rank: 38, name: "Inner Circle", points: 40, aliases: [] },
  { rank: 39, name: "100 Thieves", points: 40, aliases: ["100T"] },
  { rank: 40, name: "BC.Game", points: 38, aliases: ["BC Game", "BC.Game Esports"] },
  { rank: 41, name: "Gaimin Gladiators", points: 37, aliases: [] },
  { rank: 42, name: "fnatic", points: 37, aliases: ["Fnatic"] },
  { rank: 43, name: "Sashi", points: 36, aliases: ["Sashi Esport", "Sashi Esports"] },
  { rank: 44, name: "9INE", points: 35, aliases: [] },
  { rank: 45, name: "Voca", points: 33, aliases: [] },
  { rank: 46, name: "Nemesis", points: 31, aliases: [] },
  { rank: 47, name: "K27", points: 31, aliases: [] },
  { rank: 48, name: "Sharks", points: 30, aliases: ["Sharks Esports"] },
  { rank: 49, name: "Lynn Vision", points: 30, aliases: ["Lynn Vision Gaming"] },
  { rank: 50, name: "Betclic", points: 30, aliases: ["Betclic Apogee"] },
];

function normalizeTeamName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/^team\s+/, "")
    .replace(/\s+(esports|gaming|clan|team)$/, "")
    .replace(/[^a-z0-9]+/g, "");
}

module.exports = {
  TOP_RANKED_TEAMS,
  normalizeTeamName,
};
