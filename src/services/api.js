import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { toDate } from "../utils/formatDate";
import { isTopRankedMatch } from "../utils/rankedTeams";

function serializeDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function sortByStartTimeAsc(a, b) {
  return (toDate(a.startTime)?.getTime() || 0) - (toDate(b.startTime)?.getTime() || 0);
}

function sortByUpdatedDesc(a, b) {
  const aTime = a.endTime || a.startTime || a.updatedAt;
  const bTime = b.endTime || b.startTime || b.updatedAt;
  return (toDate(bTime)?.getTime() || 0) - (toDate(aTime)?.getTime() || 0);
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function getTopRankedTeamIds() {
  const snapshot = await getDocs(query(collection(db, "teams"), where("isTop50Team", "==", true)));
  return new Set(snapshot.docs.map((docSnapshot) => docSnapshot.id));
}

export async function getLiveMatches(max = 20) {
  const topRankedTeamIds = await getTopRankedTeamIds();
  const snapshot = await getDocs(query(collection(db, "matches"), where("status", "==", "live")));
  return snapshot.docs
    .map(serializeDoc)
    .filter((match) => isTopRankedMatch(match, topRankedTeamIds))
    .sort(sortByStartTimeAsc)
    .slice(0, max);
}

export async function getUpcomingMatches(max = 20) {
  const topRankedTeamIds = await getTopRankedTeamIds();
  const snapshot = await getDocs(query(collection(db, "matches"), where("status", "==", "upcoming")));
  return snapshot.docs
    .map(serializeDoc)
    .filter((match) => isTopRankedMatch(match, topRankedTeamIds))
    .sort(sortByStartTimeAsc)
    .slice(0, max);
}

export async function getRecentResults(max = 20) {
  const topRankedTeamIds = await getTopRankedTeamIds();
  const snapshot = await getDocs(query(collection(db, "matches"), where("status", "==", "finished")));
  return snapshot.docs
    .map(serializeDoc)
    .filter((match) => isTopRankedMatch(match, topRankedTeamIds))
    .sort(sortByUpdatedDesc)
    .slice(0, max);
}

export async function getMatches(status) {
  const topRankedTeamIds = await getTopRankedTeamIds();
  const constraints = [];

  if (status && status !== "all") {
    constraints.push(where("status", "==", status));
  }

  const snapshot = await getDocs(query(collection(db, "matches"), ...constraints));
  const matches = snapshot.docs.map(serializeDoc).filter((match) => isTopRankedMatch(match, topRankedTeamIds));

  if (status === "finished") {
    return matches.sort(sortByUpdatedDesc);
  }

  return matches.sort(sortByStartTimeAsc);
}

export async function getMatchById(id) {
  const snapshot = await getDoc(doc(db, "matches", id));
  return snapshot.exists() ? serializeDoc(snapshot) : null;
}

export async function getTeams() {
  const snapshot = await getDocs(query(collection(db, "teams"), orderBy("name", "asc")));
  return snapshot.docs.map(serializeDoc);
}

export async function getMatchesByTeam(teamId) {
  const topRankedTeamIds = await getTopRankedTeamIds();
  const snapshot = await getDocs(query(collection(db, "matches"), where("teamIds", "array-contains", teamId)));
  return snapshot.docs
    .map(serializeDoc)
    .filter((match) => isTopRankedMatch(match, topRankedTeamIds))
    .sort((a, b) => sortByStartTimeAsc(b, a));
}

export async function getFavoriteMatches(favoriteTeamIds = []) {
  if (!favoriteTeamIds.length) return [];

  const snapshots = await Promise.all(
    chunk(favoriteTeamIds, 10).map((teamIds) =>
      getDocs(query(collection(db, "matches"), where("teamIds", "array-contains-any", teamIds), limit(50))),
    ),
  );

  const deduped = new Map();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((docSnapshot) => {
      deduped.set(docSnapshot.id, serializeDoc(docSnapshot));
    });
  });

  return Array.from(deduped.values()).sort((a, b) => {
    if (a.status === "finished" && b.status !== "finished") return 1;
    if (a.status !== "finished" && b.status === "finished") return -1;
    return a.status === "finished" ? sortByUpdatedDesc(a, b) : sortByStartTimeAsc(a, b);
  });
}
