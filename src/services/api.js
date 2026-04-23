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
  return (toDate(b.updatedAt)?.getTime() || 0) - (toDate(a.updatedAt)?.getTime() || 0);
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function getLiveMatches(max = 20) {
  const snapshot = await getDocs(
    query(collection(db, "matches"), where("status", "==", "live"), orderBy("startTime", "asc"), limit(max)),
  );
  return snapshot.docs.map(serializeDoc);
}

export async function getUpcomingMatches(max = 20) {
  const snapshot = await getDocs(
    query(collection(db, "matches"), where("status", "==", "upcoming"), orderBy("startTime", "asc"), limit(max)),
  );
  return snapshot.docs.map(serializeDoc);
}

export async function getRecentResults(max = 20) {
  const snapshot = await getDocs(
    query(collection(db, "matches"), where("status", "==", "finished"), orderBy("updatedAt", "desc"), limit(max)),
  );
  return snapshot.docs.map(serializeDoc);
}

export async function getMatches(status) {
  const constraints = [];

  if (status && status !== "all") {
    constraints.push(where("status", "==", status));
  }

  constraints.push(orderBy(status === "finished" ? "updatedAt" : "startTime", status === "finished" ? "desc" : "asc"));

  const snapshot = await getDocs(query(collection(db, "matches"), ...constraints));
  return snapshot.docs.map(serializeDoc);
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
  const snapshot = await getDocs(
    query(collection(db, "matches"), where("teamIds", "array-contains", teamId), orderBy("startTime", "desc")),
  );
  return snapshot.docs.map(serializeDoc);
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
