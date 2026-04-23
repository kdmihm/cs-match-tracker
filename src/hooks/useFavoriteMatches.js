import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { toDate } from "../utils/formatDate";
import { useFavorites } from "./useFavorites";

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function sortFavoriteMatches(a, b) {
  if (a.status === "live" && b.status !== "live") return -1;
  if (a.status !== "live" && b.status === "live") return 1;
  if (a.status === "finished" && b.status !== "finished") return 1;
  if (a.status !== "finished" && b.status === "finished") return -1;

  const aTime = toDate(a.status === "finished" ? a.updatedAt : a.startTime)?.getTime() || 0;
  const bTime = toDate(b.status === "finished" ? b.updatedAt : b.startTime)?.getTime() || 0;

  return a.status === "finished" ? bTime - aTime : aTime - bTime;
}

export function useFavoriteMatches() {
  const { favoriteTeamIds, loading: favoritesLoading } = useFavorites();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const teamIdChunks = useMemo(() => chunk(favoriteTeamIds, 10), [favoriteTeamIds]);

  useEffect(() => {
    if (!teamIdChunks.length) {
      setMatches([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const matchMap = new Map();
    const unsubscribes = teamIdChunks.map((teamIds) =>
      onSnapshot(
        query(collection(db, "matches"), where("teamIds", "array-contains-any", teamIds), limit(50)),
        (snapshot) => {
          snapshot.docs.forEach((docSnapshot) => {
            matchMap.set(docSnapshot.id, { id: docSnapshot.id, ...docSnapshot.data() });
          });
          setMatches(Array.from(matchMap.values()).sort(sortFavoriteMatches));
          setLoading(false);
        },
        (snapshotError) => {
          setError(snapshotError);
          setLoading(false);
        },
      ),
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [teamIdChunks]);

  return { matches, loading: loading || favoritesLoading, error };
}
