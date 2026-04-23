import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

export function useMatch(matchId) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(Boolean(matchId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!matchId) {
      setMatch(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    return onSnapshot(
      doc(db, "matches", matchId),
      (snapshot) => {
        setMatch(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );
  }, [matchId]);

  return { match, loading, error };
}
