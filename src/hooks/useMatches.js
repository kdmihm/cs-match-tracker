import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";

function serializeDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
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

    constraints.push(orderBy(status === "finished" ? "updatedAt" : "startTime", status === "finished" ? "desc" : "asc"));

    if (maxResults) {
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
        setMatches(snapshot.docs.map(serializeDoc));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );
  }, [queryConstraints]);

  return { matches, loading, error };
}
