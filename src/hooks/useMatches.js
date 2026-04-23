import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { toDate } from "../utils/formatDate";
import { isTopRankedMatch } from "../utils/rankedTeams";

function serializeDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function sortMatches(matches, status) {
  return [...matches].sort((a, b) => {
    const finishedTimeA = a.endTime || a.startTime || a.updatedAt;
    const finishedTimeB = b.endTime || b.startTime || b.updatedAt;
    const aTime = toDate(status === "finished" ? finishedTimeA : a.startTime)?.getTime() || 0;
    const bTime = toDate(status === "finished" ? finishedTimeB : b.startTime)?.getTime() || 0;

    return status === "finished" ? bTime - aTime : aTime - bTime;
  });
}

export function useMatches(status = "all", maxResults) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryConstraints = useMemo(() => {
    const constraints = [];

    if (status && status !== "all") {
      constraints.push(where("status", "==", status));
    }

    if (maxResults && status === "all") {
      constraints.push(limit(maxResults));
    }

    return constraints;
  }, [maxResults, status]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    return onSnapshot(
      query(collection(db, "matches"), ...queryConstraints),
      (snapshot) => {
        const rankedMatches = snapshot.docs.map(serializeDoc).filter(isTopRankedMatch);
        const sortedMatches = sortMatches(rankedMatches, status);
        setMatches(maxResults ? sortedMatches.slice(0, maxResults) : sortedMatches);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );
  }, [maxResults, queryConstraints, status]);

  return { matches, loading, error };
}
